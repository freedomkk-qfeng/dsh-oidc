import { z } from 'zod'

const pkg = '@eduwork/dsh-oidc'
const source = { file: 'lib/index.js', line: 1, column: 1 }
const profileId = z.string().min(1).max(64)
const options = z.object({ allowProvision: z.boolean().optional() }).strict()
const baseURL = z.string().min(1).max(2048)
const modelMode = z.enum(['discovery', 'manual'])
const brand = z.object({
  productName: z.string().optional(), organizationName: z.string().optional(), mark: z.string().optional(),
  logoURL: z.string().optional(), primaryColor: z.string().optional(), loginTitle: z.string().optional(),
  loginDescription: z.string().optional(), supportURL: z.string().optional(),
}).strict()
const profile = z.object({
  id: z.string(), displayName: z.string(), organization: z.string(), brand, credentialRef: z.string(),
  provider: z.object({
    id: z.string(), displayName: z.string(),
    models: z.array(z.object({ id: z.string(), name: z.string(), input: z.array(z.enum(['text', 'image'])) }).strict()),
  }).strict(),
}).strict()
const account = z.object({
  profileID: z.string(), displayName: z.string(), organization: z.string(), state: z.string(),
  userName: z.string().optional(), affiliation: z.string().optional(), accessExpiresAt: z.string().optional(),
  credentialRef: z.string(), credentialReady: z.boolean(), credentialState: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
}).strict()
const runtimeModel = z.object({
  id: z.string().min(1).max(256), name: z.string().max(256).optional(), upstreamModelID: z.string().max(256).optional(),
  contextWindow: z.number().int().positive().optional(), maxTokens: z.number().int().positive().optional(),
  input: z.array(z.enum(['text', 'image', 'audio', 'video'])).optional(), reasoning: z.boolean().optional(),
  reasoningEfforts: z.record(z.string(), z.string().nullable()).optional(), compat: z.record(z.string(), z.unknown()).optional(),
}).strict()
const runtimeModels = z.array(runtimeModel).max(128)
const management = z.object({
  schemaVersion: z.literal('dsh-oidc/management/v1alpha1'), mode: z.enum(['profile', 'native']),
  activeProfileID: z.string(), restartRequired: z.boolean(),
  capabilities: z.object({ manageProfiles: z.boolean(), manageModels: z.boolean(), restart: z.boolean() }).strict(),
  profiles: z.array(z.object({
    id: z.string(), displayName: z.string(), organization: z.string(), baseURL: z.string(),
    builtIn: z.boolean(), configured: z.boolean(), enabled: z.boolean(), providerID: z.string(),
    runtime: z.object({
      displayName: z.string(), modelSource: z.string().optional(), reasoning: z.string().optional(),
      defaultContextWindow: z.number().int().positive().optional(), defaultMaxTokens: z.number().int().positive().optional(),
      compat: z.record(z.string(), z.unknown()).optional(), models: runtimeModels,
    }).strict(),
  }).strict()),
}).strict()
const result = (typeSymbol: string, schema: z.ZodType) => ({ mode: 'strict', typeSymbol, schema })
const parameter = (name: string, schema: z.ZodType, typeSymbol: string) => ({
  name, wire: name, source: 'json', codec: result(typeSymbol, schema),
})
const descriptor = (method: string, parameters: unknown[], output: unknown) => ({
  id: `${pkg}#oidcAccounts/${method}`, service: 'oidcAccounts', namespace: 'oidcAccounts', method,
  invocation: { kind: 'direct' }, parameters, result: output, sourceLocation: source,
})
const profileParameter = () => parameter('profileID', profileId, `${pkg}#ProfileID`)

export default {
  package: pkg,
  descriptors: [
    descriptor('configuration', [], result(`${pkg}#Configuration`, z.object({
      schemaVersion: z.literal('dsh-oidc/v1alpha1'), uiMode: z.enum(['standard', 'models-only', 'external']), profiles: z.array(profile),
    }).strict())),
    descriptor('status', [profileParameter()], result(`${pkg}#AccountStatus`, account)),
    descriptor('begin', [profileParameter()], result(`${pkg}#BeginResult`, z.union([
      z.object({ mode: z.literal('redirect'), authorizationURL: z.string().url() }).strict(),
      z.object({ mode: z.literal('completed'), status: account }).strict(),
    ]))),
    descriptor('reconcile', [profileParameter(), parameter('options', options, `${pkg}#ReconcileOptions`)], result(`${pkg}#AccountStatus`, account)),
    descriptor('logout', [profileParameter()], result(`${pkg}#AccountStatus`, account)),
    descriptor('management', [], result(`${pkg}#ManagementConfiguration`, management)),
    descriptor('activate', [profileParameter()], result(`${pkg}#ManagementConfiguration`, management)),
    descriptor('configure', [profileParameter()], result(`${pkg}#ManagementConfiguration`, management)),
    descriptor('addCustom', [parameter('baseURL', baseURL, `${pkg}#BaseURL`)], result(`${pkg}#ManagementConfiguration`, management)),
    descriptor('updateCustom', [profileParameter(), parameter('baseURL', baseURL, `${pkg}#BaseURL`)], result(`${pkg}#ManagementConfiguration`, management)),
    descriptor('removeProfile', [profileParameter()], result(`${pkg}#ManagementConfiguration`, management)),
    descriptor('configureModels', [
      profileParameter(), parameter('modelMode', modelMode, `${pkg}#ModelCatalogMode`),
      parameter('models', runtimeModels, `${pkg}#RuntimeModels`),
    ], result(`${pkg}#ManagementConfiguration`, management)),
    descriptor('restart', [], result(`${pkg}#RestartResult`, z.object({ restarting: z.literal(true) }).strict())),
  ],
}
