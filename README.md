# Maison Aurelle — Fine Jewelry E-commerce Platform

A complete, production-ready luxury jewelry store built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS 4**, **Drizzle ORM** and **PostgreSQL (Neon)** — with ten fully distinct storefront themes, a visual homepage builder, a theme customizer and a full admin panel. Prices and checkout are localised for **Pakistan (PKR)**.

## Highlights

- **10 complete themes** — Soft Luxury, Modern Minimal, Rose Boutique, Dark Luxury, Editorial Magazine, Old Money Elegance, Scandinavian Minimal, Parisian Chic, Golden Glamour and Contemporary Boutique. Each has its own header, footer, product card, product page, collection layout, typography pairing, palette, buttons, animation style and homepage composition.
- **Theme engine** (`src/themes`) — centralised, typed theme definitions → sanitised CSS variables. Draft/publish workflow, live preview, restore defaults, separate mobile settings. Switching themes never touches catalogue or order data.
- **Visual homepage builder** — drag-and-drop sections (15 types, 50+ layout variants), per-device visibility, autosaved drafts, publish.
- **Storefront** — faceted shop (category, collection, material, size, metal colour, price, availability), instant search with autocomplete + popular/recent searches, quick view, product galleries with zoom/lightbox/video, size guides, sticky mobile add-to-bag, reviews, wishlist (synced to account), recently viewed, complete-the-look, cart drawer + cart page with discount codes and free-shipping progress.
- **Checkout & payments** — Cash on Delivery, EasyPaisa, JazzCash and bank transfer. Wallet and bank payments require a private receipt; uploading it does not verify the payment. Card checkout is not offered. Server-side price re-calculation, atomic stock reservation, automatic restock on cancellation.
- **Customer accounts** — register, sign in, password reset, profile, addresses, order history with status tracking (Pending → Confirmed → Processing → Shipped → Delivered / Cancelled).
- **Admin** (`/admin`) — dashboard & analytics with interactive charts, products (variants, SKU/barcode, stock thresholds, media, SEO, duplicate), collections & categories, orders (status workflow, tracking, payments, refunds, invoices, CSV export), customers, inventory with full movement history, discounts, reviews moderation, CMS pages, messages/subscribers, theme customizer, homepage builder and settings.
- **SEO** — per-page metadata, Open Graph, canonical URLs, JSON-LD (Product, BreadcrumbList, FAQPage, JewelryStore, WebSite), `sitemap.xml`, `robots.txt`, clean `/products/[slug]` URLs.
- **Security** — bcrypt password hashing, signed httpOnly session cookies with token versioning, account lockout, role-based admin (admin/staff), server-side validation (zod) on every mutation, rate limiting, escape-first Markdown rendering, CSV-injection-safe exports, security headers.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Components, Server Actions, Turbopack) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4 + CSS-variable design tokens, self-hosted fonts (Fontsource, OFL) |
| Database | PostgreSQL via Drizzle ORM — Neon in production, embedded PGlite for local development |
| Auth | bcryptjs + jose (HS256 JWT in httpOnly cookie) |
| Payments | EasyPaisa, JazzCash, bank transfer (receipt required), Stripe Checkout (optional). COD disabled |
| Charts / DnD | Recharts, dnd-kit |
| Hosting | Vercel (functions pinned to `cle1`, next to the Neon `us-east-2` database) |

## Getting started (local)

```bash
npm install
npm run db:setup   # creates .data/pglite, runs migrations and seeds demo data
npm run dev        # http://localhost:3000
```

No database server is needed locally — without `DATABASE_URL` the app uses an embedded Postgres (PGlite) stored in `.data/`. Local demo admin: `admin@maisonaurelle.pk` / `Aurelle#Dev2026` (set `SEED_ADMIN_PASSWORD` to change it before seeding).

## Environment variables

| Name | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Production | Postgres connection string (pooled). `POSTGRES_URL` is also accepted. |
| `AUTH_SECRET` | Production | 32+ character secret used to sign sessions and order links. |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | First deploy | Credentials of the admin account created when the database is first seeded. |
| `SEED_CUSTOMER_PASSWORD` | Optional | Password for the demo customer `ayesha@example.com`. |
| `NEXT_PUBLIC_SITE_URL` | Optional | Canonical site URL (defaults to the Vercel production URL). |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Optional | Enables card payments via Stripe Checkout. |
| `RESEND_API_KEY` / `EMAIL_FROM` | Optional | Enables order confirmation, status and password-reset emails. |
| `NEON_CLAIM_URL` / `NEON_DB_EXPIRES_AT` | Optional | Shows the "claim your database" notice in the admin for temporary Neon databases. |

Never commit secrets — `.env*` files are git-ignored.

## Database

Schema lives in `src/db/schema.ts`; SQL migrations are generated into `drizzle/` with `npm run db:generate`. On every Vercel build, `scripts/setup-db.ts` applies pending migrations and seeds demo content **only if the database is empty** (idempotent). The seed creates 24 products, 12 collections, 45 customers, ~210 historical orders, reviews, discount codes and CMS pages.

### Claiming the temporary Neon database

The production deployment was provisioned with a free, claimable Neon database that **expires 72 hours after creation unless claimed**:

1. Sign in to the admin → **Settings → System & database** and click **Claim database on Neon** (or open the claim link from the deployment notes).
2. Complete the claim in your Neon account (free tier).
3. Claiming rotates the credentials: copy the new **pooled connection string** from the Neon console.
4. In Vercel → Project → Settings → Environment Variables, update `DATABASE_URL`, then redeploy.

## Payments

- **EasyPaisa / JazzCash / bank transfer** — the customer must upload a JPG, PNG, WEBP or PDF receipt before the order can be placed. The receipt is not public. Staff verify the funds and click *Verify payment*, or *Reject payment*. Cash on Delivery is disabled and can be turned back on under **Settings → Payments**. Replace the placeholder account details there. A new PostgreSQL database can be tested and activated under **Settings → Database connection** without exposing the password to the browser.
- **Stripe** — set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, then add a webhook endpoint `https://<your-domain>/api/stripe/webhook` with events `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `charge.refunded`. Orders are marked paid only after Stripe confirms payment (webhook or server-side session retrieval); abandoned sessions are cancelled and restocked.

## Project structure

```
src/
  app/(store)/        storefront routes (home, shop, collections, products, cart, checkout, account, CMS)
  app/admin/          admin panel (protected)
  app/api/            route handlers (search, cart quote, wishlist, media, Stripe webhook, exports, health)
  app/actions/        server actions (auth, checkout, store, admin/*)
  components/         store, sections, admin and UI components
  db/                 schema, migrations runner, seed data
  lib/                catalog, pricing, orders, auth, analytics, stripe, email, markdown…
  themes/             theme types, presets (12 themes), engine, section registry, fonts
public/images         original product & campaign photography (WebP)
public/videos         atelier & product films
```

## Imagery

Product and campaign images for the Aurelia, Amara, Celestine, Luna Crescent and Soleil pieces, the homepage campaign and the videos are original artwork created for this project. Additional photography is used under the [Unsplash License](https://unsplash.com/license) and credited on `/pages/credits`.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Migrate + seed (if empty) + production build |
| `npm run start` | Start the production server |
| `npm run db:setup` | Run migrations and seed against `DATABASE_URL` (or local PGlite) |
| `npm run db:generate` | Generate SQL migrations from the schema |
| `npm run typecheck` | TypeScript check |
