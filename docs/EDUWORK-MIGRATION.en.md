# eduwork npm scope migration

[简体中文](EDUWORK-MIGRATION.md) | **English**

Starting with this version, the npm package is `@eduwork/dsh-oidc@0.1.0-alpha.11`, replacing `dsh-oidc`. The npm `eduwork` organization exists. The GitHub repository and checkout directory remain `dsh-oidc`. Consult the npm registry for current publication status.

## Installation and migration

```sh
dsh plugin --profile web add @eduwork/dsh-oidc@0.1.0-alpha.11
```

Back up an existing Profile's package.json and cordis.patch.yml, then update its dependency and dsh.profile.bundles entries. Update module name paths in custom patches too. Do not enable both package identities together; restart the Host after switching. These are separate npm packages, so updating the old package cannot migrate an installation automatically.

## Data compatibility

Keep `dsh-oidc/v1alpha1`, `oidcAccounts`, credential references, Provider identities and plugin row ids. Host and Client TYPERT package identities change together.

Storage directories and user configuration content do not change. Product-managed Profiles migrate their owned dependencies through the product upgrader; community plugins remain unchanged.

## Release scope

This is an alpha package-identity migration retaining the declared DSH peer baseline. Build, tests, documentation, license and tarball checks cover this change. It adds no claims of real institutional sign-in, real email delivery or production acceptance. Stable releases still require the complete deployment checks. Keep previous versions installable and add a migration notice only after the new package passes installation validation.
