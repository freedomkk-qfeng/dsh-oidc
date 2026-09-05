import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'

import { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { WebServer } from '@deepseek-ai/dsh-host-webserver'
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment'
import { LlmRuntime, assertUsableApiKey, resolveImageAttachmentAccess, resolveRetryPolicy } from '@deepseek-ai/dsh-llm'
import { Config as PiAiConfig, PiAiAdapter } from '@deepseek-ai/dsh-llm-pi-ai'
import { SettingsProvider } from '@deepseek-ai/dsh-settings'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { createProvider } from '@earendil-works/pi-ai'
import { openAICompletionsApi } from '@earendil-works/pi-ai/api/openai-completions.lazy'
import { enterpriseProviderConfig, normalizeEnterpriseProfile } from '../src/host/profile.js'
import { settingsBase } from '../src/host/provider/core.js'

const require = createRequire(import.meta.url)
const root = new URL('../', import.meta.url)
const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))
const expectedDshVersion = '0.1.2-rc.1'

for (const [name, version] of Object.entries(manifest.peerDependencies)) {
  if (name.startsWith('@deepseek-ai/dsh-')) assert.equal(version, expectedDshVersion, `${name} must use the exact DSH baseline`)
}

const dshLlmPackage = require.resolve('@deepseek-ai/dsh-llm/package.json')
const deepseekScope = dirname(dirname(dshLlmPackage))
const installed = []
for (const entry of await readdir(deepseekScope, { withFileTypes: true })) {
  if (!entry.isDirectory() || !entry.name.startsWith('dsh-')) continue
  const packagePath = join(deepseekScope, entry.name, 'package.json')
  let candidate
  try { candidate = JSON.parse(await readFile(packagePath, 'utf8')) }
  catch { continue }
  installed.push(`${candidate.name}@${candidate.version}`)
  assert.equal(candidate.version, expectedDshVersion, `${candidate.name} is mixed into the rc.1 dependency tree`)
}
assert.ok(installed.length >= 20, 'the locked DSH peer closure is unexpectedly incomplete')

assert.equal(typeof SettingsProvider.prototype.installSection, 'function', 'settings.installSection is unavailable')
assert.equal(typeof LlmRuntime.prototype.registerAdapter, 'function', 'llm.registerAdapter is unavailable')
assert.equal(typeof LlmRuntime.prototype.registerConfigurableProviders, 'function', 'llm.registerConfigurableProviders is unavailable')
assert.equal(typeof PiAiAdapter.prototype.prepareCall, 'function', 'PiAiAdapter.prepareCall is unavailable')
assert.equal(typeof PiAiAdapter.prototype.stream, 'function', 'PiAiAdapter.stream is unavailable')
assert.equal(typeof WebServer.prototype.register, 'function', 'webServer.register is unavailable')
assert.equal(typeof launchEnvironmentOf, 'function', 'launchEnvironmentOf is unavailable')
assert.equal(typeof Remote, 'function', 'Typert Remote decorator is unavailable')
assert.equal(typeof TypertRemoteService, 'function', 'TypertRemoteService is unavailable')
assert.equal(typeof assertUsableApiKey, 'function', 'assertUsableApiKey is unavailable')
assert.equal(typeof resolveImageAttachmentAccess, 'function', 'resolveImageAttachmentAccess is unavailable')
assert.equal(typeof resolveRetryPolicy, 'function', 'resolveRetryPolicy is unavailable')
assert.equal(typeof PiAiConfig, 'function', 'PiAi settings schema is unavailable')
assert.equal(typeof createProvider, 'function', 'pi-ai createProvider is unavailable')
assert.equal(typeof openAICompletionsApi, 'function', 'pi-ai OpenAI Completions adapter is unavailable')
assert.equal(credentialRef('EXAMPLE_AI_API_KEY'), 'EXAMPLE_AI_API_KEY')

const example = normalizeEnterpriseProfile(JSON.parse(await readFile(new URL('examples/enterprise-profile.example.json', root), 'utf8')))
const providerBase = settingsBase(enterpriseProviderConfig(new Map([[example.id, example]])))
assert.doesNotThrow(() => PiAiConfig(providerBase), 'the public Enterprise Profile must satisfy the actual rc.1 PiAi settings schema')
class ProbeSettingsProvider extends SettingsProvider {
  load() { return Promise.resolve({}) }
  persist() { return Promise.resolve() }
}
const settingsCtx = new Context()
const settingsProvider = new ProbeSettingsProvider(settingsCtx)
let providerSource
assert.doesNotThrow(() => settingsProvider.installSection(
  settingsCtx,
  'provider-enterprise',
  PiAiConfig,
  providerBase,
  { setSource(source) { providerSource = source }, onChange() {} },
), 'the public Enterprise Profile must install through the actual rc.1 SettingsProvider')
assert.equal(providerSource().providers['example-ai'].displayName, 'Example AI')
assert.equal(providerSource().providers['example-ai'].models.length, 2)

const clientContracts = [
  ['@deepseek-ai/dsh-api-remotes', 'lib/client.js', '$mount'],
  ['@deepseek-ai/dsh-client-ui-settings-models', 'lib/client.js', 'settings.models.footer'],
  ['@deepseek-ai/dsh-client-ui-settings', 'lib/types/client/contract/slots.d.ts', 'settings.onboarding'],
  ['@deepseek-ai/dsh-client-ui-settings', 'lib/types/client/contract/slots.d.ts', 'settings.general.item'],
  ['@deepseek-ai/dsh-client-ui-settings-general', 'lib/client.js', 'settings.general.item'],
  ['@deepseek-ai/dsh-client-ui-conversation', 'lib/types/client/contract/slots.d.ts', 'conversation.hero.brand.mark'],
  ['@deepseek-ai/dsh-client-ui-sidebar', 'lib/client.js', 'sidebar.brand.mark'],
  ['@deepseek-ai/dsh-client-ui-sidebar', 'lib/client.js', 'sidebar.brand.name'],
  ['@deepseek-ai/dsh-client-ui-sidebar', 'lib/client.js', 'sidebar.footer.action'],
  ['@deepseek-ai/dsh-client-ui-theme', 'lib/client.js', 'overrideTokens'],
]
for (const [name, relativePath, marker] of clientContracts) {
  const packageRoot = dirname(require.resolve(`${name}/package.json`))
  const content = await readFile(join(packageRoot, relativePath), 'utf8')
  assert.ok(content.includes(marker), `${name} no longer exposes ${marker}`)
}
const clientSource = await readFile(new URL('src/client/index.ts', root), 'utf8')
assert.ok(clientSource.includes('enterpriseBrandPriority = -100'), 'enterprise brand slots must explicitly shadow rc.1 official priority 0 occupants')

console.log(`DSH ${expectedDshVersion} Host, Provider, Settings, Typert, WebServer, credentials, attachments, and Client contracts passed (${installed.length} locked DSH packages).`)
