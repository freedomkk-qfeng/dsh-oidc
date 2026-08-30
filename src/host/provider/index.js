import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment'
import { LlmError, assertUsableApiKey, resolveRetryPolicy } from '@deepseek-ai/dsh-llm'
import { Config as PiAiConfig, PiAiAdapter } from '@deepseek-ai/dsh-llm-pi-ai'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
import { createProvider } from '@earendil-works/pi-ai'
import { openAICompletionsApi } from '@earendil-works/pi-ai/api/openai-completions.lazy'
import {
  configurableEntries, ENTERPRISE_DEFAULT_MAX_REQUEST_IMAGE_BYTES, ENTERPRISE_DEFAULT_REQUEST_IMAGE_MAX_BYTES,
  ENTERPRISE_DEFAULT_REQUEST_IMAGE_PIXEL_BUDGET, ENTERPRISE_DEFAULT_RETRY_POLICY, ENTERPRISE_SETTINGS_NAMESPACE,
  resolveEnterpriseProfiles, settingsBase,
} from './core.js'
import { TransformingEnterpriseAdapter } from './transform-adapter.js'
import { EnterpriseModelTransforms } from './transforms.js'

export const name = 'dsh-oidc-provider'
export const inject = ['llm']
export const SETTINGS_NAMESPACE = settingsNamespace(ENTERPRISE_SETTINGS_NAMESPACE)

function apiKeyAuth(displayName) {
  return {
    name: displayName,
    resolve: ({ credential }) => Promise.resolve({
      auth: credential?.key === undefined ? {} : { apiKey: credential.key },
      source: displayName,
    }),
  }
}

function profilesFrom(rawConfig) {
  const profiles = new Map()
  for (const route of resolveEnterpriseProfiles(rawConfig)) {
    profiles.set(route.provider, {
      provider: route.provider,
      displayName: route.displayName,
      apiKeyEnv: route.credentialRef,
      reasoning: route.reasoning,
      maxRequestImageBytes: route.maxRequestImageBytes,
      requestImagePixelBudget: route.requestImagePixelBudget,
      requestImageMaxBytes: route.requestImageMaxBytes,
      streamIdleTimeoutMs: route.streamIdleTimeoutMs,
      retryPolicy: resolveRetryPolicy(route.retryPolicy, `${name}: ${route.provider}.retryPolicy`),
      configuredMaxTokens: route.configuredMaxTokens,
      modelPolicies: new Map(route.models.map(model => [model.id, {
        reasoning: model.reasoning,
        supportsReasoningEffort: model.compat.supportsReasoningEffort,
      }])),
      piProvider: createProvider({
        id: route.provider,
        name: route.displayName,
        baseUrl: route.baseURL,
        auth: { apiKey: apiKeyAuth(route.displayName) },
        models: route.models,
        api: openAICompletionsApi(),
      }),
    })
  }
  return profiles
}

function isolatedPiAiAuth() {
  const stored = new Map()
  return {
    credentials: {
      read: id => Promise.resolve(stored.get(id)),
      list: () => Promise.resolve([]),
      async modify(id, mutate) {
        const next = await mutate(stored.get(id))
        if (next === undefined) stored.delete(id)
        else stored.set(id, next)
        return next
      },
      delete: id => { stored.delete(id); return Promise.resolve() },
    },
    authContext: {
      env: () => Promise.resolve(undefined),
      fileExists: () => Promise.resolve(false),
    },
  }
}

export function apply(ctx, rawConfig = {}) {
  const transforms = new EnterpriseModelTransforms(ctx)
  let current = () => settingsBase(rawConfig)
  let profiles = profilesFrom(current())
  if (profiles.size === 0) return

  const baseAdapter = new PiAiAdapter({
    profiles: () => profiles,
    auth: isolatedPiAiAuth(),
    resolveApiKey: async (provider, profile) => {
      const ref = profile.apiKeyEnv
      const credentials = ctx.get('credentials')
      const hit = credentials === undefined
        ? launchEnvironmentOf(ctx).get(ref)?.value
        : (await credentials.resolve(ref))?.value
      if (typeof hit === 'string' && hit.length > 0) return assertUsableApiKey(hit, name, ref)
      throw new LlmError(`${name}: no credential for provider route "${provider}" (${ref})`, 'MISSING_CREDENTIAL')
    },
    resolveAttachments: () => ctx.get('attachments'),
  })

  const adapter = new TransformingEnterpriseAdapter(baseAdapter, transforms, (provider, model) => (
    profiles.get(provider)?.modelPolicies.get(model) ?? { reasoning: true, supportsReasoningEffort: true }
  ))
  const registration = ctx.llm.registerAdapter([...profiles.keys()], adapter)
  let directory = ctx.llm.registerConfigurableProviders(configurableEntries(profiles))

  if (rawConfig.settingsEnabled !== true) {
    installSettingsSection(ctx, SETTINGS_NAMESPACE, PiAiConfig, settingsBase(rawConfig), { setSource() {}, onChange() {} })
    return
  }

  const refresh = () => {
    const next = profilesFrom(current())
    const previous = profiles
    profiles = next
    try {
      registration.replace([...next.keys()])
      directory.replace(configurableEntries(next))
    } catch (error) {
      profiles = previous
      throw error
    }
  }

  installSettingsSection(ctx, SETTINGS_NAMESPACE, PiAiConfig, settingsBase(rawConfig), {
    setSource(source) { current = source },
    onChange() {
      try { refresh() }
      catch (error) {
        ctx.logger.error('dsh-oidc-provider: keeping previous routes after a refused settings update')
        ctx.logger.error(error)
      }
    },
  })
}

export { resolveEnterpriseProfiles } from './core.js'
export { TransformingEnterpriseAdapter } from './transform-adapter.js'
export { EnterpriseModelTransforms } from './transforms.js'
export {
  configurableEntries, ENTERPRISE_DEFAULT_MAX_REQUEST_IMAGE_BYTES, ENTERPRISE_DEFAULT_REQUEST_IMAGE_MAX_BYTES,
  ENTERPRISE_DEFAULT_REQUEST_IMAGE_PIXEL_BUDGET, ENTERPRISE_DEFAULT_RETRY_POLICY,
  ENTERPRISE_SETTINGS_NAMESPACE, settingsBase,
}
