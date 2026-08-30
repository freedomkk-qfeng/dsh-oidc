const modalities = new Set(['text', 'image'])
export const ENTERPRISE_SETTINGS_NAMESPACE = 'provider-enterprise'
export const ENTERPRISE_DEFAULT_MAX_REQUEST_IMAGE_BYTES = 20 * 1024 * 1024
export const ENTERPRISE_DEFAULT_REQUEST_IMAGE_PIXEL_BUDGET = 2048 * 2048
export const ENTERPRISE_DEFAULT_REQUEST_IMAGE_MAX_BYTES = 1024 * 1024
export const ENTERPRISE_DEFAULT_RETRY_POLICY = Object.freeze({ mode: 'normal', maxRetries: 2 })

function nonEmpty(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`${label} must be a non-empty string`)
  return value.trim()
}

function exactDevelopmentOrigin(value, label) {
  if (value === undefined) return undefined
  const raw = nonEmpty(value, label).replace(/\/+$/, '')
  const parsed = new URL(raw)
  if (parsed.protocol !== 'http:' || parsed.username || parsed.password || parsed.hash || parsed.search || (parsed.pathname !== '/' && parsed.pathname !== '')) {
    throw new Error(`${label} must be an exact HTTP origin`)
  }
  return raw
}

function endpointURL(value, label, allowInsecureDevelopment = false, insecureDevelopmentOrigin) {
  const raw = nonEmpty(value, label).replace(/\/+$/, '')
  const parsed = new URL(raw)
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)
  const allowedOrigin = exactDevelopmentOrigin(insecureDevelopmentOrigin, `${label}.insecureDevelopmentOrigin`)
  const permittedHTTP = parsed.protocol === 'http:' && (loopback || (allowInsecureDevelopment === true && parsed.origin === allowedOrigin))
  if ((parsed.protocol !== 'https:' && !permittedHTTP) || parsed.username || parsed.password || parsed.hash || parsed.search) {
    throw new Error(`${label} must be HTTPS or explicitly allowed development HTTP without credentials, query, or fragment`)
  }
  return raw
}

function positiveInteger(value, fallback, label) {
  const resolved = value ?? fallback
  if (!Number.isSafeInteger(resolved) || resolved <= 0) throw new Error(`${label} must be a positive integer`)
  return resolved
}

function normalizeInput(value, label) {
  const input = value ?? ['text']
  if (!Array.isArray(input) || input.length === 0 || input.some(item => !modalities.has(item))) {
    throw new Error(`${label} must contain text and/or image`)
  }
  return [...new Set(input)]
}

function normalizeThinkingMap(value, reasoning) {
  if (value === false || reasoning === false) return { off: null }
  const source = value ?? { off: null, high: 'high', max: 'max' }
  if (typeof source !== 'object' || source === null || Array.isArray(source)) throw new Error('reasoningEfforts must be an object or false')
  return Object.fromEntries(Object.entries(source).map(([key, level]) => [key, level ?? null]))
}

export function resolveEnterpriseProfiles(raw = {}) {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('enterprise provider config must be an object')
  const providers = raw.providers ?? {}
  if (typeof providers !== 'object' || providers === null || Array.isArray(providers)) throw new Error('enterprise provider config.providers must be an object')

  return Object.entries(providers).map(([provider, source]) => {
    const route = nonEmpty(provider, 'provider route')
    if (typeof source !== 'object' || source === null || Array.isArray(source)) throw new Error(`${route} config must be an object`)
    const displayName = nonEmpty(source.displayName ?? route, `${route}.displayName`)
    const baseURL = endpointURL(source.baseURL, `${route}.baseURL`, source.allowInsecureDevelopment, source.insecureDevelopmentOrigin)
    const credentialRef = nonEmpty(source.apiKeyEnv, `${route}.apiKeyEnv`)
    const contextWindow = positiveInteger(source.defaultContextWindow, 262144, `${route}.defaultContextWindow`)
    const maxTokens = positiveInteger(source.defaultMaxTokens, 32768, `${route}.defaultMaxTokens`)
    const maxRequestImageBytes = positiveInteger(source.maxRequestImageBytes, ENTERPRISE_DEFAULT_MAX_REQUEST_IMAGE_BYTES, `${route}.maxRequestImageBytes`)
    const requestImagePixelBudget = positiveInteger(source.requestImagePixelBudget, ENTERPRISE_DEFAULT_REQUEST_IMAGE_PIXEL_BUDGET, `${route}.requestImagePixelBudget`)
    const requestImageMaxBytes = positiveInteger(source.requestImageMaxBytes, ENTERPRISE_DEFAULT_REQUEST_IMAGE_MAX_BYTES, `${route}.requestImageMaxBytes`)
    if (!Array.isArray(source.models) || source.models.length === 0) throw new Error(`${route}.models must not be empty`)

    const ids = new Set()
    const models = source.models.map((model, index) => {
      if (typeof model !== 'object' || model === null || Array.isArray(model)) throw new Error(`${route}.models[${index}] must be an object`)
      const id = nonEmpty(model.id, `${route}.models[${index}].id`)
      if (ids.has(id)) throw new Error(`${route} declares duplicate model ${id}`)
      ids.add(id)
      const reasoning = model.reasoning !== false && model.reasoningEfforts !== false
      return {
        id,
        name: nonEmpty(model.name ?? id, `${route}.${id}.name`),
        api: 'openai-completions',
        provider: route,
        baseUrl: baseURL,
        reasoning,
        thinkingLevelMap: normalizeThinkingMap(model.reasoningEfforts, reasoning),
        input: normalizeInput(model.input, `${route}.${id}.input`),
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: positiveInteger(model.contextWindow, contextWindow, `${route}.${id}.contextWindow`),
        maxTokens: positiveInteger(model.maxTokens, maxTokens, `${route}.${id}.maxTokens`),
        compat: {
          supportsDeveloperRole: false,
          supportsStore: false,
          supportsReasoningEffort: reasoning,
          supportsUsageInStreaming: true,
          maxTokensField: 'max_tokens',
          supportsStrictMode: false,
          supportsLongCacheRetention: false,
          thinkingFormat: 'deepseek',
          requiresReasoningContentOnAssistantMessages: true,
          ...(source.compat ?? {}),
          ...(model.compat ?? {}),
        },
      }
    })

    return {
      provider: route,
      displayName,
      baseURL,
      credentialRef,
      reasoning: source.reasoning ?? 'high',
      maxRequestImageBytes,
      requestImagePixelBudget,
      requestImageMaxBytes,
      streamIdleTimeoutMs: positiveInteger(source.streamIdleTimeoutMs, 300000, `${route}.streamIdleTimeoutMs`),
      retryPolicy: source.retryPolicy ?? ENTERPRISE_DEFAULT_RETRY_POLICY,
      configuredMaxTokens: new Map(models.map(model => [model.id, model.maxTokens])),
      models,
    }
  })
}

export function configurableEntries(profiles) {
  return [...profiles.values()].map(profile => ({
    provider: profile.provider,
    displayName: profile.displayName,
    settingsNs: ENTERPRISE_SETTINGS_NAMESPACE,
    settingsPath: ['providers', profile.provider],
    declared: true,
  }))
}

export function settingsBase(rawConfig) {
  return { providers: rawConfig.providers ?? {} }
}
