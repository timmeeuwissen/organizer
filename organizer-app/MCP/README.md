# MCP exposure (Organizer App)

This directory documents how Nitro API routes could be exposed via Model Context Protocol (MCP) servers, per project rules.

## Relevant HTTP API surface

| Method | Path | Notes |
|--------|------|--------|
| GET/POST | `/api/proxy?url=` | Allowlisted proxy; see `server/utils/proxyAllowlist.ts` |
| GET | `/api/icons` | Cached icon responses |
| POST | `/api/ai/analyze` | AI text analysis; Zod-validated body |
| POST | `/api/ai/test-integration` | Test AI API key |
| POST | `/api/auth/refresh` | OAuth refresh helper |
| GET | `/api/auth/oidc-callback` | OAuth code exchange |
| POST | `/api/system/audit` | Append JSONL audit line (`AUDIT_LOG_PATH`) |

## OpenAPI

Machine-readable contract: [openapi/openapi.yaml](../openapi/openapi.yaml).

## Example MCP tool (conceptual)

A thin MCP server could wrap `POST /api/ai/analyze` with:

- **Input:** `{ "text": string, "integration": { "provider", "apiKey", ... } }`
- **Output:** `{ "success": boolean, "result"?: object, "error"?: string }`

Keep secrets (API keys) out of MCP logs; prefer server-side configuration where possible.

## Local documentation

- `make api-docs` — prints the OpenAPI path and opens it when a viewer is available.
