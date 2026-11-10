# Daily Mind leaderboard

Leaderboards and stats for the games posted in the `daily-mind-challenges` Slack chat, mainly Krillion.

- **App:** Next.js on Vercel, Postgres on Neon.
- **Import:** a scheduled Claude task reads the Slack group DM each evening and POSTs the raw messages to `/api/ingest`. Parsing happens in the app (`lib/games.ts`), so the import job stays dumb and re-sending messages is harmless (one score per game, puzzle and player).
- **Topics (bonus):** each emoji in a Krillion share is one of the day's 7 prompts, stored per slot in `krillion_answers`. When prompts are saved via `/api/krillion-prompts`, the page shows each person's average points per topic.

## Krillion scoring

| Emoji | Tier | Points |
|---|---|---|
| ⬛ `:black_large_square:` | Miss | 0 |
| 🫧 `:bubbles:` | Plankton | 10 |
| 🐟 `:fish:` | Schooler | 30 |
| 🦑 `:squid:` | Rare | 60 |
| 🏮 `:izakaya_lantern:` | Deep cut | 85 |
| 🌟 `:star2:` | One in a Krillion | 100 |

These were checked against every posted total. An unknown emoji gets its value inferred from the posted total. Puzzle numbers map to dates (`#118` = 2026-11-10).

Also parsed: Wordle (`Wordle 1,605 4/6`) and Connections (`Connections Puzzle #890` + grid).

## Setup

1. Import this repo into Vercel (Add New → Project).
2. In the Vercel project, Storage → Create Database → **Neon** (free). This adds `DATABASE_URL`.
3. Settings → Environment Variables:
   - `INGEST_SECRET`: a long random string (`openssl rand -hex 24`)
   - `SITE_PASSWORD` (optional): asks visitors for a password (any username)
4. Nothing to do for tables: the app creates them on first request (`npm run db:migrate` also works).
5. Redeploy.

## API

All endpoints need `Authorization: Bearer $INGEST_SECRET`.

- `GET /api/ingest` → `{ last: { ran_at, messages, scores, latest_ts } }`. The import uses `latest_ts` as Slack's `oldest` bound.
- `POST /api/ingest` with `{ "messages": [{ "ts", "user", "user_name", "text" }] }` → `{ received, saved, alreadyHad, latest_ts }`
- `POST /api/krillion-prompts` with `{ "puzzle": 118, "prompts": [{ "slot": 1, "prompt": "...", "topic": "Geography" }] }`

## Local development

```
npm install
INGEST_SECRET=test npm run dev
```

Without `DATABASE_URL` the app uses an in-process Postgres (PGlite) stored in `.pglite/`.

```
npm test
```
