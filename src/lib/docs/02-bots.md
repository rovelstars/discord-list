# Bots

Endpoints for querying and interacting with bots listed on Rovel Discord List.

## List Bots

```http
GET /api/bots
```

Returns a paginated list of bots. Supports searching, sorting by newest, and sorting by votes (trending).

### Query Parameters

| Parameter  | Type    | Default | Description |
|------------|---------|---------|-------------|
| `q`        | string  | -       | Search query - matches against bot name and short description |
| `limit`    | number  | `10`    | Number of results to return (max `50`) |
| `offset`   | number  | `0`     | Pagination offset |
| `new`      | flag    | -       | Sort by newest first. Cannot be combined with `trending` |
| `trending` | flag    | -       | Sort by most votes. Cannot be combined with `new` |

> **Flags** are query parameters that are activated by their presence - you don't need to set a value. E.g. `/api/bots?trending`

### Example Request

```http
GET /api/bots?q=music&limit=5&offset=0
```

### Example Response

```json
[
  {
    "id": "123456789012345678",
    "slug": "my-cool-bot",
    "username": "MyCoolBot",
    "discriminator": "0000",
    "avatar": "abc123hash",
    "short": "A cool bot that does cool things.",
    "votes": 42,
    "servers": 150,
    "invite": "https://discord.com/oauth2/authorize?client_id=...",
    "bg": null
  }
]
```

### Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `invalid_number` | 400 | `limit` or `offset` is not a valid number |
| `limit_too_high` | 400 | `limit` exceeds the maximum of `50` |
| `no_multi_sort`  | 400 | Both `new` and `trending` were specified together |
| `server_error`   | 500 | An unexpected internal error occurred |

---

## Get Bot

```http
GET /api/bots/:id
```

Returns the full detail object for a single bot. The `:id` segment accepts either the bot's Discord snowflake ID or its slug.

### Example Request

```http
GET /api/bots/my-cool-bot
```

### Example Response

```json
{
  "bot": {
    "id": "123456789012345678",
    "slug": "my-cool-bot",
    "username": "MyCoolBot",
    "discriminator": "0000",
    "avatar": "abc123hash",
    "short": "A cool bot that does cool things.",
    "desc": "A **longer** markdown description.",
    "votes": 42,
    "servers": 150,
    "invite": "https://discord.com/oauth2/authorize?client_id=...",
    "website": "https://mycoolbot.com",
    "source_repo": "https://github.com/example/mycoolbot",
    "support": "discord123",
    "owners": ["111111111111111111"],
    "lib": "discord.js",
    "prefix": "/",
    "bg": null,
    "donate": null,
    "opted_coins": false,
    "added_at": "2024-01-15T10:30:00.000Z"
  },
  "randombots": [ ]
}
```

### Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `missing_id` | 400 | No ID or slug was provided in the URL |
| `not_found`  | 404 | No bot with that ID or slug exists |
| `server_error` | 500 | An unexpected internal error occurred |

---

## Vote for a Bot

```http
POST /api/bots/:id/vote
```

Submits a vote for a bot on behalf of the authenticated user. Requires authentication.

There are two voting modes depending on whether the bot has opted into coin-based voting:

- **Time-based** (default) - one vote per user per 24 hours.
- **Coin-based** - spend Rcoins instead of waiting. Only available when the bot has `opted_coins: true`. Every **10 Rcoins** equals **1 vote**. The `coins` parameter must be a positive multiple of 10.

### Query Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| `key`     | string | Auth token (alternatively supply via header or cookie - see [Authentication](/docs#authentication)) |
| `coins`   | number | Rcoins to spend. Only valid when the bot has `opted_coins: true` |

### Example Request (time-based)

```http
POST /api/bots/123456789012345678/vote
Authorization: YOUR_TOKEN
```

### Example Request (coin-based)

```http
POST /api/bots/123456789012345678/vote?coins=20
Authorization: YOUR_TOKEN
```

### Example Response

```json
{ "success": true }
```

### Webhook Notification

If the bot owner has configured a webhook URL, the API will POST a payload to that URL after every successful vote:

```json
{
  "user": {
    "id": "111111111111111111",
    "username": "cooluser",
    "discriminator": "0",
    "avatar": "abc123",
    "bal": 40
  },
  "coins": 20,
  "votes": 2,
  "currentVotes": 44
}
```

The request also includes an `Authorization` header set to the bot's private code if one is configured.

### Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `not_logged_in` | 400 | No auth token supplied |
| `invalid_key` | 400 | Token is expired or invalid |
| `missing_bot_id` | 400 | No bot ID in the URL |
| `no_bot_found` | 400 | Bot does not exist |
| `cooldown` | 400 | User already voted in the last 24 hours (time-based). Response includes `try_after` as `HH:MM:SS` |
| `invalid_voting_type` | 400 | `coins` param supplied but bot does not use coin-based voting |
| `invalid_coins` | 400 | `coins` is not a positive multiple of 10 |
| `coins_not_divisble_by_10` | 400 | `coins` value is not divisible by 10 |
| `insufficient_coins` | 400 | User does not have enough Rcoins |
| `db_update_failed` | 500 | Database write failed |

---

## Get Bot Comments

```http
GET /api/bots/:id/comments
```

Returns all reviews and threaded replies for a bot.

### Example Response

```json
{
  "comments": [
    {
      "id": "uuid-here",
      "bot_id": "123456789012345678",
      "user_id": "111111111111111111",
      "rating": 43,
      "text": "Really useful bot!",
      "parent_id": null,
      "created_at": "2024-01-15T10:30:00.000Z",
      "replies": [
        {
          "id": "uuid-reply",
          "parent_id": "uuid-here",
          "text": "Agreed!",
          "rating": null
        }
      ]
    }
  ]
}
```

> **Note:** `rating` is stored as an integer - it is the actual rating multiplied by 10. So a rating of `4.3` is stored and returned as `43`. Divide by 10 to get the display value.

---

## Post a Comment

```http
POST /api/bots/:id/comments
```

Posts a review or reply for a bot. Requires authentication.

### Request Body

```json
{
  "rating": 4.3,
  "text": "This bot is fantastic!",
  "parent_id": null
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `rating` | number | Yes (top-level only) | Rating from `0.5` to `5.0`, one decimal place |
| `text` | string | Yes (replies only) | Comment body, max 2000 characters |
| `parent_id` | string \| null | No | ID of the comment being replied to. Omit or `null` for a top-level review |

**Rules:**
- Each user may only post **one top-level review** per bot.
- Replies can only be made to top-level comments - no deep nesting.
- Replies must include `text`. Rating is ignored on replies.

### Example Response

```json
{
  "comment": {
    "id": "new-uuid",
    "bot_id": "123456789012345678",
    "user_id": "111111111111111111",
    "rating": 43,
    "text": "This bot is fantastic!",
    "parent_id": null,
    "created_at": "2024-06-01T12:00:00.000Z"
  }
}
```

### Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `not_logged_in` | 401 | No auth token supplied |
| `invalid_key` | 401 | Token is expired or invalid |
| `bot_not_found` | 404 | Bot does not exist |
| `user_not_found` | 403 | Authenticated user has no site account |
| `rating_required` | 400 | Top-level comment is missing a rating |
| `invalid_rating` | 400 | Rating is out of range or has more than one decimal place |
| `already_reviewed` | 409 | User already has a top-level review for this bot |
| `parent_not_found` | 404 | The specified `parent_id` does not exist |
| `cannot_nest_replies` | 400 | Attempted to reply to a reply |
| `text_required` | 400 | Reply body was empty |
| `create_failed` | 500 | Database insert failed |