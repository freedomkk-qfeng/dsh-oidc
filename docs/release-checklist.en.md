# Public release checklist

[简体中文](release-checklist.md) | **English**

Record reviewer names, date, command output links, and exceptions in the release pull request. An unchecked item blocks public release unless a maintainer and security maintainer document why it is not applicable.

## Authority and project metadata

- [ ] Repository owner confirmed public release and the MIT license.
- [ ] The `freedomkk-qfeng/dsh-oidc` remote and ownership of the `@eduwork/dsh-oidc` npm package are confirmed.
- [ ] Maintainer, security, and release-manager rosters recorded with backups.
- [ ] GitHub Private Vulnerability Reporting is enabled and its entry point has been checked without sensitive data.
- [ ] ECNU/ChatECNU name, example text, colors, and trademark notice approved.

## Source and protocol review

- [ ] Two-person review completed for OIDC, Key Binding, model-gateway invariants, Profile validation, Provider credentials, and native boundary.
- [ ] Enterprise Profile JSON Schema matches runtime behavior.
- [ ] OpenAPI matches normative Key Binding prose and implementation.
- [ ] OIDC standard references and limitations are current.
- [ ] No unnecessary local reimplementation of a supported DSH capability.
- [ ] Compatibility matrix and changelog updated.

## Security and privacy

- [ ] Threat model reviewed for actual topology.
- [ ] Single-user versus multi-user Credential Provider boundary verified.
- [ ] OIDC success and negative conformance suite passed against staging.
- [ ] Cross-user/tenant Key Binding authorization tests passed.
- [ ] API-key expiry, rotation, suspension, and remote revocation behavior tested.
- [ ] Confirmed the WebServer listens only on `127.0.0.1` and no reverse proxy, port forward, or tunnel exposes the local session to other users.
- [ ] Remote TLS, CSP, cookies, CSRF, egress, clock, logging, APM, and backups reviewed.
- [ ] Privacy/legal review completed for identity and audit data.
- [ ] Secret scans of both the current tree and publishable Git history found no production hosts, IDs, keys, logs, personal paths, or personal data.

## Supply chain

- [ ] Clean `npm ci` and `npm run check` completed on Windows and Linux with Node 22 and 24.
- [ ] `npm audit` and static analysis reviewed (not merely run).
- [ ] Every direct/transitive license and exception reviewed.
- [ ] npm install scripts reviewed; unexpected scripts denied.
- [ ] Lockfile diff reviewed and dependency versions pinned as intended.
- [ ] GitHub Actions pinned to immutable commits before public release.

## Product acceptance

- [ ] Plain Web DSH: login, callback, display name/sub fallback, provision, model call, refresh, check, logout.
- [ ] Native desktop: current ChatECNU Work experience unchanged.
- [ ] Native multimodal and text-only + image-transform routes tested.
- [ ] Unsupported reasoning-effort model still runs with thinking enabled.
- [ ] Failure UX tested: Discovery, token, UserInfo, bootstrap, policy denial, model key, expiry, network timeout.

## Build and publish

- [ ] `npm run check` passes from a clean checkout.
- [ ] `npm pack --dry-run` and extracted tarball reviewed; only intended files included.
- [ ] Source maps contain no private absolute paths or secrets.
- [ ] Tag/release notes/checksums prepared.
- [ ] npm Trusted Publisher is bound to repository `freedomkk-qfeng/dsh-oidc`, workflow `release.yml`, and environment `npm`; until that binding exists, the manual workflow is run only with `publish=false`.
- [ ] The publish job uses pinned npm CLI `11.6.2` (meeting Trusted Publishing's npm `>=11.5.1` and Node `>=22.14.0` requirements), and this commit's Windows/Linux × Node 22/24 CI is successful.
- [ ] Publication uses an explicitly supplied existing `v<package version>` tag and `publish=true`; the workflow verifies the tag, commit, tarball identity, and SHA-256 before publishing with provenance and no long-lived local publish token.
- [ ] Rollback/deprecation and vulnerability-notification plan confirmed.
