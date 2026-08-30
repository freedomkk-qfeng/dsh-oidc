# Changelog

[简体中文](CHANGELOG.md) | **English**

All notable changes are documented here. The format follows Keep a Changelog principles and the project uses Semantic Versioning with pre-1.0 qualifications described in `docs/compatibility.en.md`.

## [Unreleased]

### Added

- Added bilingual [complete institutional server contract](docs/server-integration-contract.en.md), making OIDC + PKCE, Key Binding, and the model gateway one jointly required institutional delivery.
- Completed open-source cleanup of Chinese-default/English documentation, public repository links, maintainers, and the private security-reporting entry point.

### Changed

- Fixed the Web callback to `http://127.0.0.1:<DSH-port>/oauth/callback`; public `publicBaseURL` and DSH WebServer hosts other than `127.0.0.1` are rejected.
- Examples and tests now use reserved documentation addresses, and the public main branch does not inherit internal development history.

## [0.1.0-alpha.7] - 2026-08-30

### Added

- Development-only network HTTP deployments may explicitly allowlist one exact `insecureDevelopmentOrigin`; HTTPS remains mandatory by default and loopback development behavior is unchanged.

## [0.1.0-alpha.6] - 2026-08-29

### Changed

- Updated the compatibility baseline to DeepSeek Harness `0.1.2-alpha.1` and replaced the removed client runtime peer with the public renderer/session-era packages.
- Enterprise model management now extends the upstream Models page through the official `settings.models.footer` slot; the product no longer needs a fork of the complete model settings page.
- Reviewed pi-ai `0.84.4` through the source release-pack Runtime while retaining a compatible `^0.84.2` peer range.

## [0.1.0-alpha.5] - 2026-08-26

### Changed

- Installation documentation now starts from a reviewed local Git checkout and uses a placeholder GitHub organization until repository ownership is decided.
- Clarified that local-path installation links the checkout into the DSH Profile, does not scan the current workspace, and requires the checkout to remain available.
- Registry installation is documented only as a future path after a reviewed npm publication.

## [0.1.0-alpha.4] - 2026-08-26

### Added

- Direct DSH Bundle installation through `dsh plugin --profile web add dsh-oidc`, backed by a package-owned Web-first `cordis.patch.yml`.
- Complete English and Chinese third-party integration guides covering OIDC registration, Key Binding implementation, Enterprise Profile authoring, Web/native composition, production acceptance, and troubleshooting.

### Changed

- Publishable npm tarballs now include the protocol and deployment documentation needed to operate the plugin without a repository checkout.

## [0.1.0-alpha.3] - 2026-08-25

### Added

- A single capability-aware enterprise provider/model settings component for Web and native DSH compositions, registered through DSH's official `settings.section` extension point.
- Versioned `dsh-oidc/management/v1alpha1` browser projection and optional native add/switch/model-edit/restart operations.
- `models-only` UI mode so desktop products can inherit the shared model settings while retaining separate account, quota, update, and diagnostic surfaces.

### Changed

- Plain Web now presents its trusted Enterprise Profile through the same provider/model UI as Desktop, with mutation actions hidden.
- Authenticated accounts that still need a runtime credential receive an explicit confirm-and-connect action instead of repeating OIDC login.

## [0.1.0-alpha.2] - 2026-08-25

### Changed

- Account surfaces now display the standard OIDC UserInfo `name`, falling back to `sub`, while retaining organization branding as secondary context.
- Native desktop adapters are expected to project the same `userName` identity contract as the Web backend; private management-plane bootstrap data must not replace OIDC identity.

## [0.1.0-alpha.1] - 2026-08-25

### Added

- Standalone `dsh-oidc` package with no ChatECNU private-package dependency.
- OIDC Authorization Code + PKCE Web backend and native account adapter.
- Standard UserInfo identity (`name`, fallback `sub`) with subject binding.
- Fixed `worker-user-center-v1` Key Binding client and OpenAPI contract.
- Declarative Enterprise Profile JSON Schema, branding, Provider/model catalog, and ECNU placeholder example.
- Local DSH/PiAi OpenAI-compatible Provider adapter and `enterpriseTransforms` extension seam.
- Chinese/English account UI fallbacks.
- Security, governance, contribution, compatibility, release, and third-party documentation.

### Security

- Exact callback/public-origin handling, same-origin return path, duplicate callback-parameter rejection.
- Multi-audience `azp`, JWK metadata/uniqueness, required time claims, optional `at_hash`, and UserInfo subject validation.
- HTTPS cross-origin Discovery endpoint support with loopback-only HTTP development exception.
- Bounded profile and network response sizes, strict unknown-key rejection, and SVG data-logo rejection.
