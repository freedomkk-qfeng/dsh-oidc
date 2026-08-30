import { readFile } from 'node:fs/promises'

await import('../lib/index.js')
await import('../lib/typert.host.js')
await import('../lib/provider/index.js')

const client = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
if (!client.includes('window.__ModuleLoader__.load') || !client.includes('id: "dsh-oidc"')) {
  throw new Error('lib/client.js does not contain the expected DSH module-loader wrapper')
}

console.log('Host exports and DSH client loader artifact passed smoke checks.')
