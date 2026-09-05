# 兼容性与发布策略

**简体中文** | [English](compatibility.en.md)

## 已测试矩阵

| dsh-oidc | Node.js | DSH | pi-ai | 状态 |
| --- | --- | --- | --- | --- |
| `0.1.0-alpha.11` | 22、24 | 声明基线仍为 `0.1.2-alpha.2`；另有主线 `0.1.2-rc.1` 隔离配置 RPC 探针 | `^0.84.2` | npm 作用域迁移；保留数据协议；不将 rc.1 探针视为完整版本兼容验收。 |
| `0.1.0-alpha.10` | 22、24 | `0.1.2-alpha.2` / `0a53fb55…` | `^0.84.2`（npm/源码 Runtime 中为 `0.84.4`） | 迁移到 `SettingsProvider.installSection()`；npm 与源码 release-pack 双路径通过完整检查。 |
| `0.1.0-alpha.9` | 22、24 | `0.1.2-alpha.1` / `cd5ef814…` | `^0.84.2`（已审查源码 Runtime 中为 `0.84.4`） | Web/native 只消费标准 Enterprise Profile；产品机构目录转换彻底移出插件。 |
| `0.1.0-alpha.8` | 22、24 | `0.1.2-alpha.1` / `cd5ef814…` | `^0.84.2`（已审查源码 Runtime 中为 `0.84.4`） | Web/native 共用 Profile 凭据引用规则；支持生产/测试本地 Key 隔离，并对 native 引用错配失败关闭。 |
| `0.1.0-alpha.7` | 22、24 | `0.1.2-alpha.1` / `cd5ef814…` | `^0.84.2`（已审查源码 Runtime 中为 `0.84.4`） | 开发环境可显式允许一个精确的网络 HTTP origin；生产仍强制 HTTPS。 |
| `0.1.0-alpha.6` | 22、24 | `0.1.2-alpha.1` / `cd5ef814…` | `^0.84.2`（已审查源码 Runtime 中为 `0.84.4`） | 使用上游“模型”页面和官方 `settings.models.footer`；匹配的 npm 包发布前，应通过源码 release-pack 验证。 |
| `0.1.0-alpha.5` | 22、24（开发） | `0.1.1-rc.2` / `b150a551…` | `0.82.1` | 文档改为优先从本地 checkout 安装；运行行为与 alpha.4 相同。 |
| `0.1.0-alpha.4` | 22、24（开发） | `0.1.1-rc.2` / `b150a551…` | `0.82.1` | 支持直接安装 DSH Web Bundle，并提供完整第三方部署文档；ECNU 参考组合已完成产品/Web 验收。 |
| `0.1.0-alpha.3` | 22、24（开发） | `0.1.1-rc.2` / `b150a551…` | `0.82.1` | Web/native 共用企业模型设置和 native 能力 adapter；尚待端到端产品验收。 |
| `0.1.0-alpha.2` | 22、24（开发） | `0.1.1-rc.2` / `b150a551…` | `0.82.1` | Web 与 native adapter 统一使用标准 UserInfo 姓名显示；尚待真实部署验收。 |
| `0.1.0-alpha.1` | 22、24（开发） | `0.1.1-rc.2` / `b150a551…` | `0.82.1` | 单元测试、构建和打包基线；仍需真实部署验收。 |

仅支持 `package.json` 中声明的精确 DSH peer 版本。其他版本即使通过显式 peer override 安装，也属于未经测试的组合。

## 契约版本

- Enterprise Profile：`dsh-oidc/v1alpha1`
- Key Binding：`worker-user-center-v1`
- Typert 包/命名空间：`@eduwork/dsh-oidc` / `oidcAccounts`
- 浏览器管理投影：`dsh-oidc/management/v1alpha1`
- 回调路径：`/oauth/callback`
- Provider 转换服务：`enterpriseTransforms`
- 兼容旧版的 Provider 设置命名空间：`provider-enterprise`

修改上述任一项都必须进行兼容性分析；涉及网络可见契约时，必须发布新的契约版本。

## 项目语义化版本

在 `1.0.0` 之前，minor 版本可以包含不兼容的 alpha 契约变更，但必须提供发布说明和迁移指引。同一已记录契约版本中的 patch 版本必须向后兼容。

在 `1.0.0` 之后：

- 新增可选 Profile 字段和错误码可以作为 minor 版本发布；
- 删除或重命名字段、修改固定路径、回调路径、默认凭据派生或身份规则，需要 major 版本或单独版本化的契约；
- 因安全加固而拒绝此前接受的不安全输入，可以在醒目说明后作为 minor 或 patch 版本发布。

## 发布门槛

以下项目全部通过前，不得创建公开 tag 或发布 npm 包：

- 在干净 checkout 中执行 `npm ci`；
- Windows 和 Linux 上执行 `npm run check`；
- CodeQL 或等效静态分析；
- 依赖、许可证和安装脚本审查；
- 密钥与生产地址扫描；
- npm tarball 内容审查；
- 纯 Web 端到端验收；
- native 桌面无回退验收；
- OIDC 反向测试和 Key Binding 授权测试；
- 文档、版本和变更日志更新；
- 对认证、凭据、构建或发布流程变更进行双人审查。

操作检查项见[公开发布检查表](release-checklist.md)。
