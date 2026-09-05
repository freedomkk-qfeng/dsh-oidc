# dsh-oidc

> npm 包：`@eduwork/dsh-oidc@0.1.0`。旧无作用域包和作用域 alpha 版本保留供迁移；安装切换与数据兼容见 [迁移说明](docs/EDUWORK-MIGRATION.md)。

**简体中文** | [English](README.en.md)

`dsh-oidc` 是面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的企业身份与模型闭环集成插件。

它不是“只做登录”的 OIDC 按钮，而是把四项能力按清晰边界组合起来：

1. 标准 OIDC Authorization Code + PKCE 公共客户端登录；
2. 固定的企业 **Key Binding** 协议，用 OIDC Access Token 申请、解析或轮换可撤销的模型运行凭据；
3. 本地、经过审计的 OpenAI-compatible DSH Provider 适配器；
4. 有边界的品牌替换，以及 Web / Desktop 共用的账号与企业模型设置 UI。

插件 Web 优先，不依赖 Wails。桌面产品可以切换到 native account backend，但 Enterprise Profile、Provider 路由、前端账号契约和 Key Binding 语义不变。

> **当前版本：0.1.0。** 当前源码精确适配 DSH `0.1.2-rc.1`（提交 `a66e4702…`），并锁定、检查完整 DSH peer 闭包。软件包使用稳定版本号，但 Enterprise Profile 仍为 `v1alpha1`；正式生产前仍必须完成真实 OIDC/Key Binding 联调和宿主凭据隔离审计。

准备接入自己的机构？先读 **[服务端接口规范](docs/server-integration-contract.md)**，再按 **[完整中文接入指南](docs/getting-started.md)** 部署。前者以请求、响应、字段和错误码形式定义一个机构服务必须共同实现的 OIDC + PKCE、Key Binding 和模型网关能力；后者覆盖配置、安装、验收和排障。

## 为什么叫 `dsh-oidc`

这个名字足够准确，也没有把 ECNU、Wails、某个模型网关或某种客户端形态绑进公共能力。仓库名仍为 `dsh-oidc`，npm 包使用 `@eduwork/dsh-oidc`；[旧 npm 包](https://www.npmjs.com/package/dsh-oidc)保留供迁移。

它的边界不是“登录结束”，而是“一套能闭环的企业模型接入标准”：

- OIDC 负责确认用户是谁；
- Key Binding 负责确认该用户能否获得哪个 Provider 的运行凭据；
- Enterprise Profile 负责声明品牌、OIDC 公共客户端、Key Binding 基址和模型事实；
- 本地 Provider 适配器把凭据和模型事实接入 DSH；
- 具体桌面外壳、配额展示、学校业务页、更新器等仍由产品实现方扩展。

远程配置只能是数据，不能指定 JS 模块、脚本、CSS、工具、Skill 或自定义 Provider adapter，也不能修改 Key Binding 的路径和字段。这是开源后的核心安全边界。

## 能力与非目标

已包含：

- 固定 loopback 回调 `http://127.0.0.1:<DSH端口>/oauth/callback`；
- OIDC Discovery、PKCE S256、state、nonce、RS256 ID Token 校验、UserInfo subject 绑定、刷新和可选撤销；
- 只读取标准 `userinfo.name`，缺失时降级到必需字段 `userinfo.sub`；
- 固定 `worker-user-center-v1` 的 bootstrap / provision / resolve / renew；
- 使用 DSH Credential Provider 保存 OIDC 会话和模型 API Key；
- 声明式 Provider/模型目录和有边界的品牌 token；
- Web 与 native 宿主共用、按宿主能力自动显隐操作的企业服务设置页；该页面通过 DSH 官方 `settings.section` 扩展点注册；
- 桌面原生账号后端适配边界；
- 稳定的 `enterpriseTransforms` 扩展服务，图像理解等插件可以增强某条模型路由，但不会再注册一套重复 Provider。

明确不包含：OIDC 服务端、Key Binding 服务端、多用户会话数据库、学校人员目录、配额 UI、Wails 外壳、客户端更新器和远程可执行插件。

## 品牌替换范围

`dsh-oidc` 当前已经包含品牌替换。部署方可以在 Enterprise Profile 的 `brand` 中声明：

- `productName`、`organizationName` 和 1–4 字符的 `mark`；
- HTTPS 或 base64 PNG/WebP `logoURL`；
- 六位十六进制 `primaryColor`；
- `loginTitle`、`loginDescription` 和 HTTPS `supportURL`。

这些字段会作用于页面标题、侧栏品牌、对话开场标记、登录/确认界面和一组受限 DSH 主题 token。它们不能注入任意 CSS、SVG、脚本或组件，也不会替换桌面外壳、更新器、配额界面和机构业务页面。完整字段、大小限制与安全规则见 [Enterprise Profile 规范](docs/enterprise-profile.md#品牌替换)。

## 最小接入步骤

1. 按[服务端接口规范](docs/server-integration-contract.md)联合提供 OIDC、Key Binding 和模型网关。
2. 为无 Client Secret 的 Public Client 精确登记 `http://127.0.0.1:3080/oauth/callback`。
3. 从 [`examples/enterprise-profile.example.json`](examples/enterprise-profile.example.json) 复制一份可信本地配置。
4. 从 npm 安装经过复核的精确版本：

```bash
dsh plugin --profile web add @eduwork/dsh-oidc@0.1.0
```

需要审计、开发或测试尚未发布的改动时，也可以从本地 checkout 安装：

```bash
git clone https://github.com/freedomkk-qfeng/dsh-oidc.git
cd dsh-oidc
npm ci
npm run check
dsh plugin --profile web add .
```

本地路径安装会把当前 checkout 以依赖链接到 DSH `web` Profile；安装后不要移动或删除源码目录。团队部署应固定经过复核的 npm 精确版本，不要混装其他 DSH 预发布线。

高级产品也可以在自己的 DSH bundle 中显式引入 `dsh-oidc`：

```yaml
- insert:
    - id: enterprise-oidc
      name: '@eduwork/dsh-oidc'
      config:
        profilePathEnv: DSH_OIDC_ENTERPRISE_PROFILE
```

5. 用环境变量传入配置文件路径，并让 DSH WebServer 监听 `127.0.0.1`：

```text
DSH_OIDC_ENTERPRISE_PROFILE=/etc/dsh/enterprise-profile.json
dsh --profile web --host 127.0.0.1 --port 3080
```

回调 host 与 path 不可配置。端口取 DSH WebServer 实际端口；如修改 `3080`，OIDC 注册值也必须同步修改。

## 最重要的部署约束

当前 Web backend 只支持“可信单用户机器上的一个本地 DSH 进程”，并强制 DSH WebServer 绑定 `127.0.0.1`。它不支持共享公网 Web，也不应通过反向代理暴露为多人站点。需要共享部署时，应由另一个具备每用户会话、凭据隔离、Cookie/CSRF 和存储安全的宿主实现新的 backend，而不是放宽本插件的 loopback 限制。详见 [`docs/security-model.md`](docs/security-model.md)。

## 协议原则

OIDC 部分坚持标准化，不增加机构私有的 UserInfo 映射语法：

- Discovery 的 `issuer` 必须与配置完全一致；
- OIDC endpoint 可以按标准位于不同 HTTPS origin；
- UserInfo 的 `sub` 必须等于 ID Token 的 `sub`；
- 展示名取 `name`，缺失时才取 `sub`；
- bootstrap 中即使返回姓名，也不得覆盖 OIDC 身份。

OIDC、Key Binding 和模型网关共同构成一个完整的机构服务端交付，不能任选。Key Binding 是本项目定义的企业协议：Profile 通过 `baseURL` 指定接口组，其余路径、请求字段和响应字段全部固定。Provider ID 决定运行路由，并默认派生凭据引用（例如 `example-ai` 对应 `EXAMPLE_AI_API_KEY`）；生产/测试复用同一 Provider ID 时，可以用本地 `keyBinding.credentialRef` 明确隔离，且不会改变服务端接口。完整接口见[服务端接口规范](docs/server-integration-contract.md)。

## 开发与复核

```bash
npm ci
npm run check
```

完整检查包括 DSH rc.1 Host/Client/API 契约核对、Host/Client 构建、单元测试、OIDC 安全边界测试、JSON Schema 示例校验、OpenAPI 结构检查、敏感信息扫描和 npm tarball 预检。

详细材料：

- [`docs/architecture.md`](docs/architecture.md)：组合架构与代码边界
- [`docs/server-integration-contract.md`](docs/server-integration-contract.md)：机构服务端必须共同实现的完整接口规范
- [`docs/getting-started.md`](docs/getting-started.md)：第三方从零接入、部署、验收与排障
- [`docs/enterprise-profile.md`](docs/enterprise-profile.md)：Enterprise Profile 字段和信任规则
- [`docs/oidc-interoperability.md`](docs/oidc-interoperability.md)：OIDC 兼容性要求
- [`docs/key-binding-protocol.md`](docs/key-binding-protocol.md)：Key Binding 规范
- [`docs/security-model.md`](docs/security-model.md)：威胁模型和部署要求
- [`docs/dsh-integration.md`](docs/dsh-integration.md)：DSH 服务依赖和扩展点
- [`docs/ecnu-reference.md`](docs/ecnu-reference.md)：华东师范大学参考组合（仅占位配置）
- [`docs/compatibility.md`](docs/compatibility.md)：版本与发布策略

代码和原创文档使用 MIT 许可证。ECNU/ChatECNU 示例不包含真实地址、Client ID 或密钥，也不授予任何校名、商标和品牌资产使用权。
