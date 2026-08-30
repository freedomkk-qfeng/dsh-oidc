import assert from 'node:assert/strict'
import test from 'node:test'
import { ENTERPRISE_DEFAULT_RETRY_POLICY, resolveEnterpriseProfiles } from '../src/host/provider/core.js'
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

function harness(policy) {
  const streamed = []
  const inner = {
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

test('non-reasoning models force the adapter internal off level', async () => {
  const { adapter, streamed } = harness(() => ({ reasoning: false, supportsReasoningEffort: false }))
  for await (const _chunk of adapter.stream({ provider: 'campus', model: 'plain', messages: [], reasoningEffort: 'high' })) {}
  assert.equal(streamed[0].reasoningEffort, 'off')
})
