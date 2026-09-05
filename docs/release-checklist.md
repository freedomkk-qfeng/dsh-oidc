# 公开发布检查表

**简体中文** | [English](release-checklist.en.md)

在发布 Pull Request 中记录审查人、日期、命令输出链接和例外说明。任何未勾选项目都会阻止公开发布，除非维护者和安全维护者书面说明其不适用原因。

## 授权与项目元数据

- [ ] 仓库所有者确认公开发布和 MIT 许可证。
- [ ] `freedomkk-qfeng/dsh-oidc` 远程仓库位置和 `@eduwork/dsh-oidc` npm 包所有权均已确认。
- [ ] 维护者、安全维护者和发布经理名单及替补已记录。
- [ ] GitHub Private Vulnerability Reporting 已启用并完成一次无敏感数据的入口检查。
- [ ] ECNU/ChatECNU 名称、示例文字、颜色和商标声明获批。

## 源码与协议审查

- [ ] OIDC、Key Binding、模型网关一致性、Profile 校验、Provider 凭据和 native 边界已完成双人审查。
- [ ] Enterprise Profile JSON Schema 与运行行为一致。
- [ ] OpenAPI 与 Key Binding 规范正文和实现一致。
- [ ] OIDC 标准引用和限制仍然有效。
- [ ] 没有重复实现 DSH 已支持且适用的能力。
- [ ] 兼容性矩阵和变更日志已更新。

## 安全与隐私

- [ ] 已按实际部署拓扑审查威胁模型。
- [ ] 单用户/多用户 Credential Provider 边界已验证。
- [ ] 已在预发布环境通过 OIDC 成功和反向符合性测试。
- [ ] 已通过跨用户/跨 tenant Key Binding 授权测试。
- [ ] 已测试 API Key 过期、轮换、停用和远程撤销行为。
- [ ] 已确认 WebServer 仅监听 `127.0.0.1`，没有反向代理、端口转发或隧道把本地会话暴露给其他用户。
- [ ] 已审查远端 TLS、CSP、Cookie、CSRF、出口、时钟、日志、APM 和备份。
- [ ] 已完成身份和审计数据的隐私/法律审查。
- [ ] 当前树与待公开 Git 历史的密钥扫描均未发现生产 host、ID、Key、日志、个人路径或个人数据。

## 供应链

- [ ] Windows 和 Linux 上分别使用 Node 22、24 完成干净 `npm ci` 与 `npm run check`。
- [ ] `npm audit` 和静态分析结果经过审查，而不只是执行。
- [ ] 所有直接/间接许可证和例外已经审查。
- [ ] npm 安装脚本已经审查，未预期脚本被拒绝。
- [ ] Lockfile diff 已审查，依赖版本按预期锁定。
- [ ] 公开发布前，GitHub Actions 已固定到不可变 commit。

## 产品验收

- [ ] 纯 Web DSH：登录、callback、显示 name/sub 降级、provision、模型调用、刷新、检查连接和退出。
- [ ] Native 桌面：现有 ChatECNU Work 体验无回退。
- [ ] 原生多模态和纯文本 + image-transform 路由均已测试。
- [ ] 不支持 reasoning effort 的模型仍能启用 thinking 并正常运行。
- [ ] 已测试失败 UX：Discovery、token、UserInfo、bootstrap、策略拒绝、模型 Key、过期和网络超时。

## 构建与发布

- [ ] 在干净 checkout 中通过 `npm run check`。
- [ ] 已审查 `npm pack --dry-run` 和解压后的 tarball，且只包含预期文件。
- [ ] Source map 不包含私有绝对路径或秘密。
- [ ] Tag、发布说明和 checksum 已准备。
- [ ] npm Trusted Publisher 已绑定仓库 `freedomkk-qfeng/dsh-oidc`、workflow `release.yml` 和 environment `npm`；在绑定完成前只以 `publish=false` 运行手动工作流。
- [ ] 发布 job 使用固定的 npm CLI `11.6.2`（满足 Trusted Publishing 对 npm `>=11.5.1`、Node `>=22.14.0` 的要求），且该提交的 Windows/Linux × Node 22/24 CI 已成功。
- [ ] 发布时显式填写现有标签 `v<package version>` 并启用 `publish=true`；workflow 校验标签、提交、tarball 身份和 SHA-256 后才使用 provenance 发布，不使用长期本地 publish token。
- [ ] 已确认回滚、弃用和漏洞通知计划。
