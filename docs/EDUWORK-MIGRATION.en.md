# eduwork npm scope migration

[简体中文](EDUWORK-MIGRATION.md) | **English**

The user selected the `@eduwork` scope. This source candidate is `@eduwork/dsh-oidc@0.1.0-alpha.11`; it has not been published. As checked on 2026-09-05, the organization has not been created and local npm authentication is invalid. Existing unscoped releases remain available.

## Compatibility

The npm identity, module-loader identity and package imports move together. OIDC RPC package metadata changes on both Host and Client. Persisted OIDC profile schema, credential references and provider IDs retain their previous values; Mail retains its settings namespace and attachment directory. Repository names and paths are unchanged.

After the scoped release is verified, install it with `dsh plugin --profile web add @eduwork/dsh-oidc@0.1.0-alpha.11`. For an existing Profile, back up package.json and cordis.patch.yml, replace the old package key and bundle entry with the scoped name, and update module names in custom patch rows. Keep row IDs, settings and user files. Restart the host and do not enable both packages simultaneously. The main product migrates its owned package entries; unrelated community plugins remain intact.

## Release prerequisites

Create and verify ownership of the npm eduwork organization, restore authentication, inspect and test the fixed tarball, and publish it with public access. Only after the new release is available should maintainers decide the old release maintenance window and migration notice. No registry deprecation, unpublishing, or user installation migration has been performed in this source change.
