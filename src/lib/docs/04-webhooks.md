# Webhooks

When a user votes for your bot, Rovel Discord List can notify your server in real time by sending an HTTP POST request to a URL you configure — this is your **vote webhook**.

## Setting Up a Webhook

1. Open your bot's dashboard on Rovel Discord List.
2. Paste your webhook URL into the **Webhook URL** field.
3. Optionally set a **Webhook Secret** (called the bot code). This is sent as both an `Authorization` header and appended as `?code=` in the query string, so you can verify requests are genuinely from RDL.
4. Save your changes.

That's it — RDL will POST to your URL every time someone votes for your bot.

---

## Webhook Payload

RDL sends a `POST` request with `Content-Type: application/json`. The body is a JSON object with the following shape:

```json
{
  "user": {
    "id": "111111111111111111",
    "username": "cooluser",
    "discriminator": "0",
    "avatar": "abc123hash",
    "bal": 30
  },
  "coins": 20,
  "votes": 2,
  "currentVotes": 44
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `user.id` | string | Discord snowflake of the user who voted |
| `user.username` | string | Discord username of the voter |
| `user.discriminator` | string | Discord discriminator (`"0"` for new-style usernames) |
| `user.avatar` | string \| null | Avatar hash — construct the URL as `https://cdn.discordapp.com/avatars/{id}/{avatar}.webp` |
| `user.bal` | number | The voter's Rcoin balance **after** the vote was processed |
| `coins` | number \| null | Rcoins the user spent on this vote, or `null` for a time-based vote |
| `votes` | number | Number of votes added by this action (always `1` for time-based; `coins / 10` for coin-based) |
| `currentVotes` | number | Your bot's **total** vote count after this vote was applied |

---

## Verifying Requests

If you set a **Webhook Secret**, RDL sends it in two places on every request:

```
Authorization: YOUR_SECRET
```

```
POST https://your-server.com/webhook?code=YOUR_SECRET
```

Check at least one of these in your handler before processing the payload. A minimal example in Node.js:

```js
app.post('/webhook', (req, res) => {
  const secret = req.headers['authorization'] ?? req.query.code;
  if (secret !== process.env.RDL_WEBHOOK_SECRET) {
    return res.sendStatus(401);
  }

  const { user, votes, currentVotes } = req.body;
  console.log(`${user.username} voted! Bot now has ${currentVotes} votes.`);

  res.sendStatus(200);
});
```

---

## Delivery Behaviour

- RDL attempts to deliver the webhook **once** per vote. There is no automatic retry on failure.
- If your endpoint responds with a non-2xx status code, RDL logs the failure internally but the vote is **still counted** — a webhook failure does not roll back the vote.
- Delivery is best-effort and fire-and-forget. Your endpoint should respond within a few seconds to avoid being considered failed.

> **Tip:** Respond with `200 OK` immediately and process the payload asynchronously if your handler does heavy work (e.g. database writes, sending Discord messages). This prevents timeouts from being logged as failures.

---

## Testing Your Webhook

You can test your endpoint locally using a tunnelling tool like [ngrok](https://ngrok.com) or [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/):

```bash
# expose localhost:3000 to the internet
ngrok http 3000
```

Paste the generated HTTPS URL into your bot's Webhook URL field on the dashboard, vote for your bot on the site, and inspect the incoming request in your terminal.

---

## Example Implementations

### discord.js (Node.js)

```js
import express from 'express';

const app = express();
app.use(express.json());

app.post('/vote', (req, res) => {
  const auth = req.headers['authorization'] ?? req.query.code;
  if (auth !== process.env.RDL_SECRET) return res.sendStatus(401);

  const { user, votes, currentVotes } = req.body;

  // Send a thank-you DM to the voter
  client.users.fetch(user.id).then(u =>
    u.send(`Thanks for voting! The bot now has **${currentVotes}** votes 🎉`)
  ).catch(() => {});

  res.sendStatus(200);
});

app.listen(3000);
```

### Python (Flask)

```python
from flask import Flask, request, abort
import os

app = Flask(__name__)

@app.route('/vote', methods=['POST'])
def vote():
    auth = request.headers.get('Authorization') or request.args.get('code')
    if auth != os.environ['RDL_SECRET']:
        abort(401)

    data = request.json
    user = data['user']
    print(f"{user['username']} voted! Bot now has {data['currentVotes']} votes.")
    return '', 200
```

### Bun / Hono

```ts
import { Hono } from 'hono';

const app = new Hono();

app.post('/vote', async (c) => {
  const auth = c.req.header('Authorization') ?? c.req.query('code');
  if (auth !== process.env.RDL_SECRET) return c.text('Unauthorized', 401);

  const { user, votes, currentVotes } = await c.req.json();
  console.log(`${user.username} voted — total: ${currentVotes}`);

  return c.text('OK');
});

export default app;
```
