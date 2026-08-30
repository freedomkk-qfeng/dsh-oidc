# Governance

[简体中文](GOVERNANCE.md) | **English**

## Project ownership

`dsh-oidc` is initiated and hosted by [@freedomkk-qfeng](https://github.com/freedomkk-qfeng). The project remains institution-neutral: an institution's names, trademarks, service addresses, and Client IDs belong only in authorized deployment configuration and must not become protocol defaults.

## Roles

- **Maintainers** merge ordinary changes, triage issues, and manage compatibility.
- **Security maintainers** review authentication, authorization, credential, build, and release changes and handle private reports.
- **Release managers** control protected tags, npm publishing, provenance, and rollback.

The current roster is in [`MAINTAINERS.en.md`](MAINTAINERS.en.md). One person may hold multiple roles initially; release and security-recovery backups should be added before the first stable and public npm release. Security-sensitive changes should receive independent review whenever possible.

## Decision process

- Ordinary implementation decisions use pull-request review.
- Public contract, trust-boundary, dependency strategy, or governance changes require an Architecture Decision Record in `docs/decisions/`.
- Backward-incompatible changes require migration documentation and the versioning process in `docs/compatibility.en.md`.
- Maintainers seek rough consensus; unresolved security and interoperability concerns block release until addressed or explicitly accepted in a documented decision.

## Review and merge

- At least one approval for ordinary docs/tests/UI changes.
- At least two approvals for OIDC, Key Binding, Profile validation, secrets, native boundary, workflows, dependencies, or releases.
- Authors may not be the only approver of their security-sensitive change.
- CI, required review, and branch protection must be enabled on the public remote.

## Releases

- Release managers publish signed/protected tags only after `docs/release-checklist.en.md` is completed.
- npm publishing uses short-lived trusted publishing/OIDC and provenance where available, not a long-lived token on a workstation.
- A release record includes checksums, compatibility matrix, changelog, known limitations, and rollback guidance.
- A compromised or unsafe release is deprecated promptly; secrets are rotated and users are notified through the security policy.

## Branding and neutrality

The project may document ECNU as a reference implementation while keeping the protocol institution-neutral. Merging another organization's example does not imply endorsement. Trademarks and logos require their owners' permission and are not granted by the MIT code license.
