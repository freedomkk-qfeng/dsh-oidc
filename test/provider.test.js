import assert from 'node:assert/strict'
import test from 'node:test'
import { ENTERPRISE_DEFAULT_RETRY_POLICY, resolveEnterpriseProfiles } from '../src/host/provider/core.js'
import { assertServiceableEnterpriseProviders, resolveEnterpriseImageAccess } from '../src/host/provider/index.js'
import { TransformingEnterpriseAdapter } from '../src/host/provider/transform-adapter.js'

test('provider route uses bounded defaults and classic OpenAI-compatible roles', () => {
  const [profile] = resolveEnterpriseProfiles({ providers: { campus: {
    displayName: 'Campus AI', apiKeyEnv: 'CAMPUS_API_KEY', baseURL: 'https://ai.example.edu/v1',
    models: [{ id: 'campus-max', input: ['text'] }],
  } } })
  assert.equal(profile.models[0].compat.supportsDeveloperRole, false)
  assert.equal(profile.models[0].compat.thinkingFormat, 'deepseek')
  assert.deepEqual(ENTERPRISE_DEFAULT_RETRY_POLICY, { mode: 'normal', maxRetries: 2 })
})

test('settings validation rejects schema-shaped provider values that cannot be served', () => {
  assert.throws(() => assertServiceableEnterpriseProviders({ providers: { campus: {
    apiKeyEnv: 'CAMPUS_API_KEY', models: [{ id: 'campus-max' }],
  } } }), /baseURL must be a non-empty string/)
  assert.throws(() => assertServiceableEnterpriseProviders({ providers: { campus: {
    apiKeyEnv: 'CAMPUS_API_KEY', baseURL: 'https://ai.example.edu/v1', models: [],
  } } }), /models must not be empty/)
})

test('provider route preserves the Enterprise Profile development-origin boundary', () => {
  const [loopback] = resolveEnterpriseProfiles({ providers: { campus: {
    displayName: 'Campus AI', apiKeyEnv: 'CAMPUS_API_KEY', baseURL: 'http://127.0.0.1:3100/v1',
    models: [{ id: 'campus-max', input: ['text'] }],
  } } })
  assert.equal(loopback.baseURL, 'http://127.0.0.1:3100/v1')

  assert.throws(() => resolveEnterpriseProfiles({ providers: { campus: {
    displayName: 'Campus AI', apiKeyEnv: 'CAMPUS_API_KEY', baseURL: 'http://192.0.2.10/v1',
    models: [{ id: 'campus-max', input: ['text'] }],
  } } }), /explicitly allowed development HTTP/)

  const [profile] = resolveEnterpriseProfiles({ providers: { campus: {
    displayName: 'Campus AI', apiKeyEnv: 'CAMPUS_API_KEY', baseURL: 'http://192.0.2.10/v1',
    allowInsecureDevelopment: true, insecureDevelopmentOrigin: 'http://192.0.2.10',
    models: [{ id: 'campus-max', input: ['text'] }],
  } } })
  assert.equal(profile.baseURL, 'http://192.0.2.10/v1')

  assert.throws(() => resolveEnterpriseProfiles({ providers: { campus: {
    displayName: 'Campus AI', apiKeyEnv: 'CAMPUS_API_KEY', baseURL: 'http://192.0.2.11/v1',
    allowInsecureDevelopment: true, insecureDevelopmentOrigin: 'http://192.0.2.10',
    models: [{ id: 'campus-max', input: ['text'] }],
  } } }), /explicitly allowed development HTTP/)
})

test('image attachment access uses the rc.1 filesystem execution-world mapping', () => {
  const ctx = { get: name => name === 'fs' ? { processPathFromHostPath: path => `/workspace/${path.split(/[\\/]/).at(-1)}` } : undefined }
  const attachments = { imageHostPath: ref => ref.attachmentId === 'image-1' ? 'C:\\host\\normalized.webp' : undefined }
  assert.deepEqual(resolveEnterpriseImageAccess(ctx, attachments, { attachmentId: 'image-1' }), { readonlyPath: '/workspace/normalized.webp' })
  assert.equal(resolveEnterpriseImageAccess(ctx, attachments, { attachmentId: 'missing' }), undefined)
})

function harness(policy) {
  const streamed = []
  const inner = {
    imageRequestPricing: (provider, model) => ({ provider, model, currency: 'USD' }),
    resolveModel: async (provider, model) => ({ provider, id: model, inputModalities: ['text', 'image'], reasoning: { efforts: [{ id: 'high', name: 'High' }], defaultEffort: 'high' } }),
    stream: async function * (options) { streamed.push(options); yield { type: 'finish', reason: { kind: 'stop' } } },
    async prepareCall(provider, model) { return { model: await this.resolveModel(provider, model), stream: options => this.stream(options) } },
  }
  const transforms = { capabilities: (_provider, _model, modalities) => modalities, apply: async options => options }
  return { adapter: new TransformingEnterpriseAdapter(inner, transforms, policy), streamed }
}

test('thinking-only models drop unsupported reasoning effort without rejecting the call', async () => {
  const { adapter, streamed } = harness(() => ({ supportsReasoningEffort: false }))
  const resolved = await adapter.resolveModel('campus', 'vision')
  assert.equal(resolved.reasoning, undefined)
  for await (const _chunk of adapter.stream({ provider: 'campus', model: 'vision', messages: [], reasoningEffort: 'high' })) {}
  assert.equal(streamed[0].reasoningEffort, undefined)
})

test('image request pricing is delegated to the wrapped rc.1 adapter', () => {
  const { adapter } = harness(() => ({}))
  assert.deepEqual(adapter.imageRequestPricing('campus', 'vision'), { provider: 'campus', model: 'vision', currency: 'USD' })
})

test('non-reasoning models force the adapter internal off level', async () => {
  const { adapter, streamed } = harness(() => ({ reasoning: false, supportsReasoningEffort: false }))
  for await (const _chunk of adapter.stream({ provider: 'campus', model: 'plain', messages: [], reasoningEffort: 'high' })) {}
  assert.equal(streamed[0].reasoningEffort, 'off')
})
