# 机构服务端完整接入契约

**简体中文** | [English](server-integration-contract.en.md)

本文是机构服务端接入 `dsh-oidc` 的总规范。它把 OIDC Authorization Code + PKCE、Key Binding 和模型网关视为同一个**机构企业模型集成服务**必须共同交付的能力，而不是三个可以任选其一的松散模块。

文中的“必须”“不得”“应该”是规范性要求。OIDC、OAuth 和 OpenAI-compatible 已有标准或事实接口，本项目不复制它们的全部定义；Key Binding 是本项目定义的固定协议，由 [`protocol/openapi.yaml`](../protocol/openapi.yaml) 给出机器可读契约。

## 1. 一个服务端契约，三组协议表面

一次合格接入必须由同一服务所有者联合提供以下三组能力：

| 协议表面 | 作用 | Enterprise Profile 入口 | 是否必需 |
| --- | --- | --- | --- |
| OIDC Provider | 登录、用户身份和 Access Token | `oidc.issuer`、`oidc.clientId`、`oidc.scopes` | 必需 |
| Key Binding | 把已认证用户绑定到可撤销的模型运行凭据 | `keyBinding.baseURL` | 必需 |
| 模型网关 | 使用运行凭据调用声明的企业模型 | `provider.baseURL`、`provider.id`、`provider.models` | 必需 |

“一个服务”指一个完整的交付边界、版本责任和安全责任，不强制三个地址使用同一域名或同一进程。OIDC Discovery 本身允许各 endpoint 位于不同 HTTPS origin，机构内部也可以把请求路由给不同系统；但对 `dsh-oidc` 部署方而言，只有三组能力全部可用且满足下述一致性约束，接入才是完整的。

`dsh-oidc` 不支持以下降级组合：

- 只有 OIDC，随后把一个全局模型 API Key 下发给所有用户；
- 只有 Key Binding，却由客户端提交未经验证的工号、姓名或 subject；
- 只声明模型列表，但没有按 OIDC subject 执行授权和凭据生命周期；
- 通过 Profile 下发私有脚本、CSS、Provider adapter 或协议路径。

## 2. 固定的客户端回调

Web 组合是本机单用户应用。OIDC Public Client 必须登记精确回调地址：

```text
http://127.0.0.1:3080/oauth/callback
```

- host 固定为 IPv4 loopback `127.0.0.1`；不能登记 `localhost`、局域网 IP 或公网域名；
- path 固定为 `/oauth/callback`；
- `3080` 是推荐的 DSH WebServer 端口；若部署方显式修改 DSH 端口，登记值必须使用相同端口；
- Client 类型必须是无 Client Secret 的 Public Client；
- 必须支持 Authorization Code Flow 和 PKCE `S256`。

这是浏览器返回本机 DSH 的地址。`oidc.issuer`、Key Binding 和模型网关仍是机构远端服务，生产环境必须使用 HTTPS。当前 Web backend 有意拒绝绑定到非 `127.0.0.1` 的 DSH WebServer，因此它不是共享公网 Web 会话方案。

## 3. OIDC Provider 必须实现的能力

### 3.1 Discovery

`GET {issuer}/.well-known/openid-configuration` 必须返回与配置完全相同的 `issuer`，并至少发布：

- `authorization_endpoint`；
- `token_endpoint`；
- `jwks_uri`；
- `userinfo_endpoint`；
- `code_challenge_methods_supported`，且包含 `S256`。

若发布 `id_token_signing_alg_values_supported`，必须包含当前客户端支持的 `RS256`。`revocation_endpoint` 可选；发布后，客户端退出时会尽力撤销 token。

### 3.2 Authorization 与 Token

服务必须接受带 `state`、`nonce`、`code_challenge` 和 `code_challenge_method=S256` 的 Authorization Code 请求。Token endpoint 必须校验 `code_verifier`，不得要求 Public Client 提交 Client Secret。

ID Token 至少必须包含有效的 `iss`、`aud`、`sub`、`iat`、`exp` 和请求对应的 `nonce`，并使用 Discovery 中 `jwks_uri` 发布的带 `kid` RS256 密钥签名。

### 3.3 UserInfo

UserInfo 必须返回：

- `sub`：必需、非空，并与 ID Token `sub` 完全一致；
- `name`：强烈建议，作为界面中的用户姓名；缺失时客户端降级显示 `sub`。

`dsh-oidc` 不读取私有人员接口，也不提供 JSON Path 姓名映射。机构如希望显示姓名，应在标准 UserInfo 中返回 `name`。详细限制见 [OIDC 互操作规范](oidc-interoperability.md)。

### 3.4 Access Token

Access Token 可以是 JWT 或 opaque token，但 Key Binding 服务必须验证：issuer、audience、有效期、not-before、scope、subject、账号状态和机构授权。客户端不会在请求 body 中提交可被信任的 subject。

## 4. Key Binding 必须实现的能力

机构服务必须完整实现 `worker-user-center/v1` 的四个固定操作：

```text
GET  {keyBinding.baseURL}/bootstrap
POST {keyBinding.baseURL}/runtime-credential/provision
POST {keyBinding.baseURL}/runtime-credential/resolve
POST {keyBinding.baseURL}/runtime-credential/renew
```

每个请求都使用 OIDC Access Token：

```http
Authorization: Bearer <oidc-access-token>
```

服务端必须从验证后的 token 派生 subject，并执行 Provider 权限、账号状态和凭据生命周期策略。`provision` 与 `renew` 必须支持 `Idempotency-Key`。成功响应中的 `provider_id` 必须与 Profile `provider.id` 完全一致；`api_key` 必须使用 `Cache-Control: no-store` 返回，且不得进入 URL、日志、APM、审计字段或错误详情。

四个操作的请求、响应、状态、错误和幂等规则见 [Key Binding 协议](key-binding-protocol.md) 与 [`protocol/openapi.yaml`](../protocol/openapi.yaml)。四个操作缺少任意一个都不构成完整的服务端实现。

## 5. 模型网关必须实现的能力

`provider.baseURL` 必须指向经过机构授权的 OpenAI-compatible HTTPS API。当前适配器使用 DSH 官方 Pi adapter 和其 OpenAI-compatible 网络实现；服务端必须：

- 接受 Key Binding 返回的运行 API Key；
- 按 API Key 校验状态、Provider scope、有效期、配额和撤销状态；
- 实现 Profile 中声明的模型 ID 和输入能力；
- 对流式响应、错误和限流返回与 OpenAI-compatible 客户端可互操作的结果；
- 不允许已撤销或已轮换的旧 Key 无限期继续访问。

模型目录由受信任的 Enterprise Profile 声明，不由浏览器或远程响应动态注入可执行 adapter。

## 6. 跨协议一致性约束

同一机构集成服务必须保证：

1. OIDC UserInfo `sub` 与 ID Token `sub` 相同；
2. Key Binding 对同一个 Access Token 解析出同一个 subject；
3. bootstrap、credential 响应和 Enterprise Profile 的 `provider.id` 完全相同；
4. Key Binding 返回的 API Key 只对该 subject 和 Provider 授权；
5. 模型网关实际提供的模型 ID 与 Profile 声明一致；
6. 退出、账号停用、授权撤销和凭据轮换能够传播到运行凭据；
7. OIDC Token 与模型 API Key 使用不同用途、不同验证链路，不能互相替代；
8. 日志可以记录不透明 subject 引用、`api_key_id` 和关联 ID，但不得记录 token 或 `api_key`。

bootstrap 返回的姓名、部门等展示信息不能覆盖 OIDC 身份。用户姓名只来自标准 UserInfo `name`；Key Binding 只负责授权和凭据绑定。

## 7. 一次完整调用链

1. 客户端读取 OIDC Discovery。
2. 浏览器使用 Authorization Code + PKCE 跳转到机构登录页。
3. 身份平台回调 `127.0.0.1:<port>/oauth/callback`。
4. 客户端校验 state、nonce、issuer、audience、签名与时间声明，并读取 UserInfo。
5. 客户端用 OIDC Access Token 调用 Key Binding `bootstrap`。
6. 用户明确同意后，客户端调用 `provision`；已有凭据则调用 `resolve`，到期时调用 `renew`。
7. DSH Credential Provider 在本机保存 OIDC 会话和模型运行 Key。
8. DSH Provider adapter 使用运行 Key 调用模型网关。
9. 退出时客户端清除本地会话和运行 Key，并尽力调用标准 OIDC revocation；远程运行 Key 的最终撤销仍由机构策略负责。

## 8. Enterprise Profile 对应关系

Profile 只保存公开、可审查的部署事实：

```json
{
  "oidc": {
    "issuer": "https://id.example.edu/oidc",
    "clientId": "dsh-public-client",
    "scopes": ["openid", "profile", "offline_access"]
  },
  "keyBinding": {
    "baseURL": "https://ai.example.edu/api/worker/v1"
  },
  "provider": {
    "id": "example-ai",
    "baseURL": "https://ai.example.edu/open/api/v1",
    "models": []
  }
}
```

Profile 不得包含 Client Secret、OIDC Token、模型 API Key、真实用户数据、管理端凭据或远程可执行内容。完整字段见 [Enterprise Profile 规范](enterprise-profile.md)。

## 9. 符合性与验收

机构服务端只有同时满足以下条件才可声明兼容：

- 完成 OIDC Discovery、Authorization Code + PKCE、Token、JWKS 和 UserInfo；
- 使用精确 loopback redirect URI 注册 Public Client；
- 完成全部四个 Key Binding 操作及幂等、安全响应要求；
- 提供与 Profile 一致且接受绑定凭据的模型网关；
- 通过成功链路及 state、nonce、subject、Provider、过期、撤销、越权、重放和日志脱敏反向测试；
- 未把全局密钥、Client Secret 或人员私有接口引入客户端配置。

上线验收清单见 [接入指南](getting-started.md#7-上线前验收) 和 [公开发布检查表](release-checklist.md)。
