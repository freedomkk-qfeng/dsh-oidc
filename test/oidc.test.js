import assert from 'node:assert/strict'
import { createHash, generateKeyPairSync, sign } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { NativeOidcBackend, WebOidcBackend, sessionRef } from '../src/host/oidc.js'
import { normalizeEnterpriseProfile } from '../src/host/profile.js'

const raw = JSON.parse(await readFile(new URL('../examples/enterprise-profile.example.json', import.meta.url), 'utf8'))
const profile = normalizeEnterpriseProfile(raw)

function harness(fetch, config = {}) {
  const secrets = new Map()
  let route
  const ctx = {
    credentials: {
      async resolve(ref) { return secrets.has(ref) ? { value: secrets.get(ref) } : undefined },
      async set(ref, value) { secrets.set(ref, value) },
      async unset(ref) { secrets.delete(ref) },
    },
    webServer: {
      host: '127.0.0.1', port: 3080,
      register(value) { route = value; return () => { route = undefined } },
    },
    effect(install) { return install() },
    logger: { warn() {}, error() {} },
  }
  return { ctx, secrets, route: () => route, backend: new WebOidcBackend(ctx, new Map([[profile.id, profile]]), config, { fetch }) }
}

function jwt(privateKey, claims, headerClaims = {}) {
  const encoded = value => Buffer.from(JSON.stringify(value)).toString('base64url')
  const header = encoded({ alg: 'RS256', kid: 'acceptance-key', ...headerClaims })
  const body = encoded(claims)
  const signature = sign('RSA-SHA256', Buffer.from(`${header}.${body}`), privateKey).toString('base64url')
  return `${header}.${body}.${signature}`
}

function callbackResponse() {
  return {
    status: 0, headers: {}, ended: false,
    writeHead(status, headers) { this.status = status; this.headers = headers },
    end() { this.ended = true },
  }
}

function providerFetch(options = {}) {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const jwk = publicKey.export({ format: 'jwk' })
  const calls = []
  let currentNonce = ''
  let runtimeState = 'missing'
  let subject = options.subject ?? 'user-1'
  const fetch = async (url, init = {}) => {
    const target = String(url)
    calls.push({ target, init })
    if (target.endsWith('/.well-known/openid-configuration')) return Response.json({
      issuer: profile.oidc.issuer,
      authorization_endpoint: 'https://authorize.example.net/oauth/authorize?tenant=example',
      token_endpoint: 'https://tokens.example.net/oauth/token',
      userinfo_endpoint: 'https://userinfo.example.net/oauth/userinfo',
      jwks_uri: 'https://keys.example.net/oauth/jwks.json',
      revocation_endpoint: 'https://tokens.example.net/oauth/revoke',
      code_challenge_methods_supported: ['S256'], id_token_signing_alg_values_supported: ['RS256'],
    })
    if (target.startsWith('https://tokens.example.net/oauth/token')) {
      const accessToken = 'access-token'
      const atHash = createHash('sha256').update(accessToken).digest().subarray(0, 16).toString('base64url')
      return Response.json({
        access_token: accessToken, refresh_token: 'refresh-token', token_type: 'Bearer', expires_in: 3600,
        id_token: jwt(privateKey, {
          iss: profile.oidc.issuer, aud: options.audience ?? profile.oidc.clientId,
          ...(options.azp === undefined ? {} : { azp: options.azp }), sub: subject, nonce: currentNonce, at_hash: atHash,
          iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      })
    }
    if (target === 'https://keys.example.net/oauth/jwks.json') return Response.json({ keys: [{ ...jwk, kid: 'acceptance-key', use: 'sig', alg: 'RS256' }] })
    if (target === 'https://userinfo.example.net/oauth/userinfo') return Response.json({ sub: options.userInfoSubject ?? subject, name: options.name })
    if (target.endsWith('/bootstrap')) return Response.json({
      subject: { sub: 'management-subject-must-not-overwrite-oidc' },
      provider: { id: 'example-ai' }, capabilities: ['worker.credential.provision'],
      runtime_credential: { status: runtimeState, provisioning: { allowed: true } },
    })
    if (target.endsWith('/runtime-credential/provision')) {
      runtimeState = 'active'
      return Response.json({ provider_id: 'example-ai', api_key: 'runtime-api-key', status: 'active' })
    }
    if (target.endsWith('/runtime-credential/resolve')) return Response.json({ provider_id: 'example-ai', api_key: 'runtime-api-key', status: 'active' })
    if (target.endsWith('/oauth/revoke')) return new Response('', { status: 200 })
    throw new Error(`unexpected fetch ${target}`)
  }
  return { calls, fetch, setNonce(value) { currentNonce = value } }
}

test('Web OIDC completes PKCE, accepts standard cross-origin metadata, and provisions a credential', async () => {
  const provider = providerFetch()
  const state = harness(provider.fetch)
  assert.equal(state.route().path, '/oauth/callback')
  const begin = await state.backend.begin('example-university')
  const authorization = new URL(begin.authorizationURL)
  const flowState = authorization.searchParams.get('state')
  provider.setNonce(authorization.searchParams.get('nonce'))
  assert.equal(authorization.hostname, 'authorize.example.net')
  assert.equal(authorization.searchParams.get('tenant'), 'example')
  assert.equal(authorization.searchParams.get('code_challenge_method'), 'S256')
  assert.equal(authorization.searchParams.get('redirect_uri'), 'http://127.0.0.1:3080/oauth/callback')
  const response = callbackResponse()
  await state.route().handler({ url: `/oauth/callback?code=code-1&state=${encodeURIComponent(flowState)}` }, response)
  assert.equal(response.status, 302)
  assert.match(response.headers.location, /dsh_oidc=credential-required/)
  assert.ok(state.secrets.has(sessionRef(profile)))
  assert.equal(state.secrets.has('EXAMPLE_AI_API_KEY'), false)

  const connected = await state.backend.reconcile('example-university', { allowProvision: true })
  assert.equal(connected.credentialReady, true)
  assert.equal(connected.userName, 'user-1')
  assert.equal(JSON.parse(state.secrets.get(sessionRef(profile))).identity.sub, 'user-1')
  assert.equal(state.secrets.get('EXAMPLE_AI_API_KEY'), 'runtime-api-key')
  const provision = provider.calls.find(call => call.target.endsWith('/runtime-credential/provision'))
  assert.ok(provision.init.headers['idempotency-key'])
})

test('explicit development HTTP Discovery stays on the exact allowlisted origin', async () => {
  const developmentProfile = normalizeEnterpriseProfile({
    ...raw,
    allowInsecureDevelopment: true,
    insecureDevelopmentOrigin: 'http://192.0.2.10',
    oidc: { ...raw.oidc, issuer: 'http://192.0.2.10' },
    keyBinding: { baseURL: 'http://192.0.2.10/api/worker/v1' },
    provider: { ...raw.provider, baseURL: 'http://192.0.2.10/open/api/v1' },
  })
  const ctx = {
    credentials: {},
    webServer: { host: '127.0.0.1', port: 3080, register() { return () => {} } },
    effect(install) { return install() },
    logger: { warn() {} },
  }
  const metadata = endpointOrigin => ({
    issuer: developmentProfile.oidc.issuer,
    authorization_endpoint: `${endpointOrigin}/oauth/authorize`,
    token_endpoint: `${endpointOrigin}/oauth/token`,
    userinfo_endpoint: `${endpointOrigin}/oauth/userinfo`,
    jwks_uri: `${endpointOrigin}/oauth/jwks`,
    code_challenge_methods_supported: ['S256'],
    id_token_signing_alg_values_supported: ['RS256'],
  })
  const allowed = new WebOidcBackend(ctx, new Map([[developmentProfile.id, developmentProfile]]), {}, {
    fetch: async () => Response.json(metadata('http://192.0.2.10')),
  })
  const begin = await allowed.begin(developmentProfile.id)
  assert.equal(new URL(begin.authorizationURL).origin, 'http://192.0.2.10')

  const rejected = new WebOidcBackend(ctx, new Map([[developmentProfile.id, developmentProfile]]), {}, {
    fetch: async () => Response.json(metadata('http://192.0.2.11')),
  })
  await assert.rejects(() => rejected.begin(developmentProfile.id), /exact development HTTP origin/)
})

test('multi-audience ID Tokens require azp to identify this client', async () => {
  const provider = providerFetch({ audience: [profile.oidc.clientId, 'other-client'], azp: 'other-client' })
  const state = harness(provider.fetch)
  const begin = await state.backend.begin(profile.id)
  const authorization = new URL(begin.authorizationURL)
  provider.setNonce(authorization.searchParams.get('nonce'))
  const response = callbackResponse()
  await state.route().handler({ url: `/oauth/callback?code=x&state=${authorization.searchParams.get('state')}` }, response)
  assert.match(response.headers.location, /oidc_id_token_invalid/)
  assert.equal(state.secrets.size, 0)
})

test('UserInfo subject must match the ID Token subject', async () => {
  const provider = providerFetch({ userInfoSubject: 'attacker' })
  const state = harness(provider.fetch)
  const begin = await state.backend.begin(profile.id)
  const authorization = new URL(begin.authorizationURL)
  provider.setNonce(authorization.searchParams.get('nonce'))
  const response = callbackResponse()
  await state.route().handler({ url: `/oauth/callback?code=x&state=${authorization.searchParams.get('state')}` }, response)
  assert.match(response.headers.location, /oidc_userinfo_invalid/)
  assert.equal(state.secrets.size, 0)
})

test('standard UserInfo name is preferred and management-plane subject data cannot overwrite it', async () => {
  const provider = providerFetch({ name: 'Alice Example' })
  const state = harness(provider.fetch)
  const begin = await state.backend.begin(profile.id)
  const authorization = new URL(begin.authorizationURL)
  provider.setNonce(authorization.searchParams.get('nonce'))
  const response = callbackResponse()
  await state.route().handler({ url: `/oauth/callback?code=x&state=${authorization.searchParams.get('state')}` }, response)
  const session = JSON.parse(state.secrets.get(sessionRef(profile)))
  assert.equal(session.identity.name, 'Alice Example')
  assert.notEqual(session.identity.sub, 'management-subject-must-not-overwrite-oidc')
})

test('callback rejects duplicate security parameters', async () => {
  const provider = providerFetch()
  const state = harness(provider.fetch)
  const begin = await state.backend.begin(profile.id)
  const authorization = new URL(begin.authorizationURL)
  provider.setNonce(authorization.searchParams.get('nonce'))
  const stateValue = authorization.searchParams.get('state')
  const response = callbackResponse()
  await state.route().handler({ url: `/oauth/callback?code=a&code=b&state=${stateValue}` }, response)
  assert.match(response.headers.location, /oidc_callback_invalid/)
})

test('Web callback is fixed to the IPv4 loopback origin and return URLs are fail-closed', () => {
  const ctx = { credentials: {}, webServer: { host: '0.0.0.0', port: 3080 }, effect() {}, logger: { warn() {} } }
  assert.throws(() => new WebOidcBackend(ctx, new Map([[profile.id, profile]]), {}, { fetch: async () => {} }), /exactly 127\.0\.0\.1/)
  const local = { ...ctx, webServer: { host: '127.0.0.1', port: 3080 } }
  assert.throws(() => new WebOidcBackend(local, new Map([[profile.id, profile]]), { publicBaseURL: 'https://dsh.example.edu' }, { fetch: async () => {} }), /does not accept publicBaseURL/)
  assert.throws(() => new WebOidcBackend(local, new Map([[profile.id, profile]]), { returnPath: 'https://evil.example/' }, { fetch: async () => {} }), /same-origin absolute path/)
  assert.throws(() => new WebOidcBackend({ ...ctx, webServer: { host: '127.0.0.1', port: 0 } }, new Map([[profile.id, profile]]), {}, { fetch: async () => {} }), /valid DSH WebServer port/)
})

test('expired sessions refresh before Key Binding and logout removes every local credential', async () => {
  const provider = providerFetch()
  const state = harness(provider.fetch)
  state.secrets.set(sessionRef(profile), JSON.stringify({
    issuer: profile.oidc.issuer, clientId: profile.oidc.clientId,
    accessToken: 'expired', refreshToken: 'refresh-token', expiresAt: 1,
    identity: { sub: 'user-1', name: 'user-1' }, capabilities: [],
  }))
  state.secrets.set(profile.keyBinding.credentialRef, 'old-key')
  const result = await state.backend.reconcile(profile.id, { allowProvision: false })
  assert.equal(result.state, 'authenticated')
  const refresh = provider.calls.find(call => call.target === 'https://tokens.example.net/oauth/token')
  assert.equal(refresh.init.body.get('grant_type'), 'refresh_token')
  await state.backend.logout(profile.id)
  assert.equal(state.secrets.size, 0)
  assert.ok(provider.calls.some(call => call.target === 'https://tokens.example.net/oauth/revoke'))
})

test('invalid refresh grant clears both identity session and local model key', async () => {
  const base = providerFetch()
  const fetch = async (url, init = {}) => {
    if (String(url) === 'https://tokens.example.net/oauth/token' && init.body?.get?.('grant_type') === 'refresh_token') {
      return Response.json({ error: 'invalid_grant' }, { status: 400 })
    }
    return base.fetch(url, init)
  }
  const state = harness(fetch)
  state.secrets.set(sessionRef(profile), JSON.stringify({
    issuer: profile.oidc.issuer, clientId: profile.oidc.clientId,
    accessToken: 'expired', refreshToken: 'revoked', expiresAt: 1,
    identity: { sub: 'user-1', name: 'user-1' }, capabilities: [],
  }))
  state.secrets.set(profile.keyBinding.credentialRef, 'stale-key')
  await assert.rejects(() => state.backend.reconcile(profile.id), error => error.code === 'oidc_login_required')
  assert.equal(state.secrets.size, 0)
})

test('Web management projects the trusted Enterprise Profile as a read-only provider card', async () => {
  const state = harness(providerFetch().fetch)
  const management = await state.backend.management()
  assert.equal(management.schemaVersion, 'dsh-oidc/management/v1alpha1')
  assert.equal(management.mode, 'profile')
  assert.deepEqual(management.capabilities, { manageProfiles: false, manageModels: false, restart: false })
  assert.equal(management.profiles[0].providerID, profile.provider.id)
  assert.equal(management.profiles[0].runtime.modelSource, 'profile')
  assert.deepEqual(management.profiles[0].runtime.models.map(model => model.id), ['example-max', 'example-plus'])
  assert.throws(() => state.backend.configure(profile.id), error => error.code === 'oidc_management_unsupported')
})

test('native backend delegates lifecycle and model management without introducing a desktop framework dependency', async () => {
  const calls = []
  const configuration = {
    activeInstitutionID: profile.id,
    restartRequired: false,
    institutions: [{
      id: profile.id, displayName: profile.displayName, organization: profile.organization,
      baseURL: 'https://ai.example.edu', builtIn: true, configured: true,
      providerID: profile.provider.id,
      runtime: { ...profile.provider, modelSource: 'preset' },
    }],
  }
  const service = {
    async status(id) { calls.push(['status', id]); return { credentialReady: false } },
    async login(id, options) { calls.push(['login', id, options]); return { credentialReady: false, state: 'authenticated' } },
    async reconcile(id, options) { calls.push(['reconcile', id, options]); return { credentialReady: true, runtimeCredentialRef: 'EXAMPLE_AI_API_KEY' } },
    async logout(id) { calls.push(['logout', id]); return { credentialReady: false } },
    async configuration() { calls.push(['configuration']); return configuration },
    async activate(id) { calls.push(['activate', id]); return { ...configuration, activeInstitutionID: id } },
    async configure(id) { calls.push(['configure', id]); return configuration },
    async addCustom(baseURL) { calls.push(['addCustom', baseURL]); return configuration },
    async updateCustom(id, baseURL) { calls.push(['updateCustom', id, baseURL]); return configuration },
    async removeInstitution(id) { calls.push(['removeInstitution', id]); return configuration },
    async configureCustomModels(id, mode, models) { calls.push(['configureCustomModels', id, mode, models]); return configuration },
    async restart() { calls.push(['restart']); return { restarting: true } },
  }
  const backend = new NativeOidcBackend({ get: name => name === 'enterpriseAccounts' ? service : undefined }, new Map([[profile.id, profile]]))
  assert.equal((await backend.begin(profile.id)).status.state, 'authenticated')
  assert.equal((await backend.reconcile(profile.id, { allowProvision: true })).credentialReady, true)
  assert.equal((await backend.logout(profile.id)).state, 'signed_out')
  const management = await backend.management()
  assert.deepEqual(management.capabilities, { manageProfiles: true, manageModels: true, restart: true })
  assert.equal(management.profiles[0].enabled, true)
  assert.equal(management.profiles[0].runtime.models[1].input.includes('image'), true)
  await backend.activate(profile.id)
  await backend.configure(profile.id)
  await backend.addCustom('https://custom.example.edu')
  await backend.updateCustom(profile.id, 'https://new.example.edu')
  await backend.removeProfile(profile.id)
  await backend.configureModels(profile.id, 'manual', [{ id: 'manual-model', input: ['text'] }])
  assert.deepEqual(await backend.restart(), { restarting: true })
  assert.deepEqual(calls.map(call => call[0]), [
    'login', 'reconcile', 'logout', 'configuration', 'activate', 'configure', 'addCustom',
    'updateCustom', 'removeInstitution', 'configureCustomModels', 'restart',
  ])
})

test('native backend fails closed when the host and Enterprise Profile disagree on the credential reference', async () => {
  const service = {
    async status() {
      return { credentialReady: true, runtimeCredentialRef: 'WRONG_ENVIRONMENT_API_KEY' }
    },
  }
  const backend = new NativeOidcBackend({ get: name => name === 'enterpriseAccounts' ? service : undefined }, new Map([[profile.id, profile]]))
  await assert.rejects(
    () => backend.status(profile.id),
    error => error.code === 'oidc_native_credential_ref_mismatch',
  )
})
