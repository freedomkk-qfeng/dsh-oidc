# eduwork npm 作用域迁移

**简体中文** | [English](EDUWORK-MIGRATION.en.md)

用户已确定统一使用 `@eduwork`。本仓库候选为 `@eduwork/dsh-oidc@0.1.0-alpha.11`，尚未发布；2026-09-05 检查时组织尚未创建，本机 npm 认证失效。旧 npm 包保留可安装，不能把本地改名视为线上迁移完成。

## 包身份与数据兼容

新的 npm 包名、客户端 ModuleLoader 标识、安装引用使用作用域。GitHub 仓库与目录名仍为 `dsh-oidc`。OIDC 的 `dsh-oidc/v1alpha1` 配置协议、凭据和 Provider 标识，Mail 的 `dsh-mail-assistant` 设置命名空间及附件目录，Studio 的设置命名空间、知识库和成果目录保留既有标识。RPC 的包归属在 Host 与 Client 两侧一起更新；切换后需重启宿主。

## 安装与迁移

新包经发布验证后，新的安装使用：

```sh
dsh plugin --profile web add @eduwork/dsh-oidc@0.1.0-alpha.11
```

已有 Profile 应先备份其 package.json 与 cordis.patch.yml，再将 dependencies 和 dsh.profile.bundles 中旧包名替换为新包名；用户手写 patch 中作为模块路径的 name 也须更新。保留插件行 id、配置内容和用户数据，不要同时启用新旧两份插件。ChatECNU Work 的产品管理 Profile 由主线迁移代码接管其受管包项，社区其他插件不随本次改名。

Studio 与共享成果服务须同时供应固定包：

```sh
npm install ./eduwork-dsh-artifact-services-0.1.0-dev.4.tgz ./eduwork-dsh-knowledge-studio-0.4.0-dev.17.tgz
```

发布前创建并确认 npm eduwork 组织权限，恢复登录，核对候选的构建、包内容和安装结果；以 public 可见性发布。新包验证可用后，再决定旧包的维护期限与迁移提示。当前未改动旧包 registry 状态，未执行弃用、撤包或用户安装迁移。
