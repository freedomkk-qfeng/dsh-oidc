import {
  accountResult, baseURLSchema, beginResult, configurationResult, jsonParameter, managementResult,
  modelCatalogModeSchema, profileIdSchema, reconcileOptionsSchema, restartResult, runtimeModelsSchema,
} from './typert-schemas.js'

const pkg = '@eduwork/dsh-oidc'
const source = { file: 'lib/index.js', line: 1, column: 1 }
const profile = () => jsonParameter('profileID', profileIdSchema, `${pkg}#ProfileID`)
const options = () => jsonParameter('options', reconcileOptionsSchema, `${pkg}#ReconcileOptions`)
const baseURL = () => jsonParameter('baseURL', baseURLSchema, `${pkg}#BaseURL`)
const modelMode = () => jsonParameter('modelMode', modelCatalogModeSchema, `${pkg}#ModelCatalogMode`)
const models = () => jsonParameter('models', runtimeModelsSchema, `${pkg}#RuntimeModels`)
const descriptor = (method, parameters, result) => ({
  id: `${pkg}#oidcAccounts/${method}`, service: 'oidcAccounts', namespace: 'oidcAccounts', method,
  invocation: { kind: 'direct' }, parameters, result, sourceLocation: source,
})

export const TYPERT = {
  package: pkg, face: 'host', schemas: [],
  invocations: [
    descriptor('configuration', [], configurationResult),
    descriptor('status', [profile()], accountResult),
    descriptor('begin', [profile()], beginResult),
    descriptor('reconcile', [profile(), options()], accountResult),
    descriptor('logout', [profile()], accountResult),
    descriptor('management', [], managementResult),
    descriptor('activate', [profile()], managementResult),
    descriptor('configure', [profile()], managementResult),
    descriptor('addCustom', [baseURL()], managementResult),
    descriptor('updateCustom', [profile(), baseURL()], managementResult),
    descriptor('removeProfile', [profile()], managementResult),
    descriptor('configureModels', [profile(), modelMode(), models()], managementResult),
    descriptor('restart', [], restartResult),
  ],
  model: { services: [], events: [], objects: [] },
}

export default TYPERT
