# 治理规则

**简体中文** | [English](GOVERNANCE.en.md)

## 项目所有权

`dsh-oidc` 由 [@freedomkk-qfeng](https://github.com/freedomkk-qfeng) 发起并托管。项目保持机构中立；具体机构的名称、商标、服务地址和 Client ID 只能出现在获得授权的部署配置中，不能成为公共协议的默认值。

## 角色

- **维护者**：合并普通变更、处理 Issue 并管理兼容性。
- **安全维护者**：审查认证、授权、凭据、构建和发布变更，并处理私有报告。
- **发布经理**：控制受保护 tag、npm 发布、provenance 和回滚。

维护者名单见 [`MAINTAINERS.md`](MAINTAINERS.md)。一个人初期可以兼任多个角色；首次稳定版和 npm 正式发布前应补充发布与安全恢复的替补。安全敏感变更应尽可能获得独立复核。

## 决策流程

- 普通实现决策通过 Pull Request 审查。
- 公共契约、信任边界、依赖策略或治理变更，需要在 `docs/decisions/` 中记录 ADR。
- 不向后兼容的变更必须提供迁移文档，并遵循[兼容性与发布策略](docs/compatibility.md)。
- 维护者寻求大致共识；未解决的安全和互操作问题会阻止发布，除非通过书面决策明确接受。

## 审查与合并

- 普通文档、测试和 UI 变更至少一人批准。
- OIDC、Key Binding、Profile 校验、秘密、native 边界、工作流、依赖或发布变更至少两人批准。
- 作者不能是其安全敏感变更的唯一批准人。
- 公开远程仓库必须启用 CI、强制审查和分支保护。

## 发布

- 发布经理只有在完成[公开发布检查表](docs/release-checklist.md)后，才能发布签名/受保护 tag。
- npm 发布使用短期 trusted publishing/OIDC 和 provenance，不使用工作站上的长期 Token。
- 发布记录包含 checksum、兼容性矩阵、Changelog、已知限制和回滚说明。
- 发现发布版本已被攻陷或不安全时，应迅速弃用、轮换秘密，并按安全政策通知用户。

## 品牌与中立性

项目可以记录 ECNU 参考实现，但协议必须保持机构中立。合并其他机构示例不代表背书。商标和 Logo 的使用需要权利人许可，MIT 代码许可证不授予商标权。
