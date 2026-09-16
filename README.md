# حفلاتي — Hafalati

A trilingual (Arabic / French / English), RTL-first **wedding & events booking platform** for the
Tunisian market. Customers plan an event through an 11-step wizard (hall, photography, decor,
beauty, dresses, music, catering, cake, flowers, invitations, transport), reserve a date, and pay a
deposit; an admin manages the catalog, confirms payments, and issues Tunisian-compliant invoices
(TVA 19% + Timbre Fiscal).

Built as an **installable PWA** on top of a TypeScript REST API and PostgreSQL. The architecture is
**vendor-ready** (hybrid model): today it ships as an admin-managed catalog owned by a single
platform vendor; independent vendors can be onboarded in a later phase with no schema rewrite.

> This repository grew out of a front-end-only prototype. See `docs`-level notes in the plan file.
> Prices are in **TND** (millime precision); the default locale is Arabic with RTL.

## Tech stack

| Layer | Choice |
|---|---|
| Monorepo | pnpm workspaces |
| API | Node.js + Express + TypeScript, Prisma ORM, PostgreSQL, Zod, JWT (argon2) |
| Web | React + Vite + Tailwind CSS, vite-plugin-pwa, react-router, @tanstack/react-query, react-i18next |
| Shared | `@hafalati/shared` — enums, category metadata, fiscal engine, Zod schemas, DTOs |

```
apps/
  api/   Express REST API (+ Prisma schema, migrations, seed)
  web/   React PWA (customer wizard + role-gated /admin)
packages/
  shared/  Types, Zod schemas, fiscal/pricing utils, i18n keys (used by api + web)
  config/  Shared tsconfig bases
```

## Prerequisites

- Node.js ≥ 20, pnpm ≥ 9
- Docker (for local PostgreSQL) — or point `DATABASE_URL` at your own Postgres

## Quick start

```bash
# 1. Install
pnpm install

# 2. Env — copy the example and generate JWT secrets
cp .env.example apps/api/.env
#   (edit apps/api/.env: set JWT_ACCESS_SECRET / JWT_REFRESH_SECRET, e.g. `openssl rand -hex 32`)
printf 'VITE_API_URL=/api/v1\n' > apps/web/.env

# 3. Database — start Postgres, apply schema, seed the catalog
pnpm db:up
pnpm db:migrate      # applies migrations
pnpm db:seed         # ports the catalog (53 offerings) → TND, trilingual

# 4. Run both apps (API on :4000, web on :5173 with an /api proxy)
pnpm dev
#   or individually:  pnpm api    |    pnpm web
```

Open <http://localhost:5173>.

### Seeded accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@hafalati.tn` | `Admin1234` |
| Customer | `client@hafalati.tn` | `Customer1234` |

## How it works

- **Wizard (`/plan`)** — one generic `StepCategory` component driven by `ServiceCategory`, backed by
  the catalog API. Selections + event date/type persist in `localStorage`.
- **Fiscal totals** are computed by a single source of truth (`packages/shared/src/pricing.ts`):
  `subtotal → TVA 19% → + Timbre Fiscal → total → 30% deposit`. **The API always recomputes totals
  from DB prices** — the client figure is a display preview only.
- **Reservation** — confirming a booking locks each date-bound offering's calendar day (`Availability`
  → `BOOKED`) inside a transaction and records a pending deposit `Payment`.
- **Admin (`/admin`)** — dashboard KPIs, bookings board, and payment confirmation (→ booking
  `CONFIRMED`, deposit `PAID`, invoice issued). Online payment collection is deferred to Phase 2; the
  `Payment` model is already structured for a Tunisian gateway drop-in.

## API surface (`/api/v1`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` `/auth/login` `/auth/refresh` | — | Auth (JWT access + refresh) |
| GET | `/auth/me` | user | Current user |
| GET | `/categories` `/offerings` `/offerings/:id` `/offerings/:id/availability` | — | Catalog |
| POST | `/bookings` · `/bookings/:id/confirm` · `/bookings/:id/cancel` | user | Booking lifecycle |
| GET | `/bookings` `/bookings/:id` | user | My bookings |
| * | `/admin/offerings` `/admin/bookings` `/admin/payments/:id/confirm` `/admin/stats` | admin | Management |

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Run API + web in parallel |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests (shared fiscal + API integration) |
| `pnpm db:up` / `pnpm db:down` | Start / stop the Postgres container |
| `pnpm db:migrate` / `pnpm db:seed` / `pnpm db:reset` | Prisma migrate / seed / reset |

## Tests

```bash
pnpm db:up && pnpm db:seed    # API integration tests need a seeded DB
pnpm test
```

- `packages/shared` — fiscal math (TVA/Timbre/deposit, millime precision).
- `apps/api` — full reservation lifecycle (register → book → confirm → admin confirm → invoice) + RBAC.

## Localization & fiscal

- Locales: `ar` (default, RTL), `fr`, `en` — switch in the header; `dir` flips automatically.
- Currency: **TND** with millime precision. Fiscal rules (rates, Timbre Fiscal, deposit) are
  configurable via `apps/api/.env` (`TVA_RATE`, `TIMBRE_FISCAL_TND`, `DEPOSIT_RATE`).

## Online payments (Phase 2)

Customers can pay the deposit online. A `PaymentGateway` abstraction
(`apps/api/src/payments/`) has two implementations selected by `PAYMENT_PROVIDER`:

- **`mock`** (default) — an in-app sandbox checkout (`/payment/mock/:ref`) that drives the same
  webhook path, so the whole flow is demoable locally with **no credentials**.
- **`konnect`** — the Tunisian [Konnect](https://konnect.network) gateway (hosted checkout + webhook).
- **`flouci`** — [Flouci](https://developers.flouci.com) (`generate_payment` + `verify_payment`).
- **`d17`** — D17 / La Poste Tunisienne (adapter scaffold; confirm endpoint/field names against D17's
  merchant docs before go-live).

Set `PAYMENT_PROVIDER` to the one you want and fill that provider's keys. All four implement the same
`PaymentGateway` interface, so nothing else changes.

Flow: `POST /bookings/:id/pay` → hosted checkout → gateway webhook
(`POST /payments/webhook/:provider`, signature-verified, idempotent) → `settlePayment()` marks the
booking **CONFIRMED**, deposit **PAID**, and issues the invoice — the exact same code path as an admin
manual confirmation. The return page (`/payment/return`) polls `GET /payments/:id/status`.

Try it locally: run the wizard → confirm a booking → **"ادفع العربون الآن / Pay deposit online"** →
sandbox checkout → success. Bank transfer remains a fallback.

## Notifications (Phase 2)

Customers are notified when a booking is **received** (PENDING) and again when the deposit is
**confirmed** (CONFIRMED), in their own locale (AR/FR/EN), across multiple channels.

**Channels** — set `NOTIFY_CHANNELS` (csv) to any of `email,sms,whatsapp,telegram`. Each channel sends
via its real provider when configured, and otherwise **logs to the console**, so every channel works in
dev with zero credentials:

| Channel | Real provider | Recipient |
|---|---|---|
| `email` | SMTP (nodemailer), `NOTIFY_PROVIDER=smtp` | `user.email` |
| `sms` | Twilio (`TWILIO_*`) | `user.phone` |
| `whatsapp` | Twilio WhatsApp (`TWILIO_WHATSAPP_FROM`) | `user.phone` |
| `telegram` | Telegram Bot (`TELEGRAM_BOT_TOKEN`) | `user.telegramChatId` (or `TELEGRAM_OPS_CHAT_ID`) |

Email gets the full message; SMS/WhatsApp/Telegram get a compact one-liner. Sends are best-effort (a
delivery failure never breaks a booking) and deduped per channel by a unique `(bookingId, type, channel)`
constraint, so a retried webhook can't re-send. Admins see every message + status under
**Admin → Notifications**.

**Telegram linking** — customers link their Telegram from **My account**: the app issues a one-time
code and a bot deep link (`t.me/<bot>?start=<code>`); pressing Start makes the bot backend
(`POST /notifications/telegram/webhook/<secret>`) capture the chat id and store it on the user. Without
a configured bot, a dev **"simulate link"** button drives the same path so the flow is demoable locally.

## Roadmap

- **Phase 2** — ✅ online payment gateways (mock / Konnect / Flouci / D17), ✅ notifications across
  email / SMS / WhatsApp / Telegram, ✅ customer Telegram-linking, ✅ invoice PDF export.
- **Phase 3 (in progress)** — ✅ vendor accounts (hybrid onboarding: self-service + admin-created),
  per-vendor dashboard (own offerings, availability, bookings, stats), admin moderation, and a gated
  public catalog (only approved offerings from approved vendors are visible). Next: commission/payout
  ledger, reviews & ratings, public search & filtering, promo packages ("الباقات").

## Vendor marketplace (Phase 3)

The `Vendor` model, `VENDOR` role, and `ServiceOffering.vendorId` were built in from day one; Phase 3
activates them. Vendors register at **`/vendor/register`** (or an admin creates them). A vendor's account
starts **PENDING** and their offerings start **PENDING moderation**; an offering is only shown in the
public wizard when it is active, **approved**, and its vendor is platform-owned or **approved** — so a
suspended vendor or an unmoderated offering silently drops out. Admins approve/suspend vendors and
approve/reject offerings under **Admin → Vendors / Moderation**. Each vendor has a `commissionRate` (the
hook the payout-ledger slice will read). Seeded demo logins: `vendor@hafalati.tn` (approved) and
`vendor2@hafalati.tn` (pending), password `Vendor1234`.
