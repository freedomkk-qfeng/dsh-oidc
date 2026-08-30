# Compatibility and release policy

[简体中文](compatibility.md) | **English**

## Tested matrix

| dsh-oidc | Node.js | DSH | pi-ai | Status |
| --- | --- | --- | --- | --- |
| `0.1.0-alpha.8` | 22, 24 | `0.1.2-alpha.1` / `cd5ef814…` | `^0.84.2` (`0.84.4` in the reviewed source Runtime) | Shared Web/native Profile credential-reference rule, production/test local-key isolation, and fail-closed native mismatch handling. |
| `0.1.0-alpha.7` | 22, 24 | `0.1.2-alpha.1` / `cd5ef814…` | `^0.84.2` (`0.84.4` in the reviewed source Runtime) | An exact network HTTP origin may be allowed for development; production remains HTTPS-only. |
| `0.1.0-alpha.6` | 22, 24 | `0.1.2-alpha.1` / `cd5ef814…` | `^0.84.2` (`0.84.4` in the reviewed source Runtime) | Uses the upstream Models page and official `settings.models.footer`; validate through a source release-pack until matching npm packages are published. |
| `0.1.0-alpha.5` | 22, 24 (development) | `0.1.1-rc.2` / `b150a551…` | `0.82.1` | Local-checkout-first installation documentation; runtime behavior is unchanged from alpha.4. |
| `0.1.0-alpha.4` | 22, 24 (development) | `0.1.1-rc.2` / `b150a551…` | `0.82.1` | Direct DSH Web Bundle installation and complete third-party deployment documentation; product/Web acceptance completed in the ECNU reference composition. |
| `0.1.0-alpha.3` | 22, 24 (development) | `0.1.1-rc.2` / `b150a551…` | `0.82.1` | Shared Web/native enterprise-model settings and native capability adapter; end-to-end product acceptance pending. |
| `0.1.0-alpha.2` | 22, 24 (development) | `0.1.1-rc.2` / `b150a551…` | `0.82.1` | Standard UserInfo name presentation unified across Web and native adapters; real deployment acceptance pending. |
| `0.1.0-alpha.1` | 22, 24 (development) | `0.1.1-rc.2` / `b150a551…` | `0.82.1` | Unit/build/package baseline; real deployment acceptance still required. |

Only exact DSH peer versions in `package.json` are supported. Other versions may install only after explicit peer override and are untested.

## Contract versions

- Enterprise Profile: `dsh-oidc/v1alpha1`
- Key Binding: `worker-user-center-v1`
- Typert package/namespace: `dsh-oidc` / `oidcAccounts`
- Browser management projection: `dsh-oidc/management/v1alpha1`
- Callback path: `/oauth/callback`
- Provider transform service: `enterpriseTransforms`
- Legacy-compatible Provider settings namespace: `provider-enterprise`

Changing any item above requires compatibility analysis and, where wire-visible, a new contract version.

## Project semver

Before `1.0.0`, minor versions may contain incompatible alpha contract changes, but release notes and migration instructions are required. Patch versions must be backward compatible within the same documented contract version.

After `1.0.0`:

- additive optional profile fields and error codes may be minor releases;
- removing/renaming fields, changing fixed paths, callback path, default credential derivation, or identity rules requires a major release or a separately versioned contract;
- security hardening that rejects previously accepted unsafe input may ship in a minor or patch release with prominent notice.

## Release gates

No public tag/npm publish until all of the following pass:

- `npm ci` from a clean checkout;
- `npm run check` on Windows and Linux;
- CodeQL or equivalent static analysis;
- dependency/license and install-script review;
- secret/production-endpoint scan;
- npm tarball content review;
- plain Web end-to-end acceptance;
- native desktop no-regression acceptance;
- OIDC negative tests and Key Binding authorization tests;
- documentation/version/changelog update;
- two-person review for authentication, credential, build, or release workflow changes.

See [the public release checklist](release-checklist.en.md) for the operator checklist.
