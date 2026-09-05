import { readFileSync } from 'node:fs'

export const PROFILE_SCHEMA_VERSION = 'dsh-oidc/v1alpha1'
const MAX_PROFILE_BYTES = 512 * 1024
const idPattern = /^[a-z][a-z0-9-]{0,63}$/
const credentialPattern = /^[A-Za-z_][A-Za-z0-9_]*$/
const colorPattern = /^#[0-9a-fA-F]{6}$/
const allowedModalities = new Set(['text', 'image'])
const allowedThinkingLevels = new Set(['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'])
const allowedMaxTokensFields = new Set(['max_completion_tokens', 'max_tokens'])
const allowedThinkingFormats = new Set([
  'openai', 'deepseek', 'openrouter', 'together', 'baseten', 'zai', 'qwen',
  'chat-template', 'qwen-chat-template', 'string-thinking', 'ant-ling',
])
const allowedRootKeys = new Set([
  'schemaVersion', 'id', 'displayName', 'organization', 'nativeInstitutionID',
  'allowInsecureDevelopment', 'insecureDevelopmentOrigin', 'brand', 'oidc', 'keyBinding', 'provider',
])
const allowedOidcKeys = new Set(['issuer', 'clientId', 'scopes'])
const allowedKeyBindingKeys = new Set(['baseURL', 'credentialRef'])
const allowedBrandKeys = new Set([
  'productName', 'organizationName', 'mark', 'logoURL', 'primaryColor',
  'loginTitle', 'loginDescription', 'supportURL',
])
const allowedProviderKeys = new Set([
  'id', 'displayName', 'adapter', 'baseURL', 'reasoning', 'defaultContextWindow',
  'defaultMaxTokens', 'maxRequestImageBytes', 'requestImagePixelBudget',
  'requestImageMaxBytes', 'streamIdleTimeoutMs', 'retryPolicy', 'compat', 'models',
])
const allowedModelKeys = new Set([
  'id', 'name', 'input', 'contextWindow', 'maxTokens', 'reasoning',
  'reasoningEfforts', 'compat',
])
const allowedCompatKeys = new Set([
  'supportsDeveloperRole', 'supportsStore', 'supportsReasoningEffort',
  'supportsUsageInStreaming', 'maxTokensField', 'supportsStrictMode',
  'supportsLongCacheRetention', 'thinkingFormat',
  'requiresReasoningContentOnAssistantMessages',
])

function object(value, label) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label} must be an object`)
  return value
}

function exactKeys(value, allowed, label) {
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Error(`${label}.${key} is not allowed`)
}

function text(value, label, max = 2048) {
  if (typeof value !== 'string' || value.trim() === '' || value !== value.trim() || value.length > max) {
    throw new Error(`${label} must be a non-empty trimmed string no longer than ${max} characters`)
  }
  return value
}

function isLoopback(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}

function insecureDevelopmentOrigin(value, label) {
  const raw = text(value, label)
  const parsed = new URL(raw)
  if (parsed.protocol !== 'http:' || parsed.username || parsed.password || parsed.search || parsed.hash || (parsed.pathname !== '/' && parsed.pathname !== '')) {
    throw new Error(`${label} must be an exact HTTP origin without credentials, path, query, or fragment`)
  }
  return raw.replace(/\/+$/, '')
}

function endpointProtocolAllowed(parsed, allowInsecure, allowedInsecureOrigin) {
  return parsed.protocol === 'https:' || (allowInsecure && parsed.protocol === 'http:' && (
    isLoopback(parsed.hostname) || parsed.origin === allowedInsecureOrigin
  ))
}

function issuerURL(value, label, allowInsecure = false, allowedInsecureOrigin) {
  const raw = text(value, label)
  const parsed = new URL(raw)
  const permitted = endpointProtocolAllowed(parsed, allowInsecure, allowedInsecureOrigin)
  if (!permitted || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error(`${label} must be an HTTPS issuer URL without credentials, query, or fragment${allowInsecure ? ' (loopback or the exact allowlisted HTTP origin is allowed in development)' : ''}`)
  }
  return raw
}

function exactURL(value, label, allowInsecure = false, allowedInsecureOrigin) {
  const raw = text(value, label)
  const parsed = new URL(raw)
  const permitted = endpointProtocolAllowed(parsed, allowInsecure, allowedInsecureOrigin)
  if (!permitted || parsed.username || parsed.password || parsed.hash || parsed.search) {
    throw new Error(`${label} must be an absolute HTTPS URL without credentials, query, or fragment${allowInsecure ? ' (loopback or the exact allowlisted HTTP origin is allowed in development)' : ''}`)
  }
  return raw.replace(/\/+$/, '')
}

function safeHTTPSResource(value, label, max) {
  const raw = text(value, label, max)
  const parsed = new URL(raw)
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hash) {
    throw new Error(`${label} must be an HTTPS URL without credentials or fragment`)
  }
  return raw
}

function positiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${label} must be a positive safe integer`)
  return value
}

function optionalPositiveInteger(value, label) {
  return value === undefined ? undefined : positiveInteger(value, label)
}

function boolean(value, label) {
  if (typeof value !== 'boolean') throw new Error(`${label} must be a boolean`)
  return value
}

function normalizeBrand(value = {}) {
  const source = object(value, 'brand')
  exactKeys(source, allowedBrandKeys, 'brand')
  const result = {}
  if (source.productName !== undefined) result.productName = text(source.productName, 'brand.productName', 80)
  if (source.organizationName !== undefined) result.organizationName = text(source.organizationName, 'brand.organizationName', 120)
  if (source.mark !== undefined) result.mark = text(source.mark, 'brand.mark', 4)
  if (source.primaryColor !== undefined) {
    if (typeof source.primaryColor !== 'string' || !colorPattern.test(source.primaryColor)) throw new Error('brand.primaryColor must be a six-digit hex color')
    result.primaryColor = source.primaryColor.toLowerCase()
  }
  if (source.logoURL !== undefined) {
    const logo = text(source.logoURL, 'brand.logoURL', 128 * 1024)
    if (!/^https:\/\//.test(logo) && !/^data:image\/(?:png|webp);base64,[A-Za-z0-9+/]+=*$/.test(logo)) {
      throw new Error('brand.logoURL must be HTTPS or a base64 PNG/WebP data URL')
    }
    result.logoURL = logo.startsWith('https://') ? safeHTTPSResource(logo, 'brand.logoURL', 128 * 1024) : logo
  }
  for (const key of ['loginTitle', 'loginDescription']) {
    if (source[key] !== undefined) result[key] = text(source[key], `brand.${key}`, key === 'loginTitle' ? 120 : 500)
  }
  if (source.supportURL !== undefined) result.supportURL = exactURL(source.supportURL, 'brand.supportURL')
  return Object.freeze(result)
}

function normalizeCompat(value, label) {
  const source = object(value, label)
  exactKeys(source, allowedCompatKeys, label)
  const result = {}
  for (const key of allowedCompatKeys) {
    if (source[key] === undefined) continue
    if (key === 'maxTokensField') {
      result[key] = text(source[key], `${label}.${key}`, 64)
      if (!allowedMaxTokensFields.has(result[key])) throw new Error(`${label}.${key} is not supported by DSH pi-ai`)
    } else if (key === 'thinkingFormat') {
      result[key] = text(source[key], `${label}.${key}`, 64)
      if (!allowedThinkingFormats.has(result[key])) throw new Error(`${label}.${key} is not supported by DSH pi-ai`)
    } else {
      result[key] = boolean(source[key], `${label}.${key}`)
    }
  }
  return Object.freeze(result)
}

function normalizeReasoningEfforts(value, providerID, modelID) {
  if (value === false) return false
  const source = object(value, `${providerID}.${modelID}.reasoningEfforts`)
  if (Object.keys(source).length === 0 || Object.keys(source).length > allowedThinkingLevels.size) {
    throw new Error(`${providerID}.${modelID}.reasoningEfforts must contain 1-${allowedThinkingLevels.size} entries`)
  }
  return Object.freeze(Object.fromEntries(Object.entries(source).map(([level, wire]) => {
    if (!allowedThinkingLevels.has(level)) throw new Error(`${providerID}.${modelID}.reasoningEfforts level ${level} is not supported by DSH pi-ai`)
    if (wire === null && level !== 'off') throw new Error(`${providerID}.${modelID}.reasoningEfforts.${level} may be null only for off`)
    if (wire !== null) text(wire, `${providerID}.${modelID}.reasoningEfforts.${level}`, 32)
    return [level, wire]
  })))
}

function normalizeModels(models, providerID) {
  if (!Array.isArray(models) || models.length === 0 || models.length > 128) throw new Error(`${providerID}.models must contain 1-128 entries`)
  const seen = new Set()
  return Object.freeze(models.map((raw, index) => {
    const label = `${providerID}.models[${index}]`
    const model = object(raw, label)
    exactKeys(model, allowedModelKeys, label)
    const id = text(model.id, `${label}.id`, 256)
    if (seen.has(id)) throw new Error(`${providerID} repeats model ${id}`)
    seen.add(id)
    const input = model.input ?? ['text']
    if (!Array.isArray(input) || input.length === 0 || input.some(value => !allowedModalities.has(value))) {
      throw new Error(`${providerID}.${id}.input must contain text and/or image`)
    }
    if (new Set(input).size !== input.length) throw new Error(`${providerID}.${id}.input contains duplicates`)
    return Object.freeze({
      id,
      name: model.name === undefined ? id : text(model.name, `${providerID}.${id}.name`, 256),
      input: Object.freeze([...new Set(input)]),
      ...(model.contextWindow === undefined ? {} : { contextWindow: positiveInteger(model.contextWindow, `${providerID}.${id}.contextWindow`) }),
      ...(model.maxTokens === undefined ? {} : { maxTokens: positiveInteger(model.maxTokens, `${providerID}.${id}.maxTokens`) }),
      ...(model.reasoning === undefined ? {} : { reasoning: boolean(model.reasoning, `${providerID}.${id}.reasoning`) }),
      ...(model.reasoningEfforts === undefined ? {} : { reasoningEfforts: normalizeReasoningEfforts(model.reasoningEfforts, providerID, id) }),
      ...(model.compat === undefined ? {} : { compat: normalizeCompat(model.compat, `${providerID}.${id}.compat`) }),
    })
  }))
}

function providerCredentialRef(providerID) {
  return `${providerID.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_API_KEY`
}

function normalizeRetryPolicy(value) {
  const source = object(value, 'profile.provider.retryPolicy')
  exactKeys(source, new Set(['mode', 'maxRetries', 'retryableCodes', 'backoff']), 'profile.provider.retryPolicy')
  if (!['normal', 'always'].includes(source.mode)) throw new Error('profile.provider.retryPolicy.mode must be normal or always')
  if (source.maxRetries !== undefined && (!Number.isSafeInteger(source.maxRetries) || source.maxRetries < 0)) {
    throw new Error('profile.provider.retryPolicy.maxRetries must be a non-negative safe integer')
  }
  if (source.retryableCodes !== undefined) {
    if (!Array.isArray(source.retryableCodes) || source.retryableCodes.length === 0 || source.retryableCodes.length > 64
      || source.retryableCodes.some(code => typeof code !== 'string' || code === '' || code.length > 128)
      || new Set(source.retryableCodes).size !== source.retryableCodes.length) {
      throw new Error('profile.provider.retryPolicy.retryableCodes must contain 1-64 unique non-empty strings')
    }
  }
  let backoff
  if (source.backoff !== undefined) {
    const raw = object(source.backoff, 'profile.provider.retryPolicy.backoff')
    exactKeys(raw, new Set(['initialDelayMs', 'maxDelayMs', 'jitterRatio']), 'profile.provider.retryPolicy.backoff')
    for (const key of ['initialDelayMs', 'maxDelayMs']) {
      if (raw[key] !== undefined && (!Number.isFinite(raw[key]) || raw[key] <= 0 || raw[key] > 2147483647)) {
        throw new Error(`profile.provider.retryPolicy.backoff.${key} is invalid`)
      }
    }
    if (raw.jitterRatio !== undefined && (!Number.isFinite(raw.jitterRatio) || raw.jitterRatio < 0 || raw.jitterRatio > 1)) {
      throw new Error('profile.provider.retryPolicy.backoff.jitterRatio must be between 0 and 1')
    }
    if (raw.initialDelayMs !== undefined && raw.maxDelayMs !== undefined && raw.initialDelayMs > raw.maxDelayMs) {
      throw new Error('profile.provider.retryPolicy.backoff.initialDelayMs must not exceed maxDelayMs')
    }
    backoff = Object.freeze({ ...raw })
  }
  return Object.freeze({
    mode: source.mode,
    ...(source.maxRetries === undefined ? {} : { maxRetries: source.maxRetries }),
    ...(source.retryableCodes === undefined ? {} : { retryableCodes: Object.freeze([...source.retryableCodes]) }),
    ...(backoff === undefined ? {} : { backoff }),
  })
}

function boundedProfile(raw) {
  let encoded
  try { encoded = JSON.stringify(raw) }
  catch (cause) { throw new Error('enterprise profile must be JSON-serializable', { cause }) }
  if (Buffer.byteLength(encoded, 'utf8') > MAX_PROFILE_BYTES) throw new Error(`enterprise profile exceeds ${MAX_PROFILE_BYTES} bytes`)
}

export function normalizeEnterpriseProfile(raw) {
  boundedProfile(raw)
  const source = object(raw, 'enterprise profile')
  exactKeys(source, allowedRootKeys, 'profile')
  if (source.schemaVersion !== PROFILE_SCHEMA_VERSION) throw new Error(`unsupported enterprise profile schemaVersion ${String(source.schemaVersion)}`)
  const id = text(source.id, 'profile.id', 64)
  if (!idPattern.test(id)) throw new Error('profile.id is invalid')
  const allowInsecureDevelopment = source.allowInsecureDevelopment === true
  const allowedInsecureOrigin = source.insecureDevelopmentOrigin === undefined
    ? undefined
    : insecureDevelopmentOrigin(source.insecureDevelopmentOrigin, 'profile.insecureDevelopmentOrigin')
  if (allowedInsecureOrigin !== undefined && !allowInsecureDevelopment) {
    throw new Error('profile.insecureDevelopmentOrigin requires allowInsecureDevelopment=true')
  }
  const oidc = object(source.oidc, 'profile.oidc')
  const keyBinding = object(source.keyBinding, 'profile.keyBinding')
  const provider = object(source.provider, 'profile.provider')
  exactKeys(oidc, allowedOidcKeys, 'profile.oidc')
  exactKeys(keyBinding, allowedKeyBindingKeys, 'profile.keyBinding')
  exactKeys(provider, allowedProviderKeys, 'profile.provider')
  const providerID = text(provider.id, 'profile.provider.id', 64)
  if (!idPattern.test(providerID)) throw new Error('profile.provider.id is invalid')
  const credentialRef = keyBinding.credentialRef === undefined
    ? providerCredentialRef(providerID)
    : text(keyBinding.credentialRef, 'profile.keyBinding.credentialRef', 128)
  if (!credentialPattern.test(credentialRef)) {
    throw new Error('profile.keyBinding.credentialRef must be a valid DSH credential reference')
  }
  if (provider.adapter !== 'openai-compatible') throw new Error(`unsupported provider adapter ${String(provider.adapter)}`)
  const scopes = oidc.scopes
  if (!Array.isArray(scopes) || scopes.length < 2 || scopes.length > 64 || !scopes.includes('openid') || !scopes.includes('profile') || scopes.some(scope => typeof scope !== 'string' || scope.length > 128 || scope.trim() !== scope || scope === '' || /\s/.test(scope))) {
    throw new Error('profile.oidc.scopes must contain openid and profile; every scope must be a non-empty token')
  }
  if (new Set(scopes).size !== scopes.length) throw new Error('profile.oidc.scopes contains duplicates')
  return Object.freeze({
    schemaVersion: PROFILE_SCHEMA_VERSION,
    id,
    displayName: text(source.displayName, 'profile.displayName', 120),
    organization: text(source.organization ?? source.displayName, 'profile.organization', 120),
    allowInsecureDevelopment,
    ...(allowedInsecureOrigin === undefined ? {} : { insecureDevelopmentOrigin: allowedInsecureOrigin }),
    nativeInstitutionID: source.nativeInstitutionID === undefined ? id : text(source.nativeInstitutionID, 'profile.nativeInstitutionID', 64),
    brand: normalizeBrand(source.brand),
    oidc: Object.freeze({
      issuer: issuerURL(oidc.issuer, 'profile.oidc.issuer', allowInsecureDevelopment, allowedInsecureOrigin),
      clientId: text(oidc.clientId, 'profile.oidc.clientId', 256),
      scopes: Object.freeze([...scopes]),
    }),
    keyBinding: Object.freeze({
      type: 'worker-user-center-v1',
      baseURL: exactURL(keyBinding.baseURL, 'profile.keyBinding.baseURL', allowInsecureDevelopment, allowedInsecureOrigin),
      providerId: providerID,
      credentialRef,
    }),
    provider: Object.freeze({
      id: providerID,
      displayName: text(provider.displayName ?? source.displayName, 'profile.provider.displayName', 120),
      adapter: provider.adapter,
      baseURL: exactURL(provider.baseURL, 'profile.provider.baseURL', allowInsecureDevelopment, allowedInsecureOrigin),
      reasoning: provider.reasoning === undefined
        ? 'high'
        : (() => {
            const reasoning = text(provider.reasoning, 'profile.provider.reasoning', 32)
            if (!allowedThinkingLevels.has(reasoning)) throw new Error('profile.provider.reasoning is not supported by DSH pi-ai')
            return reasoning
          })(),
      defaultContextWindow: optionalPositiveInteger(provider.defaultContextWindow, 'profile.provider.defaultContextWindow'),
      defaultMaxTokens: optionalPositiveInteger(provider.defaultMaxTokens, 'profile.provider.defaultMaxTokens'),
      maxRequestImageBytes: optionalPositiveInteger(provider.maxRequestImageBytes, 'profile.provider.maxRequestImageBytes'),
      requestImagePixelBudget: optionalPositiveInteger(provider.requestImagePixelBudget, 'profile.provider.requestImagePixelBudget'),
      requestImageMaxBytes: optionalPositiveInteger(provider.requestImageMaxBytes, 'profile.provider.requestImageMaxBytes'),
      streamIdleTimeoutMs: optionalPositiveInteger(provider.streamIdleTimeoutMs, 'profile.provider.streamIdleTimeoutMs'),
      retryPolicy: provider.retryPolicy === undefined ? undefined : normalizeRetryPolicy(provider.retryPolicy),
      compat: provider.compat === undefined ? undefined : normalizeCompat(provider.compat, 'profile.provider.compat'),
      models: normalizeModels(provider.models, providerID),
    }),
  })
}

export function loadEnterpriseProfiles(raw = {}, environment = process.env) {
  const profiles = []
  if (raw.profile !== undefined) profiles.push(normalizeEnterpriseProfile(raw.profile))
  if (raw.profiles !== undefined) {
    if (!Array.isArray(raw.profiles)) throw new Error('dsh-oidc profiles must be an array')
    profiles.push(...raw.profiles.map(normalizeEnterpriseProfile))
  }
  if (typeof raw.profilePathEnv === 'string' && environment[raw.profilePathEnv]) {
    const parsed = JSON.parse(readFileSync(environment[raw.profilePathEnv], 'utf8'))
    const rows = Array.isArray(parsed) ? parsed : parsed.profiles ?? [parsed]
    profiles.push(...rows.map(normalizeEnterpriseProfile))
  }
  const unique = new Map()
  const providers = new Set()
  for (const profile of profiles) {
    if (unique.has(profile.id)) throw new Error(`dsh-oidc repeats profile ${profile.id}`)
    if (providers.has(profile.provider.id)) throw new Error(`dsh-oidc repeats provider route ${profile.provider.id}`)
    unique.set(profile.id, profile)
    providers.add(profile.provider.id)
  }
  return unique
}

export function enterpriseProviderConfig(profiles) {
  return {
    providers: Object.fromEntries([...profiles.values()].map(profile => [profile.provider.id, {
      displayName: profile.provider.displayName,
      apiKeyEnv: profile.keyBinding.credentialRef,
      baseURL: profile.provider.baseURL,
      allowInsecureDevelopment: profile.allowInsecureDevelopment,
      ...(profile.insecureDevelopmentOrigin === undefined ? {} : { insecureDevelopmentOrigin: profile.insecureDevelopmentOrigin }),
      reasoning: profile.provider.reasoning,
      ...(profile.provider.defaultContextWindow === undefined ? {} : { defaultContextWindow: profile.provider.defaultContextWindow }),
      ...(profile.provider.defaultMaxTokens === undefined ? {} : { defaultMaxTokens: profile.provider.defaultMaxTokens }),
      ...(profile.provider.maxRequestImageBytes === undefined ? {} : { maxRequestImageBytes: profile.provider.maxRequestImageBytes }),
      ...(profile.provider.requestImagePixelBudget === undefined ? {} : { requestImagePixelBudget: profile.provider.requestImagePixelBudget }),
      ...(profile.provider.requestImageMaxBytes === undefined ? {} : { requestImageMaxBytes: profile.provider.requestImageMaxBytes }),
      ...(profile.provider.streamIdleTimeoutMs === undefined ? {} : { streamIdleTimeoutMs: profile.provider.streamIdleTimeoutMs }),
      ...(profile.provider.retryPolicy === undefined ? {} : { retryPolicy: structuredClone(profile.provider.retryPolicy) }),
      ...(profile.provider.compat === undefined ? {} : { compat: { ...profile.provider.compat } }),
      models: profile.provider.models.map(model => ({
        ...model,
        input: [...model.input],
        ...(model.reasoningEfforts && typeof model.reasoningEfforts === 'object'
          ? { reasoningEfforts: { ...model.reasoningEfforts } }
          : {}),
        ...(model.compat === undefined ? {} : { compat: { ...model.compat } }),
      })),
    }])),
  }
}

export function publicProfile(profile) {
  return {
    id: profile.id,
    displayName: profile.displayName,
    organization: profile.organization,
    brand: profile.brand,
    credentialRef: profile.keyBinding.credentialRef,
    provider: {
      id: profile.provider.id,
      displayName: profile.provider.displayName,
      models: profile.provider.models.map(model => ({ id: model.id, name: model.name, input: model.input })),
    },
  }
}
