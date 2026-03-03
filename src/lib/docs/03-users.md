# Users

Endpoints for reading user profiles and managing your own account.

## Get Current User

```http
GET /api/users/me
```

Returns the profile of the currently authenticated user. Requires authentication.

### Example Request

```http
GET /api/users/me
Authorization: YOUR_TOKEN
```

### Example Response

```json
{
  "id": "111111111111111111",
  "username": "cooluser",
  "globalname": "Cool User",
  "discriminator": "0",
  "avatar": "abc123hash",
  "bio": "Just a cool person.",
  "banner": "https://example.com/my-banner.png",
  "bal": 50,
  "added_at": "2024-01-15T10:30:00.000Z"
}
```

### Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `not_logged_in` | 400 | No auth token supplied |
| `invalid_key` | 400 | Token is expired or invalid |
| `user_not_found` | 404 | Authenticated user has no site account |
| `server_error` | 500 | An unexpected internal error occurred |

---

## Update Your Profile

```http
PATCH /api/users/me
```

Updates editable fields on your own profile. Requires authentication. Only the fields you include in the request body are updated — omitted fields are left unchanged.

### Request Body

```json
{
  "bio": "My new bio!",
  "banner": "https://example.com/my-banner.png"
}
```

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `bio` | string \| null | Max 200 characters | Your profile bio. Pass `null` or an empty string to reset to the default |
| `banner` | string \| null | Must be a valid `http`/`https` URL | Your profile banner image URL. Pass `null` or an empty string to remove it |

### Example Request

```http
PATCH /api/users/me
Authorization: YOUR_TOKEN
Content-Type: application/json

{
  "bio": "Building cool Discord bots 🤖"
}
```

### Example Response

```json
{ "success": true }
```

### Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `not_logged_in` | 400 | No auth token supplied |
| `invalid_key` | 400 | Token is expired or invalid |
| `invalid_body` | 400 | Request body was missing or not valid JSON |
| `bio_too_long` | 400 | `bio` exceeded the 200-character limit |
| `invalid_banner` | 400 | `banner` is not a valid `http`/`https` URL |
| `user_not_found` | 404 | Authenticated user has no site account |
| `db_update_failed` | 500 | Database write failed |
| `server_error` | 500 | An unexpected internal error occurred |

---

## Rcoin Balance

Every user account starts with **50 <:Rcoin:948896802298548224> Rcoins** (R$) on sign-up. Rcoins are the on-site currency used for coin-based bot voting.

### How to Earn Rcoins

- **Sign up** — 50 R$ granted automatically when you create your account.
- **Vote for bots** — some bots may reward voters (bot-owner configured).

### How to Spend Rcoins

- **Coin-based voting** — spend **10 R$ per vote** on bots that have opted into this system.
- **Transfer** — send Rcoins to another user via the `/transfer` Discord bot command.

> Your current balance is always included in the `GET /api/users/me` response as the `bal` field.