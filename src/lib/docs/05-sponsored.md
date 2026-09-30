# Sponsored Slots

A **Sponsored** slot is a clearly-labeled, pinned placement for a bot or server - not a vote boost.

## What you get

- One pinned **Sponsored** card atop `/bots`, `/servers`, and category pages, plus a homepage strip and a related sidebar slot on bot pages.
- Capped at **1–2 slots** per page so the listing stays useful.
- Sponsored entries are **excluded from all vote-ordered rankings** (`/top`, trending, "Best Bots of the Month"). Rankings stay 100% vote-driven - placement is never pay-to-win on votes.
- Links are normal on-site links. Any paid external link carries `rel="sponsored nofollow"`.
- Premium pins **expire automatically**; expired listings drop out of the slot and return to normal rankings.

## Price

- **R$ 1000 = 1 week** of Premium (Sponsored pin) per bot or server.
- R$ is **free-earned only** (check-ins, votes, bounties, referrals) - no payments.
- Each purchase adds 1 week: buying while Premium is active **extends** the current pin.

## How to buy (self-serve)

1. Earn R$ (see the **R$ Rewards** tab on your dashboard for your wallet and history).
2. Go to **Dashboard → My Bots** (or **My Servers**).
3. On the listing card, press **Go Premium** (R$ 1000/week). The card shows **★ Premium until <date>** while active.
4. You can also buy/extend from the listing's **edit page** (Premium panel above the form).
5. The purchase is logged in **R$ History** as `Premium: <bot|server> <id> (1 week)`.

## Notes for owners

- Only the listing owner can buy (bot `owners` array / server `owner` field); others get `not_owner`.
- Insufficient balance returns `insufficient_funds` - earn more R$ first.
- Expired pins are swept by the daily settle-rewards run; getters also ignore expired rows.

Success metric for v1: **1 premium bot**.
