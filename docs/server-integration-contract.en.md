# Complete institutional server integration contract

[简体中文](server-integration-contract.md) | **English**

This is the primary server-side integration specification for `dsh-oidc`. It treats OIDC Authorization Code + PKCE, Key Binding, and the model gateway as capabilities that one **institutional enterprise-model integration service** must deliver together, not as three optional modules.

“MUST”, “MUST NOT”, and “SHOULD” are normative. This project does not restate the full OIDC, OAuth, or OpenAI-compatible specifications. Key Binding is the fixed protocol defined by this project and has a machine-readable contract in [`protocol/openapi.yaml`](../protocol/openapi.yaml).

## 1. One server contract, three protocol surfaces

A conforming integration has one accountable service owner for all three surfaces:

| Surface | Purpose | Enterprise Profile entry | Required |
| --- | --- | --- | --- |
| OIDC Provider | Login, identity, and Access Tokens | `oidc.issuer`, `oidc.clientId`, `oidc.scopes` | Yes |
| Key Binding | Bind an authenticated user to a revocable model runtime credential | `keyBinding.baseURL` | Yes |
| Model gateway | Invoke declared enterprise models with that credential | `provider.baseURL`, `provider.id`, `provider.models` | Yes |

“One service” means one complete delivery, versioning, and security boundary. It does not require all URLs to share one hostname or process. OIDC Discovery permits endpoints on different HTTPS origins, and an institution may route the surfaces to internal subsystems. From a `dsh-oidc` operator's perspective, however, the integration is complete only when all three are available and satisfy the cross-surface invariants below.

The following degraded arrangements are not supported:

- OIDC alone followed by distribution of one global model API key to every user;
- Key Binding that trusts an employee number, name, or subject submitted by the client;
- a model catalog without subject-based authorization and credential lifecycle enforcement;
- a Profile that supplies private scripts, CSS, Provider adapters, or protocol paths.

## 2. Fixed client callback

The Web composition is a local, single-user application. Its OIDC Public Client MUST register this exact redirect URI:

```text
http://127.0.0.1:3080/oauth/callback
```

- The host is fixed to IPv4 loopback `127.0.0.1`; do not register `localhost`, a LAN address, or a public hostname.
- The path is fixed to `/oauth/callback`.
- `3080` is the recommended DSH WebServer port. If the operator explicitly changes the DSH port, the registered URI MUST use that same port.
- The client is a Public Client without a Client Secret.
- Authorization Code Flow and PKCE `S256` are required.

This is the browser's return address to the local DSH process. `oidc.issuer`, Key Binding, and the model gateway remain remote institutional services and MUST use HTTPS in production. The current Web backend deliberately rejects a DSH WebServer bound to anything other than `127.0.0.1`; it is not a shared public-Web session solution.

## 3. Required OIDC Provider capabilities

### 3.1 Discovery

`GET {issuer}/.well-known/openid-configuration` MUST return an `issuer` exactly equal to configuration and publish at least:

- `authorization_endpoint`;
- `token_endpoint`;
- `jwks_uri`;
- `userinfo_endpoint`;
- `code_challenge_methods_supported` containing `S256`.

If `id_token_signing_alg_values_supported` is published, it MUST include the currently supported `RS256`. `revocation_endpoint` is optional; when present, the client makes a best-effort token revocation during logout.

### 3.2 Authorization and Token

The service MUST accept an Authorization Code request containing `state`, `nonce`, `code_challenge`, and `code_challenge_method=S256`. The token endpoint MUST validate `code_verifier` and MUST NOT require a Client Secret from the Public Client.

The ID Token MUST contain valid `iss`, `aud`, `sub`, `iat`, `exp`, and the request's `nonce`. It must be signed with an RS256 key carrying `kid` and published by the Discovery `jwks_uri`.

### 3.3 UserInfo

UserInfo MUST return:

- `sub`: required, non-empty, and exactly equal to the ID Token `sub`;
- `name`: strongly recommended and used as the human-readable account label; the client falls back to `sub` when absent.

`dsh-oidc` does not call private directory APIs or support JSONPath name mapping. Institutions that want a human-readable name must publish the standard UserInfo `name` claim. See [OIDC interoperability](oidc-interoperability.en.md) for detailed constraints.

### 3.4 Access Token

The Access Token may be a JWT or opaque token. Key Binding MUST validate issuer, audience, expiry, not-before, scopes, subject, account state, and institutional authorization. The client does not submit a body subject that can be trusted.

## 4. Required Key Binding capabilities

The institutional service MUST implement all four fixed `worker-user-center/v1` operations:

```text
GET  {keyBinding.baseURL}/bootstrap
POST {keyBinding.baseURL}/runtime-credential/provision
POST {keyBinding.baseURL}/runtime-credential/resolve
POST {keyBinding.baseURL}/runtime-credential/renew
```

Every request uses the OIDC Access Token:

```http
Authorization: Bearer <oidc-access-token>
```

The service MUST derive the subject from the validated token and enforce Provider authorization, account state, and credential lifecycle policy. `provision` and `renew` MUST support `Idempotency-Key`. A successful response's `provider_id` MUST exactly match Profile `provider.id`. `api_key` MUST be returned with `Cache-Control: no-store` and MUST NOT enter URLs, logs, APM, audit fields, or error details.

The full requests, responses, lifecycle states, errors, and idempotency rules are defined in [Key Binding protocol](key-binding-protocol.en.md) and [`protocol/openapi.yaml`](../protocol/openapi.yaml). Omitting any of the four operations is not a complete server implementation.

## 5. Required model-gateway capabilities

`provider.baseURL` MUST identify an institution-authorized, OpenAI-compatible HTTPS API. The current adapter uses DSH's official Pi adapter and its OpenAI-compatible networking implementation. The server MUST:

- accept the runtime API key returned by Key Binding;
- validate key state, Provider scope, expiry, quota, and revocation;
- implement the model IDs and input capabilities declared in the Profile;
- return interoperable streaming responses, errors, and rate-limit results;
- prevent revoked or rotated old keys from retaining indefinite access.

The trusted Enterprise Profile declares the model catalog. A browser or remote response cannot inject an executable adapter.

## 6. Cross-protocol invariants

One institutional integration service MUST guarantee:

1. OIDC UserInfo `sub` equals ID Token `sub`.
2. Key Binding resolves the same subject from the same Access Token.
3. Bootstrap, credential responses, and Enterprise Profile use exactly the same `provider.id`.
4. A Key Binding API key is authorized only for that subject and Provider.
5. Model IDs actually served by the gateway match Profile declarations.
6. Logout, account suspension, authorization revocation, and credential rotation can propagate to runtime credentials.
7. OIDC tokens and model API keys have separate purposes and validation paths and cannot substitute for one another.
8. Logs may contain an opaque subject reference, `api_key_id`, and correlation ID, but never tokens or `api_key`.

Display data from bootstrap cannot override OIDC identity. The user name comes only from standard UserInfo `name`; Key Binding is responsible for authorization and credential binding.

## 7. Complete flow

1. The client reads OIDC Discovery.
2. The browser starts Authorization Code + PKCE at the institutional login page.
3. The identity platform redirects to `127.0.0.1:<port>/oauth/callback`.
4. The client validates state, nonce, issuer, audience, signature, and time claims, then reads UserInfo.
5. The client calls Key Binding `bootstrap` with the OIDC Access Token.
6. After explicit user consent it calls `provision`; an existing credential uses `resolve`, and an expiring credential uses `renew`.
7. the DSH Credential Provider stores the OIDC session and runtime model key locally.
8. The DSH Provider adapter invokes the model gateway with the runtime key.
9. Logout clears the local session and runtime key and makes a best-effort standard OIDC revocation call. Final remote runtime-key revocation remains an institutional policy responsibility.

## 8. Enterprise Profile mapping

The Profile contains only public, reviewable deployment facts:

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

The Profile MUST NOT contain a Client Secret, OIDC token, model API key, real user data, administrative credential, or remotely executable content. See [Enterprise Profile](enterprise-profile.en.md) for all fields.

## 9. Conformance and acceptance

An institutional server integration is conforming only when it:

- implements OIDC Discovery, Authorization Code + PKCE, Token, JWKS, and UserInfo;
- registers the exact loopback redirect URI for a Public Client;
- implements all four Key Binding operations with the required idempotency and response security;
- provides a Profile-consistent model gateway that accepts bound credentials;
- passes positive and negative tests for state, nonce, subject, Provider, expiry, revocation, authorization bypass, replay, and log redaction;
- does not introduce global keys, Client Secrets, or private directory APIs into client configuration.

See [Getting started](getting-started.en.md#7-acceptance-checklist) and the [public release checklist](release-checklist.en.md) for operational acceptance.
