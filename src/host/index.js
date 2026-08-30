import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { apply as applyEnterpriseProvider } from './provider/index.js'
import { NativeOidcBackend, WebOidcBackend } from './oidc.js'
import { enterpriseProviderConfig, loadEnterpriseProfiles, publicProfile } from './profile.js'

export const name = 'dsh-oidc'
const remoteInitializers = []

export class OidcAccountService extends TypertRemoteService {
  static inject = ['credentials', 'llm', 'webServer']

  constructor(ctx, config = {}) {
    super(ctx, 'oidcAccounts')
    for (const initialize of remoteInitializers) initialize.call(this)
    this.profiles = loadEnterpriseProfiles(config)
    if (this.profiles.size === 0 && config.allowEmptyProfiles !== true) throw new Error('dsh-oidc requires at least one Enterprise Profile')
    this.uiMode = ['external', 'models-only'].includes(config.uiMode) ? config.uiMode : 'standard'
    applyEnterpriseProvider(ctx, enterpriseProviderConfig(this.profiles))
    this.backend = config.backend === 'native'
      ? new NativeOidcBackend(ctx, this.profiles)
      : new WebOidcBackend(ctx, this.profiles, config.web ?? {})
  }

  configuration() {
    return Promise.resolve({
      schemaVersion: 'dsh-oidc/v1alpha1',
      uiMode: this.uiMode,
      profiles: [...this.profiles.values()].map(publicProfile),
    })
  }

  status(profileID) { return this.backend.status(profileID) }
  begin(profileID) { return this.backend.begin(profileID) }
  reconcile(profileID, options) { return this.backend.reconcile(profileID, options) }
  logout(profileID) { return this.backend.logout(profileID) }
  management() { return this.backend.management() }
  activate(profileID) { return this.backend.activate(profileID) }
  configure(profileID) { return this.backend.configure(profileID) }
  addCustom(baseURL) { return this.backend.addCustom(baseURL) }
  updateCustom(profileID, baseURL) { return this.backend.updateCustom(profileID, baseURL) }
  removeProfile(profileID) { return this.backend.removeProfile(profileID) }
  configureModels(profileID, modelMode, models) { return this.backend.configureModels(profileID, modelMode, models) }
  restart() { return this.backend.restart() }
}

for (const method of [
  'configuration', 'status', 'begin', 'reconcile', 'logout', 'management',
  'activate', 'configure', 'addCustom', 'updateCustom', 'removeProfile', 'configureModels', 'restart',
]) {
  Remote(method)(OidcAccountService.prototype[method], {
    kind: 'method', name: method, static: false, private: false,
    addInitializer(initializer) { remoteInitializers.push(initializer) },
  })
}

export default OidcAccountService
export { enterpriseProviderConfig, loadEnterpriseProfiles, normalizeEnterpriseProfile, publicProfile } from './profile.js'
export { NativeOidcBackend, WebOidcBackend } from './oidc.js'
export { EnterpriseModelTransforms } from './provider/transforms.js'
