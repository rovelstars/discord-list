# Introduction

Welcome to the **Rovel Discord List API** — the public REST API powering [Rovel Discord List](https://discord.rovelstars.com).

You can use this API to fetch bot and server data, submit votes, post reviews, and manage your account programmatically.

## Base URL

```
https://discord.rovelstars.com
```

All endpoints are relative to this base URL. The API speaks JSON — every request body should be `Content-Type: application/json` and every response is `application/json`.

## Authentication

Most write endpoints and some read endpoints require you to authenticate as a Discord user.

Authentication is done via a **Discord OAuth2 access token**. Once a user logs in on the site, their token is stored in a `key` cookie. You can supply this token in any of the following ways (checked in this order):

| Method | How |
|--------|-----|
| Query parameter | `?key=YOUR_TOKEN` |
| `Authorization` header | `Authorization: YOUR_TOKEN` |
| `RDL-key` header | `RDL-key: YOUR_TOKEN` |
| Cookie | `key=YOUR_TOKEN` |

> **Note:** The token is a raw Discord OAuth2 access token — not a bot token. You obtain one by completing the Discord OAuth2 flow on the site (`/api/auth`).

### Obtaining a Token

Direct users to the Discord OAuth2 login flow:

```
GET /api/auth?redirect=/your-page
```

After authorisation Discord redirects back to the site, which sets the `key` cookie automatically. For programmatic use, extract the token from the `Set-Cookie` response header.

## Response Format

All responses are JSON objects. Successful responses include the relevant data at the top level. Error responses always include an `err` field:

```json
{ "err": "not_logged_in" }
```

## Common Error Codes

| Code | Meaning |
|------|---------|
| `not_logged_in` | No authentication token was supplied |
| `invalid_key` | Token is expired or invalid |
| `no_bot_found` | The requested bot does not exist |
| `server_error` | An unexpected internal error occurred |

## Rate Limiting

There are no hard API rate limits enforced at the HTTP level right now, but please be a good citizen — cache responses where possible and avoid hammering endpoints in tight loops. Abusive clients may be blocked without notice.