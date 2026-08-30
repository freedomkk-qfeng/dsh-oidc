import React, { useEffect, useState } from 'react'
import oidcRemote from './remote.js'
import { accountOrganization, accountStatusLine, accountUserName } from './presentation.js'
import { ManagedProviderCard } from './managed-provider.js'

export const inject = ['slots', 'remote', 'theme']

const h = React.createElement
const border = 'var(--dsw-alias-border-l2, #e5d4cc)'
const button = Object.freeze({
  border: `1px solid ${border}`, borderRadius: 9, padding: '8px 12px', cursor: 'pointer',
  background: 'var(--dsw-alias-bg-layer-1, #fff)', color: 'var(--dsw-alias-label-primary, #241a18)',
})
const isChinese = typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('zh')
const messages = isChinese ? {
  unavailable: '企业模型服务暂时不可用', connected: '已连接', authenticated: '身份认证完成，等待创建模型凭据',
  disconnected: '尚未连接', description: '使用组织统一身份认证连接企业模型。密码不会进入 DSH；模型请求只使用绑定后的运行凭据。',
  connecting: '正在连接…', login: '使用企业账号登录', provisioning: '正在创建…', provision: '确认创建模型凭据',
  checking: '正在检查…', check: '检查连接', logout: '退出登录', help: '帮助', dialog: '连接企业模型',
  shortDescription: '通过组织统一身份认证连接企业模型；密码不会进入 DSH。', other: '使用其他模型',
  enabled: '完成后将启用', footerConnected: '企业模型已连接', footerAuthenticated: '身份认证完成，等待创建模型凭据', footerSetup: '点击设置完成登录',
} : {
  unavailable: 'Enterprise model service is temporarily unavailable', connected: 'Connected',
  authenticated: 'Identity verified; model credential is not provisioned', disconnected: 'Not connected',
  description: 'Connect with your organization account. Your password never enters DSH; model requests use only the bound runtime credential.',
  connecting: 'Connecting…', login: 'Sign in with organization', provisioning: 'Provisioning…', provision: 'Provision model credential',
  checking: 'Checking…', check: 'Check connection', logout: 'Sign out', help: 'Help', dialog: 'Connect enterprise models',
  shortDescription: 'Connect enterprise models through your organization identity provider. Your password never enters DSH.',
  other: 'Use another model', enabled: 'This enables', footerConnected: 'Enterprise models connected',
  footerAuthenticated: 'Identity verified; provision a model credential', footerSetup: 'Open settings to connect',
}

async function unwrap(operation: Promise<any>) {
  const result = await operation
  if (result?.ok === true) return result.value
  throw new Error(result?.error?.message || result?.error?.code || messages.unavailable)
}

function ProductMark({ profile, size = 24 }: any) {
  const brand = profile.brand ?? {}
  if (brand.logoURL) return h('img', { src: brand.logoURL, width: size, height: size, alt: '', referrerPolicy: 'no-referrer', style: { display: 'block', objectFit: 'contain', borderRadius: 5 } })
  return h('span', {
    'aria-hidden': 'true',
    style: {
      display: 'grid', placeItems: 'center', width: size, height: size, borderRadius: Math.max(5, Math.round(size * .18)),
      background: brand.primaryColor || '#5157af', color: 'white', fontSize: Math.max(11, Math.round(size * .52)), fontWeight: 750,
    },
  }, brand.mark || accountOrganization(profile).slice(0, 1))
}

function ProductName({ profile }: any) {
  return h('span', { style: { fontWeight: 650, fontSize: 15, whiteSpace: 'nowrap' } }, profile.brand?.productName || profile.displayName)
}

function installBrand(ctx: any, profile: any) {
  const brand = profile.brand ?? {}
  const productName = brand.productName || profile.displayName
  const previousTitle = document.title
  document.title = productName
  let clearTokens = () => {}
  if (brand.primaryColor) {
    const pair = (light: string, dark: string) => ({ light, dark })
    clearTokens = ctx.theme.overrideTokens('dsh-oidc', {
      '--dsw-alias-brand-primary': pair(brand.primaryColor, brand.primaryColor),
      '--dsw-alias-brand-primary-new-colorprimary-new-color': pair(brand.primaryColor, brand.primaryColor),
      '--dsw-alias-button-primary-fill': pair(brand.primaryColor, brand.primaryColor),
      '--dsw-alias-state-business-primary': pair(brand.primaryColor, brand.primaryColor),
      '--dsw-alias-label-primary-bluish': pair(brand.primaryColor, brand.primaryColor),
    })
  }
  const effects = [
    ctx.slots.inject('sidebar.brand.mark', () => ctx.slots.register({ name: 'sidebar.brand.mark', inject: () => ({ profile }) }, ProductMark)),
    ctx.slots.inject('sidebar.brand.name', () => ctx.slots.register({ name: 'sidebar.brand.name', inject: () => ({ profile }) }, ProductName)),
    ctx.slots.inject('conversation.hero.brand.mark', () => ctx.slots.register({ name: 'conversation.hero.brand.mark', inject: () => ({ profile }) }, ProductMark)),
  ]
  return () => {
    for (const dispose of effects.reverse()) dispose?.()
    clearTokens()
    if (document.title === productName) document.title = previousTitle
  }
}

function useAccount(service: any, profileID: string) {
  const [status, setStatus] = useState<any>(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const refresh = async () => setStatus(await service.status(profileID))
  useEffect(() => { refresh().catch((cause: any) => setError(cause?.message || String(cause))) }, [profileID])
  const run = async (name: string, operation: () => Promise<any>) => {
    setBusy(name); setError('')
    try { setStatus(await operation()) }
    catch (cause: any) { setError(cause?.message || String(cause)) }
    finally { setBusy('') }
  }
  return { status, busy, error, run }
}

function EnterpriseAccountCard({ service, configuration }: any) {
  const [profileID, setProfileID] = useState(configuration.profiles[0]?.id || '')
  const profile = configuration.profiles.find((candidate: any) => candidate.id === profileID) || configuration.profiles[0]
  const account = useAccount(service, profile.id)
  const primary = { ...button, background: profile.brand?.primaryColor || 'var(--dsw-alias-brand-primary, #5157af)', color: 'white', borderColor: 'transparent' }
  const begin = () => account.run('login', async () => {
    const result = await service.begin(profile.id)
    if (result.mode === 'redirect') { window.location.assign(result.authorizationURL); return account.status }
    return result.status
  })
  const stateLabel = account.status?.credentialReady ? messages.connected
    : account.status?.state === 'authenticated' ? messages.authenticated : messages.disconnected
  const userName = accountUserName(account.status)
  return h('section', { style: { padding: '16px 0', borderBottom: `1px solid ${border}` } },
    h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' } },
      h('div', { style: { display: 'flex', gap: 10, minWidth: 0 } },
        h(ProductMark, { profile, size: 36 }),
        h('div', null,
          h('strong', { style: { display: 'block', fontSize: 14 } }, userName || profile.displayName),
          h('span', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 12 } }, accountStatusLine(profile, stateLabel, userName)))),
      configuration.profiles.length > 1 && h('select', { value: profile.id, onChange: (event: any) => setProfileID(event.currentTarget.value), style: button },
        ...configuration.profiles.map((candidate: any) => h('option', { key: candidate.id, value: candidate.id }, candidate.displayName)))),
    h('p', { style: { margin: '12px 0 0', color: 'var(--dsw-alias-label-secondary)', fontSize: 12, lineHeight: 1.6 } },
      profile.brand?.loginDescription || messages.description),
    h('div', { style: { marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' } },
      !account.status?.credentialReady && account.status?.state !== 'authenticated' && h('button', { type: 'button', disabled: Boolean(account.busy), style: primary, onClick: begin }, account.busy ? messages.connecting : messages.login),
      !account.status?.credentialReady && account.status?.state === 'authenticated' && h('button', {
        type: 'button', disabled: Boolean(account.busy), style: primary,
        onClick: () => account.run('provision', () => service.reconcile(profile.id, { allowProvision: true })),
      }, account.busy ? messages.provisioning : messages.provision),
      account.status?.credentialReady && h('button', {
        type: 'button', disabled: Boolean(account.busy), style: button,
        onClick: () => account.run('reconcile', () => service.reconcile(profile.id, { allowProvision: false })),
      }, account.busy ? messages.checking : messages.check),
      account.status?.state !== 'signed_out' && h('button', {
        type: 'button', disabled: Boolean(account.busy), style: button,
        onClick: () => account.run('logout', () => service.logout(profile.id)),
      }, messages.logout),
      profile.brand?.supportURL && h('a', { href: profile.brand.supportURL, target: '_blank', rel: 'noopener noreferrer', style: { ...button, textDecoration: 'none' } }, messages.help)),
    account.error && h('p', { role: 'alert', style: { margin: '10px 0 0', color: '#a82332', fontSize: 12 } }, account.error),
    h('p', { style: { margin: '10px 0 0', color: 'var(--dsw-alias-label-tertiary)', fontSize: 11 } },
      `${profile.provider.displayName} · ${profile.provider.models.map((model: any) => model.name).join('、')}`))
}

function EnterpriseOnboarding({ service, configuration, complete }: any) {
  const profile = configuration.profiles[0]
  const account = useAccount(service, profile.id)
  useEffect(() => { if (account.status?.credentialReady) complete() }, [account.status?.credentialReady, complete])
  if (account.status === null || account.status?.credentialReady) return null
  const primary = { ...button, background: profile.brand?.primaryColor || 'var(--dsw-alias-brand-primary, #5157af)', color: 'white', borderColor: 'transparent' }
  const begin = () => account.run('login', async () => {
    const result = await service.begin(profile.id)
    if (result.mode === 'redirect') { window.location.assign(result.authorizationURL); return account.status }
    return result.status
  })
  return h('div', {
    style: { position: 'fixed', inset: 0, zIndex: 10000, display: 'grid', placeItems: 'center', padding: 24, background: 'rgba(28, 24, 23, .32)', backdropFilter: 'blur(4px)', boxSizing: 'border-box' },
  }, h('section', {
    role: 'dialog', 'aria-modal': 'true', 'aria-label': profile.brand?.loginTitle || messages.dialog,
    style: { boxSizing: 'border-box', width: 'min(540px, 100%)', maxHeight: 'calc(100vh - 48px)', overflow: 'auto', border: `1px solid ${border}`, borderRadius: 16, padding: 26, background: 'var(--dsw-alias-bg-layer-1, #fff)', color: 'var(--dsw-alias-label-primary, #241a18)', boxShadow: '0 24px 80px rgba(42, 28, 24, .22)' },
  },
  h('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
    h(ProductMark, { profile, size: 40 }),
    h('div', null,
      h('h2', { style: { margin: 0, fontSize: 20, fontWeight: 650 } }, profile.brand?.loginTitle || messages.dialog),
      h('div', { style: { marginTop: 3, color: 'var(--dsw-alias-label-secondary)', fontSize: 12 } }, accountOrganization(profile)))),
  h('p', { style: { margin: '18px 0 0', color: 'var(--dsw-alias-label-secondary)', fontSize: 13, lineHeight: 1.7 } },
    profile.brand?.loginDescription || messages.shortDescription),
  h('div', { style: { marginTop: 20, display: 'flex', gap: 9, flexWrap: 'wrap' } },
    account.status?.state !== 'authenticated' && h('button', { type: 'button', disabled: Boolean(account.busy), style: primary, onClick: begin }, account.busy ? messages.connecting : messages.login),
    account.status?.state === 'authenticated' && h('button', {
      type: 'button', disabled: Boolean(account.busy), style: primary,
      onClick: () => account.run('provision', () => service.reconcile(profile.id, { allowProvision: true })),
    }, account.busy ? messages.provisioning : messages.provision),
    h('button', { type: 'button', disabled: Boolean(account.busy), style: button, onClick: complete }, messages.other)),
  account.error && h('p', { role: 'alert', style: { margin: '12px 0 0', color: '#a82332', fontSize: 12 } }, account.error),
  h('p', { style: { margin: '16px 0 0', color: 'var(--dsw-alias-label-tertiary)', fontSize: 11, lineHeight: 1.55 } },
    `${messages.enabled} ${profile.provider.displayName}: ${profile.provider.models.map((model: any) => model.name).join('、')}`)))
}

function FooterAccount({ service, configuration }: any) {
  const profile = configuration.profiles[0]
  const [status, setStatus] = useState<any>(null)
  useEffect(() => { service.status(profile.id).then(setStatus).catch(() => {}) }, [profile.id])
  const userName = accountUserName(status)
  const statusLabel = status?.credentialReady ? messages.footerConnected
    : status?.state === 'authenticated' ? messages.footerAuthenticated : messages.footerSetup
  return h('div', { style: { display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 } },
    h(ProductMark, { profile, size: 28 }),
    h('div', { style: { minWidth: 0 } },
      h('div', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 600 } }, userName || accountOrganization(profile)),
      h('div', { style: { fontSize: 10, color: 'var(--dsw-alias-label-tertiary)' } }, accountStatusLine(profile, statusLabel, userName))))
}

export async function apply(ctx: any) {
  const disposeRemote = await ctx.remote.$mount(oidcRemote)
  ctx.inject(['remote.oidcAccounts'], (surfaceCtx: any) => {
    let cancelled = false
    let disposeBrand = () => {}
    const disposers: Array<() => void> = []
    const service = {
      configuration: () => unwrap(surfaceCtx.remote.oidcAccounts.configuration()),
      status: (profileID: string) => unwrap(surfaceCtx.remote.oidcAccounts.status(profileID)),
      begin: (profileID: string) => unwrap(surfaceCtx.remote.oidcAccounts.begin(profileID)),
      reconcile: (profileID: string, options: any) => unwrap(surfaceCtx.remote.oidcAccounts.reconcile(profileID, options)),
      logout: (profileID: string) => unwrap(surfaceCtx.remote.oidcAccounts.logout(profileID)),
      management: () => unwrap(surfaceCtx.remote.oidcAccounts.management()),
      activate: (profileID: string) => unwrap(surfaceCtx.remote.oidcAccounts.activate(profileID)),
      configure: (profileID: string) => unwrap(surfaceCtx.remote.oidcAccounts.configure(profileID)),
      addCustom: (baseURL: string) => unwrap(surfaceCtx.remote.oidcAccounts.addCustom(baseURL)),
      updateCustom: (profileID: string, baseURL: string) => unwrap(surfaceCtx.remote.oidcAccounts.updateCustom(profileID, baseURL)),
      removeProfile: (profileID: string) => unwrap(surfaceCtx.remote.oidcAccounts.removeProfile(profileID)),
      configureModels: (profileID: string, modelMode: string, models: any[]) => unwrap(surfaceCtx.remote.oidcAccounts.configureModels(profileID, modelMode, models)),
      restart: () => unwrap(surfaceCtx.remote.oidcAccounts.restart()),
    }
    service.configuration().then((configuration: any) => {
      if (cancelled || configuration.uiMode === 'external') return
      disposers.push(surfaceCtx.slots.inject('settings.models.footer', () => surfaceCtx.slots.register({
        name: 'settings.models.footer', id: 'dsh-oidc-enterprise', order: -100,
        inject: () => ({ service, configuration }),
      }, ManagedProviderCard)))
      if (configuration.uiMode === 'models-only' || configuration.profiles.length === 0) return
      disposeBrand = installBrand(surfaceCtx, configuration.profiles[0])
      disposers.push(surfaceCtx.slots.inject('settings.onboarding', () => surfaceCtx.slots.register({
        name: 'settings.onboarding', id: 'dsh-oidc-enterprise', order: -10,
        inject: () => ({ service, configuration }),
      }, EnterpriseOnboarding)))
      disposers.push(surfaceCtx.slots.inject('sidebar.footer.action', () => surfaceCtx.slots.register({
        name: 'sidebar.footer.action', id: 'dsh-oidc-account', order: -90,
        inject: () => ({ service, configuration }),
      }, FooterAccount)))
      disposers.push(surfaceCtx.slots.inject('settings.general.item', () => surfaceCtx.slots.register({
        name: 'settings.general.item', id: 'dsh-oidc-account', order: 10,
        inject: () => ({ service, configuration }),
      }, EnterpriseAccountCard)))
    }).catch((cause: any) => { console.error('dsh-oidc client initialization failed', cause) })
    surfaceCtx.effect(() => () => {
      cancelled = true
      for (const dispose of disposers.reverse()) dispose?.()
      disposeBrand()
    }, 'dsh-oidc: client surfaces')
  })
  return async () => { await disposeRemote() }
}
