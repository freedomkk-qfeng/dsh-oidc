# dsh-oidc 服务端接口规范

**简体中文** | [English](server-integration-contract.en.md)

本文面向身份平台、模型平台和联调测试人员，以接口说明的形式定义接入 `dsh-oidc` 时服务端必须提供的能力。

关键词“必须”“不得”“应该”“可以”具有规范性含义。OIDC 接口遵循 OpenID Connect 与 OAuth 2.0 标准；Key Binding 是本项目定义的固定协议；模型网关使用 OpenAI Chat Completions 兼容接口。

## 1. 接入范围

一个完整的**机构企业模型集成服务**必须同时提供以下三组接口：

| 接口组 | 用途 | Enterprise Profile 配置 | 要求 |
| --- | --- | --- | --- |
| OIDC Provider | 登录、用户身份、OIDC Access Token | `oidc.issuer`、`oidc.clientId`、`oidc.scopes` | 必须完整实现 |
| Key Binding | 将已认证用户绑定到可撤销的模型运行凭据 | `keyBinding.baseURL` | 四个接口全部必须实现 |
| 模型网关 | 使用绑定后的运行凭据调用企业模型 | `provider.baseURL`、`provider.id`、`provider.models` | 必须实现 Chat Completions |

“一个服务”是指一套完整的产品交付、版本、安全和运维责任，不要求所有接口使用相同域名、网关或进程。机构可以在内部拆分身份平台、用户中心和模型平台，但不能只交付其中一部分并声明已经完成 `dsh-oidc` 接入。

以下组合不符合本规范：

- 只实现 OIDC，然后向所有用户下发同一个全局模型 API Key；
- 只实现 Key Binding，并相信客户端提交的工号、姓名或 subject；
- 只提供模型地址和模型列表，不实现用户授权与凭据生命周期；
- 缺少 `bootstrap`、`provision`、`resolve`、`renew` 中任意一个 Key Binding 接口。

## 2. 地址与客户端注册

### 2.1 三个服务入口

Enterprise Profile 分别声明三个入口：

```json
{
  "oidc": {
    "issuer": "https://id.example.edu/oidc",
    "clientId": "dsh-web-public-client",
    "scopes": ["openid", "profile", "offline_access"]
  },
  "keyBinding": {
    "baseURL": "https://ai.example.edu/api/worker/v1"
  },
  "provider": {
    "id": "example-ai",
    "baseURL": "https://ai.example.edu/open/api/v1",
    "adapter": "openai-compatible",
    "models": [
      { "id": "example-model", "input": ["text"] }
    ]
  }
}
```

生产环境中的 `issuer`、`keyBinding.baseURL` 和 `provider.baseURL` 必须使用 HTTPS。URL 不得包含账号密码或 fragment；基础 URL 不得依靠 query 参数改变路由行为。

### 2.2 OIDC Public Client

身份平台必须注册一个不带 Client Secret 的 Public Client，并启用：

- Authorization Code Flow；
- PKCE `S256`；
- `openid`、`profile` scope；
- 如需 Refresh Token，再启用 `offline_access` 及相应授权策略。

回调地址必须精确登记为：

```text
http://127.0.0.1:3080/oauth/callback
```

约束如下：

- host 固定为 `127.0.0.1`，不得改成 `localhost`、局域网 IP 或公网域名；
- path 固定为 `/oauth/callback`；
- `3080` 是推荐端口；如果 DSH WebServer 使用其他端口，登记地址必须同步使用实际端口；
- 这是浏览器返回用户本机 DSH 的地址，不是机构服务端地址；
- 当前实现是本机单用户 Web 组合，不支持把回调部署成共享公网 Web 会话。

## 3. 接口总表

| 编号 | 方法 | 地址 | 认证 | 是否必须 |
| --- | --- | --- | --- | --- |
| OIDC-01 | `GET` | `{issuer}/.well-known/openid-configuration` | 无 | 是 |
| OIDC-02 | `GET` | Discovery 的 `authorization_endpoint` | 用户登录会话 | 是 |
| OIDC-03 | `POST` | Discovery 的 `token_endpoint` | Authorization Code + PKCE | 是 |
| OIDC-04 | `GET` | Discovery 的 `jwks_uri` | 无 | 是 |
| OIDC-05 | `GET` | Discovery 的 `userinfo_endpoint` | OIDC Bearer Access Token | 是 |
| OIDC-06 | `POST` | Discovery 的 `revocation_endpoint` | OIDC Token | 建议 |
| KEY-01 | `GET` | `{keyBinding.baseURL}/bootstrap` | OIDC Bearer Access Token | 是 |
| KEY-02 | `POST` | `{keyBinding.baseURL}/runtime-credential/provision` | OIDC Bearer Access Token | 是 |
| KEY-03 | `POST` | `{keyBinding.baseURL}/runtime-credential/resolve` | OIDC Bearer Access Token | 是 |
| KEY-04 | `POST` | `{keyBinding.baseURL}/runtime-credential/renew` | OIDC Bearer Access Token | 是 |
| MODEL-01 | `POST` | `{provider.baseURL}/chat/completions` | 运行时 API Key | 是 |

## 4. OIDC 接口组

### OIDC-01：Discovery

读取 OIDC Provider 元数据。

#### 请求

```http
GET /oidc/.well-known/openid-configuration HTTP/1.1
Host: id.example.edu
Accept: application/json
```

当 `issuer` 本身带路径时，Discovery 地址为：

```text
{issuer去除末尾斜杠}/.well-known/openid-configuration
```

#### 成功响应

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "issuer": "https://id.example.edu/oidc",
  "authorization_endpoint": "https://id.example.edu/oidc/authorize",
  "token_endpoint": "https://id.example.edu/oidc/token",
  "jwks_uri": "https://id.example.edu/oidc/jwks",
  "userinfo_endpoint": "https://id.example.edu/oidc/userinfo",
  "revocation_endpoint": "https://id.example.edu/oidc/revoke",
  "code_challenge_methods_supported": ["S256"],
  "id_token_signing_alg_values_supported": ["RS256"]
}
```

#### 字段要求

| 字段 | 必需 | 要求 |
| --- | --- | --- |
| `issuer` | 是 | 必须与 Enterprise Profile 的 `oidc.issuer` 逐字符相同 |
| `authorization_endpoint` | 是 | 绝对 HTTPS URL |
| `token_endpoint` | 是 | 绝对 HTTPS URL |
| `jwks_uri` | 是 | 绝对 HTTPS URL |
| `userinfo_endpoint` | 是 | 本互操作规范强制要求 |
| `revocation_endpoint` | 否 | 提供后，客户端退出时会尽力撤销 Token |
| `code_challenge_methods_supported` | 是 | 必须包含 `S256` |
| `id_token_signing_alg_values_supported` | 应该 | 应包含 `RS256`；实际 ID Token 必须使用 RS256 |

Discovery 声明的 endpoint 可以位于不同的 HTTPS origin。开发环境 HTTP 只允许 Profile 明确声明的单一开发 origin，或 loopback origin。

### OIDC-02：Authorization

浏览器通过 Authorization Code + PKCE 发起登录。

#### 请求

```http
GET /oidc/authorize?
  response_type=code&
  client_id=dsh-web-public-client&
  redirect_uri=http%3A%2F%2F127.0.0.1%3A3080%2Foauth%2Fcallback&
  scope=openid%20profile%20offline_access&
  state=<random-state>&
  nonce=<random-nonce>&
  code_challenge=<base64url-sha256>&
  code_challenge_method=S256 HTTP/1.1
Host: id.example.edu
```

#### 查询参数

| 参数 | 要求 |
| --- | --- |
| `response_type` | 固定为 `code` |
| `client_id` | 等于 Profile 的 `oidc.clientId` |
| `redirect_uri` | 与注册的 loopback 回调精确一致 |
| `scope` | 至少包含 `openid profile` |
| `state` | 客户端生成，服务端必须原样返回 |
| `nonce` | 客户端生成，必须进入对应 ID Token |
| `code_challenge` | PKCE challenge |
| `code_challenge_method` | 固定为 `S256` |

#### 成功回调

```http
HTTP/1.1 302 Found
Location: http://127.0.0.1:3080/oauth/callback?code=<authorization-code>&state=<original-state>
```

如果支持 RFC 9207，可以额外返回 `iss`；其值必须等于 Profile 中的 issuer。

#### 失败回调

```text
http://127.0.0.1:3080/oauth/callback?error=access_denied&error_description=...&state=<original-state>
```

服务端不得省略 `state`。Authorization Code 必须一次性使用、短期有效，并绑定到 client、redirect URI 和 PKCE challenge。

### OIDC-03：Token

客户端使用 Authorization Code 和 PKCE verifier 换取 Token。Public Client 不发送 Client Secret。

#### Authorization Code 请求

```http
POST /oidc/token HTTP/1.1
Host: id.example.edu
Content-Type: application/x-www-form-urlencoded
Accept: application/json

grant_type=authorization_code&
client_id=dsh-web-public-client&
code=<authorization-code>&
redirect_uri=http%3A%2F%2F127.0.0.1%3A3080%2Foauth%2Fcallback&
code_verifier=<pkce-verifier>
```

#### 成功响应

```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-store

{
  "access_token": "<oidc-access-token>",
  "token_type": "Bearer",
  "expires_in": 3600,
  "id_token": "<signed-id-token>",
  "refresh_token": "<optional-refresh-token>",
  "scope": "openid profile offline_access"
}
```

| 字段 | 必需 | 要求 |
| --- | --- | --- |
| `access_token` | 是 | 非空；供 UserInfo 和 Key Binding 使用 |
| `token_type` | 是 | 必须为 `Bearer`，大小写不敏感 |
| `expires_in` | 应该 | 正数秒；缺失时客户端按 3600 秒处理 |
| `id_token` | 是 | RS256 签名 JWT |
| `refresh_token` | 否 | 启用 `offline_access` 时建议返回 |
| `scope` | 否 | 实际授权 scope |

ID Token 至少必须包含：

| Claim | 要求 |
| --- | --- |
| `iss` | 等于 Profile 的 `oidc.issuer` |
| `aud` | 包含 `oidc.clientId`；多 audience 时 `azp` 必须等于该 client ID |
| `sub` | 非空、稳定的用户标识 |
| `iat`、`exp` | 有效 NumericDate |
| `nonce` | 与 Authorization 请求完全一致 |
| `nbf` | 可选；提供时必须有效 |
| `at_hash` | 可选；提供时必须与 Access Token 匹配 |

JWT header 必须使用 `alg=RS256`，并提供非空 `kid`。

#### Refresh Token 请求

```http
POST /oidc/token HTTP/1.1
Content-Type: application/x-www-form-urlencoded
Accept: application/json

grant_type=refresh_token&
client_id=dsh-web-public-client&
refresh_token=<refresh-token>
```

响应必须至少包含新的 `access_token`、`token_type=Bearer` 和有效 `expires_in`。如果轮换 Refresh Token，应同时返回新的 `refresh_token`。`invalid_grant` 会导致客户端清除本地 OIDC 会话和模型运行凭据。

#### 错误响应

Token 错误遵循 OAuth 2.0：

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json
Cache-Control: no-store

{
  "error": "invalid_grant",
  "error_description": "Authorization code is invalid or expired"
}
```

### OIDC-04：JWKS

提供验证 ID Token 所需的公开签名密钥。

#### 请求

```http
GET /oidc/jwks HTTP/1.1
Accept: application/json
```

#### 成功响应

```json
{
  "keys": [
    {
      "kty": "RSA",
      "kid": "signing-key-2026-01",
      "use": "sig",
      "alg": "RS256",
      "n": "<base64url-modulus>",
      "e": "AQAB"
    }
  ]
}
```

用于签发 ID Token 的 `kid` 必须唯一匹配一个 RSA 签名密钥。密钥轮换时应该保留旧公钥，直到所有使用旧密钥签发的有效 Token 均已过期。

### OIDC-05：UserInfo

返回当前 Access Token 对应的标准用户身份。

#### 请求

```http
GET /oidc/userinfo HTTP/1.1
Authorization: Bearer <oidc-access-token>
Accept: application/json
```

#### 成功响应

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "sub": "user-12345",
  "name": "示例用户"
}
```

| 字段 | 必需 | 用途 |
| --- | --- | --- |
| `sub` | 是 | 必须与 ID Token `sub` 完全一致 |
| `name` | 应该 | 界面显示姓名；缺失或为空时客户端显示 `sub` |

服务端应该直接提供标准 `name`。`dsh-oidc` 不调用机构私有人员接口，也不支持通过 JSON Path 映射姓名。其他标准 Claim 可以返回，但不得代替 `sub` 参与绑定。

### OIDC-06：Revocation（建议）

如果 Discovery 发布 `revocation_endpoint`，客户端退出时会提交 Refresh Token；没有 Refresh Token 时提交 Access Token。

```http
POST /oidc/revoke HTTP/1.1
Content-Type: application/x-www-form-urlencoded

token=<refresh-or-access-token>&client_id=dsh-web-public-client
```

退出操作对撤销采用尽力而为语义。无论远端撤销是否成功，本地 OIDC 会话和模型运行凭据都会清除。模型运行 API Key 的远程撤销仍由 Key Binding 与模型平台的生命周期策略负责。

## 5. Key Binding 接口组

### 5.1 通用约定

四个接口的相对路径、HTTP 方法和字段名称固定，不能在 Profile 中配置。

所有请求必须携带：

```http
Authorization: Bearer <oidc-access-token>
Accept: application/json
```

服务端必须验证 Token 的 issuer、audience、有效期、not-before、scope、subject、账号状态和机构授权。subject 必须从验证后的 Token 派生；不得接受客户端在 body 中提交 subject、工号或姓名作为可信身份。

建议 scope：

| 接口 | Scope |
| --- | --- |
| KEY-01 Bootstrap | `worker.bootstrap.read` |
| KEY-02 Provision | `worker.credential.provision` |
| KEY-03 Resolve | `worker.credential.read` |
| KEY-04 Renew | `worker.credential.renew` |

机构可以使用其他 scope 名称，但必须将实际名称加入 Profile 的 `oidc.scopes`，并在服务端执行对应授权。

### KEY-01：Bootstrap

读取 Provider、服务端能力、用户授权状态和运行凭据状态。该接口不得返回模型 API Key。

#### 请求

```http
GET /api/worker/v1/bootstrap HTTP/1.1
Host: ai.example.edu
Authorization: Bearer <oidc-access-token>
Accept: application/json
```

#### 成功响应

```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-store

{
  "protocol_version": "worker-user-center/v1",
  "provider": {
    "id": "example-ai"
  },
  "capabilities": [
    "worker.bootstrap.read",
    "worker.credential.provision",
    "worker.credential.read",
    "worker.credential.renew"
  ],
  "runtime_credential": {
    "status": "missing",
    "provisioning": {
      "allowed": true
    }
  }
}
```

#### 响应字段

| 字段 | 必需 | 说明 |
| --- | --- | --- |
| `protocol_version` | 否 | 提供时必须为 `worker-user-center/v1` |
| `provider.id` | 是 | 必须与 Profile `provider.id` 完全一致 |
| `capabilities` | 是 | 字符串数组，最多 256 项 |
| `runtime_credential.status` | 是 | 当前凭据状态 |
| `runtime_credential.api_key_id` | 条件 | 已存在凭据时建议返回；Renew 需要该值 |
| `runtime_credential.expires_at` | 否 | RFC 3339 时间 |
| `runtime_credential.provisioning.allowed` | 否 | 是否允许创建凭据 |
| `runtime_credential.provisioning.reason` | 否 | 面向用户的非敏感原因，最多 500 字符 |
| `subject` | 否 | 仅供管理面展示；不得覆盖 OIDC 身份 |

`runtime_credential.status` 的取值：

| 状态 | 客户端行为 |
| --- | --- |
| `missing` | 等待用户明确同意后调用 Provision |
| `active` | 调用 Resolve |
| `expiring` | 有 `api_key_id` 时调用 Renew，否则调用 Resolve |
| `expired` | 有 `api_key_id` 时调用 Renew，否则调用 Resolve |
| `suspended` | 清除本地运行凭据，不继续调用模型 |
| `unavailable` | 清除本地运行凭据，显示服务不可用 |

### KEY-02：Provision

为已认证且已获授权的 subject 创建或绑定运行凭据。仅完成 OIDC 回调不会触发该接口；用户必须在界面中明确同意。

#### 请求

```http
POST /api/worker/v1/runtime-credential/provision HTTP/1.1
Authorization: Bearer <oidc-access-token>
Content-Type: application/json
Accept: application/json
Idempotency-Key: 2b9b6c80-7758-4d3f-94c6-b72d91ca8c53

{
  "provider_id": "example-ai"
}
```

| 字段/Header | 必需 | 要求 |
| --- | --- | --- |
| `Idempotency-Key` | 是 | 一个逻辑创建操作对应一个 UUID |
| `provider_id` | 是 | 必须与 Profile `provider.id` 一致 |

服务端必须以“已认证 subject + Provider + Idempotency-Key”为幂等范围。相同 key 和相同 payload 的重试必须返回相同逻辑结果；相同 key 携带不同 payload 必须返回 `409 Conflict`。

#### 成功响应

返回格式见[运行凭据统一响应](#55-运行凭据统一响应)。首次创建可以返回 `201 Created`，已经存在或完成绑定时可以返回 `200 OK`。

### KEY-03：Resolve

解析已经绑定到当前 subject 的活动运行凭据。Resolve 不得创建新的授权资格。

#### 请求

```http
POST /api/worker/v1/runtime-credential/resolve HTTP/1.1
Authorization: Bearer <oidc-access-token>
Content-Type: application/json
Accept: application/json

{
  "provider_id": "example-ai",
  "api_key_id": "key-123"
}
```

| 字段 | 必需 | 说明 |
| --- | --- | --- |
| `provider_id` | 是 | Profile 中声明的 Provider ID |
| `api_key_id` | 否 | Bootstrap 返回的已知凭据 ID |

不存在可解析凭据时返回 `404`。服务端可以轮换不透明秘密值，但不得把其他 subject 或 Provider 的凭据返回给调用方。

### KEY-04：Renew

轮换即将过期或已经过期的运行凭据。

#### 请求

```http
POST /api/worker/v1/runtime-credential/renew HTTP/1.1
Authorization: Bearer <oidc-access-token>
Content-Type: application/json
Accept: application/json
Idempotency-Key: 2f94dc48-201a-475e-a61a-69d7880e1186

{
  "provider_id": "example-ai",
  "api_key_id": "key-123"
}
```

`provider_id`、`api_key_id` 和 `Idempotency-Key` 均为必需。幂等规则与 Provision 相同。新凭据生效后，服务端应该尽快使旧秘密失效，并记录任何必要的重叠有效窗口。

### 5.5 运行凭据统一响应

Provision、Resolve 和 Renew 成功时使用相同响应结构：

```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-store
Pragma: no-cache

{
  "provider_id": "example-ai",
  "api_key": "<secret-runtime-api-key>",
  "api_key_id": "key-123",
  "status": "active",
  "expires_at": "2026-09-01T00:00:00Z"
}
```

| 字段 | 必需 | 要求 |
| --- | --- | --- |
| `provider_id` | 是 | 必须与请求及 Profile 完全一致 |
| `api_key` | 是 | 非空，最多 16 KiB；只用于模型网关 |
| `api_key_id` | 否 | 建议返回，用于生命周期管理和审计 |
| `status` | 是 | 固定为 `active` |
| `expires_at` | 否 | RFC 3339 时间 |

包含 `api_key` 的响应必须使用 `Cache-Control: no-store`，并且应该使用 `Pragma: no-cache`。反向代理、WAF、APM、应用日志和审计日志都不得记录 Authorization header 或 `api_key`。

### 5.6 Key Binding 错误响应

错误应该使用 RFC 9457 `application/problem+json`：

```http
HTTP/1.1 403 Forbidden
Content-Type: application/problem+json

{
  "type": "https://ai.example.edu/problems/model-entitlement-denied",
  "title": "Model entitlement denied",
  "status": 403,
  "detail": "The current account cannot use this provider",
  "code": "model_entitlement_denied"
}
```

| HTTP 状态 | 含义 |
| --- | --- |
| `400` | 请求结构或 Provider ID 无效 |
| `401` | Access Token 缺失、无效、过期或 audience 错误；应该返回 `WWW-Authenticate` |
| `403` | scope、机构成员资格、模型授权、账号状态或创建策略拒绝 |
| `404` | 不存在可解析或可更新的凭据 |
| `409` | 幂等冲突或凭据生命周期状态冲突 |
| `429` | 限流；应该返回 `Retry-After` |
| `5xx` | 服务端错误；响应不得包含 Token 或 API Key |

`code` 应保持稳定，供界面和日志分类；`detail` 可以变化，但不得泄露敏感信息。

机器可读的 Key Binding 契约见 [`protocol/openapi.yaml`](../protocol/openapi.yaml)。

## 6. 模型网关接口组

### MODEL-01：Chat Completions

`dsh-oidc` 当前通过 DSH 官方 Pi adapter 调用 OpenAI Chat Completions 兼容接口。

#### 请求

```http
POST /open/api/v1/chat/completions HTTP/1.1
Host: ai.example.edu
Authorization: Bearer <runtime-api-key>
Content-Type: application/json
Accept: text/event-stream

{
  "model": "example-model",
  "messages": [
    { "role": "user", "content": "你好" }
  ],
  "stream": true,
  "max_tokens": 1024
}
```

| 项目 | 要求 |
| --- | --- |
| 认证 | 接受 Key Binding 返回的 `api_key`，不得接受 OIDC Token 代替 |
| `model` | 必须实现 Profile `provider.models` 中声明的模型 ID |
| `messages` | 支持 OpenAI Chat Completions 消息结构 |
| `stream` | 必须支持流式响应 |
| 图片输入 | 只有 Profile 为该模型声明 `input: ["text", "image"]` 时才要求支持 |
| Reasoning 参数 | 必须与 Profile 的 `reasoning`、`reasoningEfforts` 和 `compat` 声明一致 |
| Tools | 必须支持 `tools`、`tool_choice` 和流式 `tool_calls`，供 DSH Agent 调用工具 |

#### 流式成功响应

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache

data: {"id":"chatcmpl-1","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"你"}}]}

data: {"id":"chatcmpl-1","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"好"},"finish_reason":null}]}

data: {"id":"chatcmpl-1","object":"chat.completion.chunk","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

服务端必须按运行 API Key 检查 subject 绑定、Provider scope、凭据状态、过期时间、撤销状态和配额。已经撤销或轮换的旧 Key 不得无限期继续访问。

#### 错误响应

错误应与 OpenAI-compatible 客户端互操作，例如：

```json
{
  "error": {
    "message": "Runtime credential has expired",
    "type": "authentication_error",
    "code": "credential_expired"
  }
}
```

至少应正确区分：`400` 请求错误、`401` 凭据无效、`403` 无权访问、`404` 模型不存在、`429` 限流或配额不足、`5xx` 服务端错误。

模型目录由受信任的 Enterprise Profile 声明；模型网关不需要实现 `/models` 才能符合本规范。

## 7. 三组接口的一致性要求

服务端必须保证：

1. UserInfo `sub` 与 ID Token `sub` 完全一致；
2. Key Binding 从 Access Token 得到同一个 subject，不信任请求 body 中的身份；
3. Profile `provider.id`、Bootstrap `provider.id` 和运行凭据 `provider_id` 完全一致；
4. 运行 API Key 只授权给对应 subject 和 Provider；
5. 模型网关实际提供的模型 ID、输入模态和 reasoning 能力与 Profile 声明一致；
6. OIDC Token 只用于 UserInfo 和 Key Binding，运行 API Key 只用于模型网关，两者不能互换；
7. 账号停用、授权撤销和凭据轮换能够传播到运行凭据及模型网关；
8. 日志可以记录关联 ID、不透明 subject 引用、Provider ID 和 `api_key_id`，但不得记录 Token 或 `api_key`；
9. Bootstrap 中的 `subject` 只能用于辅助展示，不能覆盖 OIDC `sub` 或 `name`。

## 8. 标准调用顺序

```text
客户端 -> OIDC-01 Discovery
客户端 -> OIDC-02 Authorization（浏览器 + PKCE）
OIDC  -> 127.0.0.1:<port>/oauth/callback
客户端 -> OIDC-03 Token
客户端 -> OIDC-04 JWKS（校验 ID Token）
客户端 -> OIDC-05 UserInfo
客户端 -> KEY-01 Bootstrap
客户端 -> KEY-02 Provision（首次且用户明确同意）
         或 KEY-03 Resolve（凭据活动）
         或 KEY-04 Renew（凭据即将/已经过期）
客户端 -> MODEL-01 Chat Completions
```

客户端在 Access Token 即将过期时使用 OIDC-03 的 Refresh Token grant。退出时清除本地 OIDC 会话和运行凭据，并在可用时调用 OIDC-06。

## 9. 联调验收清单

完整接入至少必须通过以下测试：

- Discovery issuer 精确匹配、必需 endpoint 完整、PKCE `S256` 已发布；
- callback 只使用 `127.0.0.1:<实际端口>/oauth/callback`；
- state、nonce、PKCE verifier、ID Token 签名、audience 和有效期均被校验；
- UserInfo 返回非空 `sub`，并与 ID Token 一致；`name` 可以正常显示；
- 四个 Key Binding 接口全部存在，并按状态正确选择 Provision、Resolve 或 Renew；
- Provision/Renew 幂等，错误重放返回 `409`；
- Provider ID 在 Profile、Bootstrap 和凭据响应中完全一致；
- Key Binding 的 Access Token 不能调用模型网关，模型 API Key 不能调用 UserInfo 或 Key Binding；
- 运行凭据过期、撤销、账号停用和越权访问均被拒绝；
- Chat Completions 可以完成至少一次流式文本对话；声明多模态或 reasoning 的模型通过对应测试；
- Token、Authorization header 和 `api_key` 不出现在 URL、日志、APM、错误详情或审计数据中；
- 所有失败响应均有稳定、可诊断且不泄密的错误结构。

Enterprise Profile 的完整字段见 [Enterprise Profile 规范](enterprise-profile.md)，OIDC 细节见 [OIDC 互操作规范](oidc-interoperability.md)，Key Binding 的生命周期与安全语义见 [Key Binding 协议](key-binding-protocol.md)。
