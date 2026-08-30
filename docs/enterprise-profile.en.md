# Enterprise Profile specification (`dsh-oidc/v1alpha1`)

[简体中文](enterprise-profile.md) | **English**

## Status and conformance

This document specifies the data contract consumed by `dsh-oidc` `0.1.x`. The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHOULD**, **SHOULD NOT**, and **MAY** are interpreted as described by RFC 2119 and RFC 8174.

The canonical machine-readable schema is [`schema/enterprise-profile.v1alpha1.schema.json`](../schema/enterprise-profile.v1alpha1.schema.json). Runtime validation is intentionally stricter in several security-sensitive URL cases. A conforming profile MUST pass both JSON Schema validation and `normalizeEnterpriseProfile()`.

## Trust model

Profiles are trusted deployment configuration, not user input. Nevertheless, the parser is fail-closed:

- unknown keys are rejected at the root and at every executable-relevant nested object;
- total serialized profile size is limited to 512 KiB;
- production URLs require HTTPS;
- development HTTP is accepted only for explicit loopback hosts;
- URL credentials, fragments, and endpoint-base query strings are rejected;
- only the built-in `openai-compatible` adapter can be selected;
- Key Binding accepts only `baseURL`;
- logo data URLs accept PNG/WebP only, not SVG.

A remote administration system MAY distribute profile JSON only if the host authenticates the source, verifies integrity, and stages changes through review. Downloaded JSON does not become safe merely because it contains no JavaScript.

## Root object

| Field | Required | Meaning |
| --- | --- | --- |
| `schemaVersion` | yes | Exact string `dsh-oidc/v1alpha1`. |
| `id` | yes | Profile ID matching `^[a-z][a-z0-9-]{0,63}$`. |
| `displayName` | yes | Human-readable integration name. |
| `organization` | no | Organization label; defaults to `displayName`. |
| `nativeInstitutionID` | no | Identifier passed only to a native backend; defaults to `id`. |
| `allowInsecureDevelopment` | no | Enables loopback HTTP for local development. Network HTTP additionally requires `insecureDevelopmentOrigin`. |
| `insecureDevelopmentOrigin` | no | Exact non-TLS development origin. It is accepted only together with `allowInsecureDevelopment: true`, and every HTTP OIDC/key-binding/provider endpoint must use this exact origin. Never ship it in a production profile. |
| `brand` | yes | Bounded presentational values. |
| `oidc` | yes | OIDC public-client facts. |
| `keyBinding` | yes | Key Binding base URL only. |
| `provider` | yes | One local OpenAI-compatible Provider route and model list. |

## Branding

Branding changes only approved presentation surfaces. It does not alter authentication or executable behavior.

| Field | Limit / behavior |
| --- | --- |
| `productName` | 80 characters; document/sidebar label. |
| `organizationName` | 120 characters. |
| `mark` | 1–4 characters used when no logo is supplied. |
| `logoURL` | HTTPS URL or base64 PNG/WebP, at most 128 KiB as text. Remote images use `referrerPolicy=no-referrer`. |
| `primaryColor` | Six-digit hex color. Only a bounded DSH token set is overridden. |
| `loginTitle` | 120 characters. |
| `loginDescription` | 500 characters. |
| `supportURL` | Absolute HTTPS URL opened with `noopener noreferrer`. |

Profiles MUST NOT include logos or names without permission from the rights holder. Operators concerned about remote-image tracking SHOULD package a base64 PNG/WebP or host the asset on a controlled origin with a restrictive CSP.

## OIDC object

```json
{
  "issuer": "https://id.example.edu/oidc",
  "clientId": "dsh-web-public-client",
  "scopes": ["openid", "profile", "offline_access"]
}
```

- `issuer` is an OIDC Issuer Identifier. Paths are supported; query and fragment are not. Exact string equality with Discovery metadata is required.
- `clientId` identifies a public client. No client secret belongs in a profile or this plugin.
- `scopes` MUST contain `openid` and `profile`, contain no whitespace within an item, and contain no duplicates.
- `offline_access` SHOULD be requested when the Provider issues refresh tokens and policy allows it.
- Key Binding authorization scopes are deployment-specific but SHOULD use the names in the reference example.

The Web redirect URI is fixed to `http://127.0.0.1:<DSH-port>/oauth/callback`. The host and path are not configurable; the port follows the DSH WebServer's actual listening port.

## Key Binding object

```json
{ "baseURL": "https://ai.example.edu/api/worker/v1" }
```

This is the only accepted field. The parser derives:

- protocol type: `worker-user-center-v1`;
- Provider ID: `provider.id`;
- credential reference: uppercase Provider ID with non-alphanumerics replaced by `_`, followed by `_API_KEY`.

Endpoint paths and JSON field mappings are protocol facts and MUST NOT be customized by profiles.

## Provider object

The Provider object is data interpreted by a local audited adapter.

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | yes | DSH route ID and credential-reference source. Must be unique across loaded profiles. |
| `displayName` | no | User-facing Provider name. |
| `adapter` | yes | Exact string `openai-compatible`. |
| `baseURL` | yes | HTTPS OpenAI-compatible API base. |
| `reasoning` | no | Default DSH/pi-ai reasoning level, default `high`. |
| `defaultContextWindow` | no | Positive safe integer, default 262144. |
| `defaultMaxTokens` | no | Positive safe integer, default 32768. |
| `maxRequestImageBytes` | no | Accumulated native-image request budget. |
| `requestImagePixelBudget` | no | Image normalization pixel budget. |
| `requestImageMaxBytes` | no | Per-normalized-image byte budget. |
| `streamIdleTimeoutMs` | no | Positive idle timeout, default 300000. |
| `retryPolicy` | no | DSH provider-owned retry policy; default normal/2 retries. |
| `compat` | no | Bounded pi-ai OpenAI compatibility facts. |
| `models` | yes | 1–128 unique model entries. |

`retryPolicy.mode` is `normal` or `always`. `always` can retry indefinitely until success, cancellation, or disposal and SHOULD NOT be enabled without an explicit product decision. The policy is validated again by DSH.

`compat` accepts only the keys enumerated in the JSON Schema. Operators MUST describe provider facts accurately; a compatibility override can change request semantics, though it cannot execute code.

## Model entries

Each model has:

- required `id`;
- optional display `name`;
- `input` containing `text`, `image`, or both (default `text`);
- optional positive `contextWindow` and `maxTokens`;
- optional `reasoning` boolean;
- optional `reasoningEfforts` object, or `false`;
- optional bounded `compat` overrides.

If a model supports thinking but not selectable reasoning effort, set:

```json
{
  "compat": { "supportsReasoningEffort": false }
}
```

The adapter then enables the profile's thinking behavior while removing an unsupported user-selected effort before validation and transport. The request is not rejected merely because the provider lacks an effort parameter.

## Secret prohibition

Profiles MUST NOT contain:

- OIDC client secrets;
- access, refresh, or ID tokens;
- model API keys;
- private signing keys;
- session cookies;
- personal identity data.

The OIDC client is public. Runtime secrets are created after login and stored only by the active DSH Credential Provider.

## Versioning

Unknown `schemaVersion` values are rejected. During alpha, any field may change between `v1alphaN` versions. A stable `v1` will use additive optional fields for minor releases and a new schema version for incompatible changes. See [Compatibility](compatibility.en.md).
