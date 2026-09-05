# Enterprise Profile 规范（`dsh-oidc/v1alpha1`）

**简体中文** | [English](enterprise-profile.en.md)

## 状态与符合性

本文规定 `dsh-oidc` `0.1.x` 使用的数据契约。关键词 **必须（MUST）**、**不得（MUST NOT）**、**必需（REQUIRED）**、**应该（SHOULD）**、**不应该（SHOULD NOT）** 和 **可以（MAY）** 按 RFC 2119 与 RFC 8174 解释。

权威机器可读 Schema 为 [`schema/enterprise-profile.v1alpha1.schema.json`](../schema/enterprise-profile.v1alpha1.schema.json)。运行时对若干安全敏感 URL 的校验有意比 JSON Schema 更严格。符合规范的 Profile 必须同时通过 JSON Schema 和 `normalizeEnterpriseProfile()` 校验。

## 信任模型

Profile 是受信任的部署配置，不是用户输入。即便如此，解析器仍以失败关闭方式工作：

- 根对象和所有涉及可执行行为的嵌套对象都会拒绝未知字段；
- 序列化后的 Profile 总大小不超过 512 KiB；
- 生产 URL 必须使用 HTTPS；
- 只有显式 loopback 主机可以在开发环境使用 HTTP；
- 拒绝 URL 凭据、fragment 和 endpoint-base query string；
- 只能选择内置的 `openai-compatible` adapter；
- Key Binding 只接受协议基址和可选的本地 DSH 凭据引用，不能改写网络路径或字段；
- logo data URL 只接受 PNG/WebP，不接受 SVG。

远程管理系统只有在宿主能够认证来源、校验完整性并通过审查流程暂存变更时，才可以分发 Profile JSON。下载的 JSON 不会仅仅因为不包含 JavaScript 就自动变得安全。

## 根对象

| 字段 | 必需 | 含义 |
| --- | --- | --- |
| `schemaVersion` | 是 | 精确字符串 `dsh-oidc/v1alpha1`。 |
| `id` | 是 | 匹配 `^[a-z][a-z0-9-]{0,63}$` 的 Profile ID。 |
| `displayName` | 是 | 面向用户的集成名称。 |
| `organization` | 否 | 机构名称；默认使用 `displayName`。 |
| `nativeInstitutionID` | 否 | 仅传给 native 后端的标识符；默认使用 `id`。 |
| `allowInsecureDevelopment` | 否 | 为本地开发启用 loopback HTTP。网络 HTTP 还必须配置 `insecureDevelopmentOrigin`。 |
| `insecureDevelopmentOrigin` | 否 | 精确的非 TLS 开发 origin。只有与 `allowInsecureDevelopment: true` 一起使用时才有效，且所有 HTTP OIDC/Key Binding/Provider endpoint 必须使用该 origin。不得放入生产 Profile。 |
| `brand` | 是 | 有边界的展示配置。 |
| `oidc` | 是 | OIDC public client 配置事实。 |
| `keyBinding` | 是 | Key Binding 基础 URL，以及可选的本地 DSH 凭据引用。 |
| `provider` | 是 | 一个本地 OpenAI-compatible Provider 路由和模型列表。 |

## 品牌替换

品牌配置只修改经过批准的展示表面，不改变认证或可执行行为。

| 字段 | 限制/行为 |
| --- | --- |
| `productName` | 最多 80 字符；用于页面标题和侧栏名称。 |
| `organizationName` | 最多 120 字符。 |
| `mark` | 未提供 Logo 时使用的 1–4 个字符。 |
| `logoURL` | HTTPS URL 或 base64 PNG/WebP；文本最多 128 KiB。远程图片使用 `referrerPolicy=no-referrer`。 |
| `primaryColor` | 六位十六进制颜色；只覆盖一组受限 DSH 主题 token。 |
| `loginTitle` | 最多 120 字符。 |
| `loginDescription` | 最多 500 字符。 |
| `supportURL` | 使用 `noopener noreferrer` 打开的绝对 HTTPS URL。 |

没有权利人的许可，Profile 不得包含其 Logo 或名称。担心远程图片跟踪的部署方应该打包 base64 PNG/WebP，或在受控 origin 上托管资产并配置严格 CSP。

## OIDC 对象

```json
{
  "issuer": "https://id.example.edu/oidc",
  "clientId": "dsh-web-public-client",
  "scopes": ["openid", "profile", "offline_access"]
}
```

- `issuer` 是 OIDC Issuer Identifier。支持路径，不允许 query 和 fragment；必须与 Discovery 元数据逐字符一致。
- `clientId` 标识 public client。Profile 和本插件都不应包含 client secret。
- `scopes` 必须包含 `openid` 和 `profile`；每项内部不得包含空白，且不得重复。
- 当 Provider 会签发 refresh token 且策略允许时，应该请求 `offline_access`。
- Key Binding 授权 scope 由部署决定，但建议使用参考示例中的名称。

Web 重定向地址固定为 `http://127.0.0.1:<DSH端口>/oauth/callback`。host 和 path 不可配置；端口取 DSH WebServer 的实际监听端口。

## Key Binding 对象

```json
{
  "baseURL": "https://ai.example.edu/api/worker/v1",
  "credentialRef": "EXAMPLE_AI_TEST_API_KEY"
}
```

| 字段 | 必需 | 含义 |
| --- | --- | --- |
| `baseURL` | 是 | `worker-user-center-v1` Key Binding 接口组的基址。 |
| `credentialRef` | 否 | 保存绑定后模型 API Key 的本地 DSH Credential Provider 名称。必须匹配 `^[A-Za-z_][A-Za-z0-9_]*$`，最长 128 字符。 |

协议类型固定为 `worker-user-center-v1`，请求中的 Provider ID 固定取 `provider.id`。如果省略 `credentialRef`，解析器保持向后兼容：将 Provider ID 转为大写、把非字母数字替换为 `_`，再追加 `_API_KEY`。例如 `example-ai` 默认对应 `EXAMPLE_AI_API_KEY`。

`credentialRef` 只是本地秘密存储的引用名，不是 API Key，不发送给 OIDC、Key Binding 或模型服务。普通单环境部署应该省略它并使用默认值；同一 Provider ID 在生产和测试部署间复用时，必须为不同环境配置不同引用，例如 `CHATECNU_API_KEY` 与 `CHATECNU_QUOTA_TEST_API_KEY`，避免一个环境读取另一环境的 Key。

Endpoint 路径、请求/响应字段和 Provider ID 语义属于协议事实，不得由 Profile 自定义。Native 宿主若返回 `runtimeCredentialRef`，其值必须与本字段规范化后的结果一致，否则插件失败关闭。

## Provider 对象

Provider 对象是由本地、经过审查的 adapter 解释的数据。

| 字段 | 必需 | 含义 |
| --- | --- | --- |
| `id` | 是 | DSH 路由 ID，也是默认凭据引用的来源；在所有已加载 Profile 中必须唯一。 |
| `displayName` | 否 | 面向用户的 Provider 名称。 |
| `adapter` | 是 | 精确字符串 `openai-compatible`。 |
| `baseURL` | 是 | HTTPS OpenAI-compatible API 基址。 |
| `reasoning` | 否 | 默认 DSH/pi-ai reasoning level，取值为 `off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`，默认为 `high`。 |
| `defaultContextWindow` | 否 | 正安全整数，默认 262144。 |
| `defaultMaxTokens` | 否 | 正安全整数，默认 32768。 |
| `maxRequestImageBytes` | 否 | 单次原生图片请求的累计大小预算。 |
| `requestImagePixelBudget` | 否 | 图片归一化像素预算。 |
| `requestImageMaxBytes` | 否 | 单张归一化图片大小预算。 |
| `streamIdleTimeoutMs` | 否 | 正数空闲超时，默认 300000。 |
| `retryPolicy` | 否 | 由 DSH Provider 管理的重试策略；默认 normal/重试 2 次。 |
| `compat` | 否 | 有边界的 pi-ai OpenAI 兼容事实。 |
| `models` | 是 | 1–128 个唯一模型条目。 |

`retryPolicy.mode` 可以是 `normal` 或 `always`。`always` 可能一直重试，直到成功、取消或销毁；没有明确产品决策时不应启用。该策略还会由 DSH 再次校验。

`compat` 只接受 JSON Schema 中列出的字段。部署方必须准确描述 Provider 事实；兼容性覆盖可能改变请求语义，但不能执行代码。

## 模型条目

每个模型包含：

- 必需的 `id`；
- 可选显示名称 `name`；
- `input` 可包含 `text`、`image` 或两者，默认 `text`；
- 可选的正数 `contextWindow` 和 `maxTokens`；
- 可选 `reasoning` 布尔值；
- 可选 `reasoningEfforts` 对象或 `false`；对象键限于 `off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`，且只有 `off` 的过线值可以为 `null`；
- 可选的受限 `compat` 覆盖。

若模型支持 thinking，但不支持选择 reasoning effort，请设置：

```json
{
  "compat": { "supportsReasoningEffort": false }
}
```

Adapter 会保留 Profile 的 thinking 行为，并在校验和传输前移除不支持的用户所选 effort。不会因为 Provider 不支持 effort 参数而拒绝整个请求。

## 禁止写入的秘密

Profile 不得包含：

- OIDC client secret；
- access、refresh 或 ID token；
- 模型 API Key；
- 私有签名密钥；
- session cookie；
- 个人身份数据。

OIDC 客户端是 public client。运行时秘密在登录后创建，并且只由当前 DSH Credential Provider 保存。

## 版本管理

未知 `schemaVersion` 会被拒绝。Alpha 阶段字段可能在 `v1alphaN` 之间变化。稳定 `v1` 的 minor 版本只增加可选字段；不兼容变更使用新 Schema 版本。详见[兼容性与发布策略](compatibility.md)。
