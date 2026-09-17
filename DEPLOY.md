# Deploying حفلاتي to Railway

This repo ships as a **single service**: the Node/Express API also serves the
built React PWA from the same origin (so there is no CORS to configure and the
whole app lives on one URL). A **managed PostgreSQL** plugin backs it, and
database migrations run automatically on every deploy.

```
┌──────────────────── Railway project ────────────────────┐
│                                                          │
│   hafalati (Dockerfile)          Postgres (plugin)       │
│   ├─ /api/v1/*   → Express  ───▶ DATABASE_URL            │
│   └─ /*          → PWA (apps/web/dist)                   │
│      start: prisma migrate deploy && node dist/server.js │
└──────────────────────────────────────────────────────────┘
```

The pieces that make this work are already in the repo:

- **`Dockerfile`** — builds the web (with `VITE_API_URL=/api/v1`) + the API,
  then runs them from one container.
- **`railway.json`** — tells Railway to use the Dockerfile, health-check
  `/health`, and start with `pnpm start:prod`.
- **`apps/api` `start:prod`** — `prisma migrate deploy && node dist/server.js`.
- **`SERVE_WEB=true`** — makes the API serve `apps/web/dist` with SPA fallback.

---

## 1. Create the project

1. Push this repo to GitHub (branch `main`).
2. On [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → pick this repo.
3. Railway detects `railway.json` + `Dockerfile` and creates one service. Let the first build run (it may fail until the database + variables below exist — that's expected).

## 2. Add managed PostgreSQL

1. In the project, **New** → **Database** → **Add PostgreSQL**.
2. This creates a `Postgres` service exposing a `DATABASE_URL` variable.

## 3. Wire the database into the app

On the **app service** → **Variables**, add a reference (not a copy) so it always tracks the plugin:

```
DATABASE_URL = ${{Postgres.DATABASE_URL}}
```

> Use the Railway variable-reference syntax `${{Postgres.DATABASE_URL}}` so credentials rotate automatically.

## 4. Set the required variables

On the app service → **Variables**:

| Variable | Value | Why |
|---|---|---|
| `NODE_ENV` | `production` | production behavior |
| `JWT_ACCESS_SECRET` | `openssl rand -hex 32` | signs access tokens |
| `JWT_REFRESH_SECRET` | `openssl rand -hex 32` (different) | signs refresh tokens |
| `PLATFORM_NAME` | `حفلاتي` | shown on invoices |
| `PLATFORM_PHONE` / `PLATFORM_EMAIL` / `PLATFORM_ADDRESS` | your business details | invoices + footer |
| `BANK_TRANSFER_DETAILS` | your RIB / bank line | deposit-by-transfer instructions |

`SERVE_WEB`, `WEB_DIST_DIR` and `PORT` are handled for you (the image sets the
first two; Railway injects `PORT`). Fiscal defaults (`TVA_RATE=0.19`,
`TIMBRE_FISCAL_TND=1.0`, `DEPOSIT_RATE=0.3`) are baked in — override only if they change.

## 5. Generate the public URL, then point the app at itself

1. App service → **Settings** → **Networking** → **Generate Domain**. You'll get something like `https://hafalati-production.up.railway.app`.
2. Add these variables with that exact URL (used for CORS and for building payment return/webhook links):

```
WEB_ORIGIN      = https://<your-app>.up.railway.app
PUBLIC_WEB_URL  = https://<your-app>.up.railway.app
PUBLIC_API_URL  = https://<your-app>.up.railway.app
```

Saving variables triggers a redeploy. The PWA calls `/api/v1` on its own origin,
so no rebuild is needed when the domain changes.

## 6. Deploy & seed once

- On deploy, `start:prod` runs `prisma migrate deploy` (creates all tables) and boots the server. Watch the logs for `🎉 حفلاتي API listening on port …`; the health check hits `/health`.
- To load the demo catalog + logins **on a fresh database**, open the app service → **⋯** → **Shell** (or `railway run`) and run:

  ```bash
  pnpm --filter @hafalati/api prisma:seed
  ```

  > ⚠️ The seed is destructive — it **wipes and rebuilds** all data. Run it only on an empty database, never against live bookings.

  It creates `admin@hafalati.tn / Admin1234`, `vendor@hafalati.tn / Vendor1234`, `client@hafalati.tn / Customer1234`, the full offering catalog, and 3 promo packages. **Change the admin password immediately** after first login (or edit the seed before running).

Visit your URL — the PWA loads, and `…/api/v1/categories` returns JSON.

## 7. Custom domain (optional)

App service → **Settings** → **Networking** → **Custom Domain** → add your domain and set the CNAME at your DNS provider. Then update `WEB_ORIGIN` / `PUBLIC_WEB_URL` / `PUBLIC_API_URL` to the custom domain and redeploy.

---

## Going live: payments & notifications

Everything defaults to **mock/console** so the app runs with zero third-party
credentials. Switch a channel on by setting its variables (see `.env.example`
for the full list):

- **Online payments** — set `PAYMENT_PROVIDER` to `konnect` | `flouci` | `d17` and fill that provider's keys. In the provider dashboard, set the **webhook URL** to `PUBLIC_API_URL` + `/api/v1/payments/webhook/<provider>` and the **return URL** to `PUBLIC_WEB_URL` + `/payment/return`.
- **Email** — `NOTIFY_PROVIDER=smtp` + `SMTP_*`.
- **SMS / WhatsApp** — add `sms`/`whatsapp` to `NOTIFY_CHANNELS` + `TWILIO_*`.
- **Telegram** — `TELEGRAM_BOT_TOKEN` + `TELEGRAM_BOT_USERNAME`, add `telegram` to `NOTIFY_CHANNELS`, and point the bot webhook at `PUBLIC_API_URL` + `/api/v1/notifications/telegram/webhook/<TELEGRAM_WEBHOOK_SECRET>`.

A channel with no credentials logs instead of sending, so partial configuration is safe.

---

## How redeploys work

Push to `main` → Railway rebuilds the Dockerfile and redeploys. `prisma migrate
deploy` applies any **new** migrations automatically (existing data is
preserved — migrations are additive). The health check gates the rollout, and a
failed deploy keeps the previous version serving.

## Troubleshooting

- **Build fails at `pnpm install`** — ensure Railway is building with the Dockerfile (it reads `railway.json`); the pinned `packageManager` (`pnpm@10.33.0`) is used via corepack.
- **App boots but 500s on every request** — `DATABASE_URL` isn't wired; confirm the `${{Postgres.DATABASE_URL}}` reference on the app service.
- **`Environment variable not found: JWT_ACCESS_SECRET`** — the JWT secrets are required in production; set both.
- **Payment return/webhook links point at localhost** — set `PUBLIC_WEB_URL` / `PUBLIC_API_URL` to the real domain and redeploy.
- **Health check timing out** — first deploy runs migrations before listening; the 120s health-check timeout in `railway.json` covers it, but a very large migration set can need more.

## Notes

- Single instance is assumed (migrations run on start). If you scale to multiple
  replicas, move `prisma migrate deploy` to a Railway **pre-deploy** command and
  set the start command to just `node dist/server.js`.
- `Dockerfile` builds on Railway's clean network. (Building the image inside a
  restricted CI/sandbox with a TLS-intercepting proxy can fail at
  `corepack`/`pnpm` fetch — that's an environment limitation, not the image.)
