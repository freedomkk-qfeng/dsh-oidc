# eduwork npm 作用域迁移

**简体中文** | [English](EDUWORK-MIGRATION.en.md)

从本版本起，npm 包使用 `@eduwork/dsh-oidc@0.1.0-alpha.11`，替代旧的 `dsh-oidc`。npm `eduwork` 组织已创建；GitHub 仓库和本地 checkout 目录继续使用 `dsh-oidc`。包的当前发布状态以 npm registry 为准。

## 安装与迁移

```sh
dsh plugin --profile web add @eduwork/dsh-oidc@0.1.0-alpha.11
```

已有 Profile 先备份 package.json 与 cordis.patch.yml，再更新依赖和 dsh.profile.bundles；手写 patch 的模块路径 name 也需切换。不要同时启用新旧两份插件，切换后重启 Host。旧版本和新作用域版本是不同 npm 包，旧包的更新不会自动迁移安装。

## 数据兼容

保留 `dsh-oidc/v1alpha1`、`oidcAccounts`、凭据引用、Provider 标识和插件行 id；Host 与 Client 的 TYPERT 包归属一起更新。

本次迁移不修改存储目录或用户配置内容。产品管理的 Profile 由产品升级逻辑迁移其受管依赖；社区插件保持原状。

## 发布范围

此版本为 alpha 包身份迁移，沿用声明的 DSH peer 基线。构建、测试、文档、开源和 tarball 检查针对本次变更执行；不新增真实学校登录、真实邮件发送或生产部署验收结论。稳定发布仍须完成公开发布检查表中的完整部署验收。旧包保持可安装，新包安装验证通过后添加迁移提示，不撤回旧版本。
