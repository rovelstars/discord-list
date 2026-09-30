# Sponsored Slots

A **Sponsored** slot is a clearly-labeled, pinned placement for a bot or server - not a vote boost. This is a manual v1: there is no checkout, billing UI, or expiry automation.

## What you get

- One pinned **Sponsored** card atop `/bots`, `/servers`, and category pages, plus a homepage strip and a related sidebar slot on bot pages.
- Capped at **1–2 slots** per page so the listing stays useful.
- Sponsored entries are **excluded from all vote-ordered rankings** (`/top`, trending, "Best Bots of the Month"). Rankings stay 100% vote-driven - placement is never pay-to-win on votes.
- Links are normal on-site links. Any paid external link carries `rel="sponsored nofollow"`.

## Price & trial

- **$15/mo** introductory price.
- **2-week test** available for first-time sponsors before committing.

## How to buy

There is no self-serve checkout yet. **DM the site admin** with your bot/server ID to start a test or a paid month.

## Manual fulfillment (admin)

1. Confirm the order (who paid, which bot/server ID, start/end dates) in your own records.
2. Set the flag in the database - no new columns, no migration:
   - Bot: `UPDATE Bots SET promoted = 1 WHERE id = '<BOT_ID>';`
   - Server: `UPDATE Servers SET promoted = 1 WHERE id = '<SERVER_ID>';`
3. Verify the Sponsored card renders on `/bots` (or `/servers`) and the homepage.
4. When the slot ends, flip it back: `UPDATE Bots SET promoted = 0 WHERE id = '<BOT_ID>';` (same for `Servers`).

Success metric for v1: **1 paying bot**.
