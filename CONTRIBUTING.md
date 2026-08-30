# 贡献指南

**简体中文** | [English](CONTRIBUTING.en.md)

感谢你改进 `dsh-oidc`。认证和凭据代码的审查门槛高于普通 UI 变更。

## 开始之前

- 非敏感设计或缺陷讨论请使用公开 Issue。
- 漏洞或秘密信息请使用[私有安全报告入口](https://github.com/freedomkk-qfeng/dsh-oidc/security/advisories/new)。
- 修改协议或信任边界前，请先创建设计 Issue，并在 `docs/decisions/` 下新增 ADR。
- 未经明确公开授权，不得提交生产 endpoint、标识符、日志、Token、个人数据、Logo 或截图。

## 开发

要求：Node.js 22+ 和 npm。

```bash
npm ci
npm run check
```

占位域名使用 `example.com`、`example.edu` 或 `example.net`。单元测试必须使用生成密钥和虚构 subject。

## Pull Request 要求

每个 PR 必须：

- 说明对用户和安全的影响，以及涉及的边界；
- 覆盖成功和反向/失败行为测试；
- 契约变化时同步更新 Schema、OpenAPI、规范正文、示例和 Changelog；
- 除非提供版本化迁移方案，否则保持 callback/Key Binding 固定路径不变；
- 保持 Profile 声明式，并拒绝与可执行行为相关的未知字段；
- 适用时优先使用 DSH 官方或社区能力，不引入平行运行时；
- 在干净安装中通过 `npm run check`；
- 声明所有新增依赖、许可证、安装脚本和引入理由。

修改 OIDC、Key Binding、凭据、Profile 校验、native 账号契约、构建/发布流程或依赖锁定，需要两人批准，其中至少一位是负责安全的维护者。

## 代码风格

- 原生 ESM，Node 22 基线。
- 模块保持小而明确，校验采用失败关闭。
- 公共错误码是稳定机器事实；消息不得包含秘密。
- 网络操作必须有超时和响应大小上限。
- 避免记录响应 body、header、Token、Key 或完整 Profile。
- 优先使用 DSH 官方服务和 export；记录每个兼容扩展点。

## Commit 与发布规范

- Commit 应便于审查；项目策略支持时使用签名。
- 不得提交生成的凭据、`.env`、归档或 session 日志。
- `lib/` 由 `npm run build` 生成；审查源码和 tarball，而不只是压缩产物。
- 维护者通过受保护 tag 和批准的工作流发布，并启用 npm provenance。

参与贡献即表示同意遵守[行为准则](CODE_OF_CONDUCT.md)，并确认你有权按 MIT 许可证提交相关贡献。
