# Getting started: connect enterprise OIDC and models to DSH

[简体中文](getting-started.md) | **English**

This guide is for operators integrating `dsh-oidc` into their own DeepSeek Harness deployment. The result is a closed loop: users sign in through the organization's OIDC Provider, explicitly bind a revocable model runtime credential, inspect the enterprise Provider and model catalog, and call those models from ordinary DSH Web.

`dsh-oidc` is Web-first and does not require Wails or ChatECNU Work. ECNU is only a reference deployment.

## 1. Prerequisites

| Component | Minimum requirement |
| --- | --- |
| DSH Host | DeepSeek Harness `0.1.2-alpha.2` on Node.js 22+. |
| Institutional enterprise-model integration service | One accountable owner jointly delivers the OIDC Provider, fixed Key Binding API, and OpenAI-compatible model gateway; all three are required. |
| Enterprise Profile | Trusted local JSON containing public configuration only. |
| Credential Provider | The current Web backend supports trusted single-user local storage only. |

Have the identity and model-platform teams jointly review the [server API specification](server-integration-contract.en.md). OIDC alone establishes identity; without Key Binding and the model gateway it does not safely complete model authorization. Do not place a shared model API key in an Enterprise Profile.

## 2. Register the OIDC Public Client

Register a public client without a client secret. Its redirect URI must exactly equal:

```text
http://127.0.0.1:3080/oauth/callback
```

`127.0.0.1` and `/oauth/callback` are fixed. `3080` is the recommended DSH port; if the DSH WebServer port changes, the registered URI must use the same port. Do not register `localhost`, a LAN address, or a public address. Discovery must publish `authorization_endpoint`, `token_endpoint`, `jwks_uri`, and `userinfo_endpoint`. UserInfo must contain a non-empty `sub` matching the ID Token; provide the standard `name` claim for a human-readable label. The current release accepts RS256 ID Tokens only.

See the complete [OIDC interoperability profile](oidc-interoperability.en.md).

## 3. Implement the complete institutional service

One institutional delivery must provide the OIDC interface group above, the Key Binding interface group below, and an OpenAI-compatible model gateway that accepts the bound credentials. Internal systems may host different interfaces, but versioning, security, and operations have one accountable integration boundary. See the [server API specification](server-integration-contract.en.md).

The configured `keyBinding.baseURL` has four fixed operations:

```text
GET  /bootstrap
POST /runtime-credential/provision
POST /runtime-credential/resolve
POST /runtime-credential/renew
```

The Profile may additionally use optional `keyBinding.credentialRef` to isolate entries in the local DSH Credential Provider. It is not sent over the network and does not alter these operations. Omit it for an ordinary single-environment deployment; use distinct references when production and test reuse the same Provider ID.

Every request carries the OIDC Access Token as a Bearer credential. The service must validate issuer, audience, expiry, scopes, subject, and organization authorization. It must not trust `provider_id` by itself. Credential responses are `no-store`, and `api_key` must never enter logs, metrics labels, or error details.

Use the normative [Key Binding protocol](key-binding-protocol.en.md) and machine-readable [`protocol/openapi.yaml`](../protocol/openapi.yaml). OIDC and the model gateway use their established interfaces, so this project does not duplicate them in another OpenAPI document.

## 4. Create an Enterprise Profile

Copy [`examples/enterprise-profile.example.json`](../examples/enterprise-profile.example.json) and replace the organization, bounded brand values, OIDC public-client facts, Key Binding base URL, OpenAI-compatible Provider base URL, and model catalog. Configure optional `keyBinding.credentialRef` only when local keys must be isolated across environments.

The Profile is trusted deployment data, not a secret store. It must not contain client secrets, tokens, API keys, signing keys, cookies, or personal records. See the full [Enterprise Profile specification](enterprise-profile.en.md).

## 5. Install into ordinary DSH Web

The package is itself an installable DSH Bundle. Team deployments should install the reviewed, exact version from npm:

```bash
dsh plugin --profile web add dsh-oidc@0.1.0-alpha.10
```

For auditing, development, or testing unpublished changes, install from a local checkout instead:

```bash
git clone https://github.com/freedomkk-qfeng/dsh-oidc.git
cd dsh-oidc
npm ci
npm run check
dsh plugin --profile web add .
```

From the parent directory, the equivalent explicit relative-path command is:

```bash
dsh plugin --profile web add ./dsh-oidc
```

DSH links the checkout into `$DSH_HOME/profiles/web`; it does not scan or copy the invoking directory. Keep the checkout in place and pin a reviewed commit for source-based deployments. To intentionally follow alpha updates, use:

```bash
dsh plugin --profile web add dsh-oidc@alpha
```

Set the trusted local Profile path and start DSH on the fixed loopback host:

```bash
export DSH_OIDC_ENTERPRISE_PROFILE=/etc/dsh/enterprise-profile.json
dsh --profile web --host 127.0.0.1 --port 3080 --no-open
```

The plugin constructs `http://127.0.0.1:<port>/oauth/callback` from the DSH WebServer port. It does not accept `publicBaseURL` and does not infer an address from proxy headers. If the startup port changes, update the OIDC Public Client registration to the same port.

The package's `cordis.patch.yml` mounts one `enterprise-oidc` plugin instance. It does not traverse the current workspace or replace DSH Web, sessions, Workspace, LLM services, the Credential Provider, or other official capabilities. The invoking directory matters only when resolving a relative package path such as `.` or `./dsh-oidc`.

## 6. Advanced product composition

A product-owned Bundle may mount the plugin explicitly instead of using the default package patch:

```yaml
- insert:
    - id: enterprise-oidc
      name: dsh-oidc
      config:
        profilePathEnv: DSH_OIDC_ENTERPRISE_PROFILE
        web:
          returnPath: /
```

Desktop products may use `backend: native`, point `profilePathEnv` at the same standard Enterprise Profile used by Web, and supply the capability-detected `enterpriseAccounts` service. Product-owned institution, tenant, or account catalogs MUST be converted to an Enterprise Profile by the product assembly layer before `dsh-oidc` reads them. Wails, Electron, Tauri, and other hosts can implement that boundary; the plugin depends on neither a desktop framework nor a product catalog format. See [DSH integration](dsh-integration.en.md).

## 7. Acceptance checklist

Before production, verify at least:

1. `dsh --profile web --dump-config` contains exactly one `enterprise-oidc` instance;
2. login and the exact `/oauth/callback` succeed while invalid state and duplicate callback parameters fail;
3. the UI displays standard UserInfo `name`, falling back to stable `sub`;
4. provisioning requires explicit user confirmation;
5. a provisioned model completes a streaming conversation;
6. no API key appears in the Profile, browser configuration, logs, or exported sessions;
7. refresh, expiry, revocation, authorization denial, rate limiting, and backend outage behavior are understandable;
8. logout clears local OIDC and model credentials and attempts standard token revocation;
9. the DSH WebServer listens only on `127.0.0.1` and is not exposed as a shared site through a proxy or port mapping;
10. OIDC, all four Key Binding operations, and the model gateway jointly pass the [server API specification](server-integration-contract.en.md).

The current Web backend does not support shared Web. A shared scenario needs a new host backend with per-user isolation; do not simply relax the loopback restriction. See the [security model](security-model.en.md) and [public release checklist](release-checklist.en.md).

## 8. Troubleshooting

- **Callback fails:** compare the registered URI with `http://127.0.0.1:<DSH-port>/oauth/callback` character for character. Confirm the DSH host is `127.0.0.1` and its actual port matches the registration; do not use `localhost`, a LAN address, or a public address.
- **A subject string is shown instead of a name:** return a non-empty standard `name` from UserInfo under the `profile` scope; private JSON-path mappings are intentionally unsupported.
- **Login works but models do not:** inspect `/bootstrap`, explicit provisioning state, exact `provider_id` equality, and whether the model gateway accepts the bound key.
- **Thinking works but selectable effort does not:** set model `compat.supportsReasoningEffort` to `false`; thinking remains enabled while the unsupported effort parameter is removed.
- **Why the enterprise controls are inside Models:** DSH `0.1.2-alpha.2` exposes the official `settings.models.footer` extension slot. `dsh-oidc` mounts its management UI there and leaves the upstream Models page enabled; no product-private Models-page fork is required.
