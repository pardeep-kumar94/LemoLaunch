# LemoLaunch

A daily launch directory. Visitors browse today's launches, step back through the week, filter by category, search, upvote what they'd use, and see what's coming next. Makers submit launches for review.

Built with Next.js 16 (App Router, Cache Components), PostgreSQL and Prisma, styled with Tailwind CSS. UI components come from shadcn/ui. The "Daily Edition" palette (warm ink on paper, with lemon and leaf accents) lives as shadcn theme variables in `src/app/globals.css`; type is Bricolage Grotesque, Geist and Geist Mono.

## Getting started

Requires Node 20+ and a running PostgreSQL server.

```bash
npm install
touch .env                    # then add the variables below (at least DATABASE_URL)
createdb launchpad            # or create the database however you prefer
npm run db:migrate            # apply migrations
npm run db:seed               # load sample launches
npm run dev
```

Open http://localhost:3000.

### Environment variables

Put these in `.env` locally and in the Vercel project settings in production. Only `DATABASE_URL` is required for local development.

| Variable | What it is |
|---|---|
| `DATABASE_URL` | Postgres connection string. In production, Neon's pooled string. |
| `DATABASE_URL_UNPOOLED` | Production only: Neon's direct string, used by `vercel-build` to run migrations. |
| `SITE_URL` | Public address, e.g. `https://lemolaunch.com`. Used in payment return links and badge embed codes. Empty locally. |
| `DODO_PAYMENTS_API_KEY`, `DODO_PAYMENTS_WEBHOOK_KEY`, `DODO_PRODUCT_ID` | Dodo Payments. `DODO_PRODUCT_ID` is one one-time product with "pay what you want" turned on; each checkout sets its own amount (Fast Track, or a boost's total). Leave empty locally to use the simulated checkout. |
| `DODO_PAYMENTS_ENVIRONMENT` | `test_mode` or `live_mode`. |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` | Cloudflare R2 for uploads. Leave empty to store uploads in `./uploads`. |
| `GOOGLE_SITE_VERIFICATION`, `BING_SITE_VERIFICATION` | Optional HTML-tag verification for Google Search Console and Bing Webmaster Tools. Not needed when the domain is verified with a DNS TXT record. |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | PostHog product analytics (project API key; host defaults to `https://us.i.posthog.com`, use `https://eu.i.posthog.com` for an EU project). Leave the key empty to turn analytics off. |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics 4 measurement ID (`G-…`). Optional; leave empty to skip GA4. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | "Continue with Google" sign-in. Leave empty to hide the button. |

### Google sign-in

1. In [Google Cloud Console](https://console.cloud.google.com/), create or pick a project, then open **Google Auth Platform** (APIs & Services → OAuth consent screen) and set it up: app name LemoLaunch, support email, audience **External**, and publish it when you go live. Only the `openid`, `email` and `profile` scopes are used, so no verification review is needed.
2. Under **Clients**, create an **OAuth client ID** of type **Web application**:
   - **Authorized JavaScript origins:** `http://localhost:3000`, `https://www.lemolaunch.com`
   - **Authorized redirect URIs:** `http://localhost:3000/api/auth/google/callback`, `https://www.lemolaunch.com/api/auth/google/callback`
3. Put the client ID and secret in `.env` (and in Vercel) as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, then restart the dev server or redeploy.

The redirect URI is built from `SITE_URL` (or the request's host when it's empty), so it must match one of the URIs above exactly. Signing in with Google links to an existing account with the same email; new accounts get no password and can set one later under Profile → Account.

After changing `schema.prisma` and migrating, restart `npm run dev` so it picks up the regenerated Prisma client.

The seed dates launches relative to the day you run it (yesterday, today, tomorrow) and replaces all existing products, topics and votes. Re-run it whenever you want a fresh "today".

## Pages

| Route | What it shows |
| --- | --- |
| `/` | Today's launches only: hero with search and countdown, top-3 podium, ranked feed (`?topic=slug`), sidebar |
| `/archive` | Past launches: yesterday (default), `?range=week`, `?range=month`, or a single `?day=YYYY-MM-DD` |
| `/products/[slug]` | Product page with video and screenshots, details, comments and related launches |
| `/categories`, `/categories/[slug]` | Category directory and every launch in a category, ranked |
| `/search?q=` | Search by name, tagline, description or maker |
| `/signin`, `/signup` | Email + password accounts |
| `/profile` | Signed-in only. My products (submissions and their status, withdraw while in review), edit profile (photo, name, headline, website), account (change email or password) |
| `/submit` | Publish a launch (signed-in only): plan (free or Fast Track with a time slot), details, platforms and links, logo, 1-4 screenshots, video |
| `/pricing` | Free, Fast Track and Boost, with the boost price table |
| `/boost/[slug]` | Boost one of your launches: placement, days, start day |
| `/submit/payment`, `/boost/payment`, `/dev/checkout` | Return pages after paying for Fast Track or a boost; simulated checkout (local development only) |

## How it works

- **Launch days are UTC calendar days.** A product's `launchDate` decides which day it appears on. The homepage always shows today; earlier days are in the archive and the 7/14/30-day leaderboard; later days can't be voted on yet. At most 100 products launch per day (`DAILY_LAUNCH_LIMIT` in `src/lib/publish.ts`): free launches join a queue and take the first day from tomorrow with room.
- **Accounts** are email + password. Passwords are hashed with scrypt; sessions live in the `Session` table and the `lp_session` cookie holds a random token whose SHA-256 is the session id.
- **Platforms:** every product runs on any of `web`, `ios` and `android` (`Product.platforms`), with a link for each (`websiteUrl`, `appStoreUrl`, `playStoreUrl`). Submissions must include the matching link, and App Store and Google Play links are checked against their real hosts. The homepage and archive filter by `?platform=`.
- **Profiles:** `User` has an optional photo, headline and website. Products have an optional `makerId`; once a submission is approved into a product, setting it makes the launch appear under that maker's My products with its upvotes and comments. Changing your password signs out your other sessions.
- **Submitting a launch and commenting require an account.** Upvotes are still anonymous, one per browser via the `lp_visitor` cookie.
- **Uploads** (logos, screenshots, profile photos; product videos are YouTube, Vimeo or Loom links) are limited to 2 MB, compressed in the browser (`src/lib/image-compress.ts`: scaled to the size they're shown at and re-encoded as high-quality WebP, keeping the original when that wouldn't be smaller), then go straight from the browser to storage with short-lived signed links (`src/app/upload-actions.ts`, `src/lib/upload-client.ts`), so forms only carry file URLs. The server checks type and size before signing and re-checks the real file type before saving a URL. With the `R2_*` variables set, files go to a Cloudflare R2 bucket (allow `PUT` from your site in the bucket's CORS policy); without them, they go to `./uploads` (gitignored) through `src/app/api/uploads/route.ts` and are served by `src/app/uploads/[...path]/route.ts`. Move existing local files to R2 with `npx tsx --tsconfig tsconfig.json scripts/migrate-uploads-to-r2.ts` (add `--dry-run` first).
- **Verified** and **featured** are flags on `Product`, set by the seed for now; there's no verification or promotion flow yet.
- **Launches publish themselves** (`src/lib/publish.ts`); there's no admin review. A free launch takes the next day with a free seat (100 a day). Fast Track ($5) takes the 2-hour slot the maker picked as soon as payment succeeds (or the next free slot if it passed), stays hidden until then, and is pinned to the top for 2 hours; it doesn't use a free seat. Boosts (`src/lib/boost.ts`) put a launch in a Promoted spot (Top, Middle or Bottom of today's list) for 1 to 7 days, with limited spots per day. Prices and limits live in `src/lib/pricing.ts`. Makers can cancel any launch before it goes live, from their profile; a paid one is refunded automatically.
- **Analytics** use PostHog, set up in `src/instrumentation-client.ts`: page views on every navigation, page leaves, autocaptured clicks, heatmaps, web vitals and session recordings (all inputs masked). Events go through `/ingest` on our own domain (rewrites in `next.config.ts`) so ad blockers don't drop them. Signed-in visitors are identified by account id from the header (`src/components/analytics/analytics-identity.tsx`), which also records `signed_up`, `signed_in` and `signed_out`. Product moments are recorded with `track()` from `src/lib/analytics.ts`: `launch_submitted`, `fast_track_checkout_started`, `fast_track_paid`, `boost_checkout_started`, `boost_paid`, `upvoted`/`upvote_removed`, `comment_posted`, `review_posted`, `followed_maker`/`unfollowed_maker`, `report_sent`, `notification_bell_opened`, `share_clicked`, `outbound_link_clicked` (any link with `data-track-outbound`), `search_performed`, `digest_subscribed`, `badge_embed_copied`, `product_viewed`. GA4 loads only when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set, and `track()` sends the same events to it. There is no consent banner: visitors in the EU and UK may need to opt in before tracking. To add that later, init PostHog with `opt_out_capturing_by_default: true` and call `posthog.opt_in_capturing()` from a banner's Accept button.
- **Payments** use Dodo Payments (`src/lib/payments.ts`). Set the `DODO_*` variables and point Dodo's webhook at `/api/webhooks/dodo`. Without keys, local development uses a simulated checkout and production shows Fast Track and Boost as coming soon.
- **Badges:** makers get a "Launched on LemoLaunch" badge for their own site from the panel on their product page (only they see it). `/badge/<slug>.svg?theme=light|yellow|dark` draws it with the live upvote count (or the launch day before launch), and `public/embed.js` lets them add it with one script tag. Embed codes use `SITE_URL`, so set it in production.
- **Brand assets:** the header and footer logos and the badge logos are in `public/brand`; the favicon and app icons are `src/app/favicon.ico`, `icon.png` and `apple-icon.png`.
- Digest signups are stored but no emails are sent.
- **Sample data:** logos are SVGs in `public/logos`, sample screenshots in `public/samples`, and the seed adds a few sample members (who can't sign in) with comments.

## Project layout

```
prisma/schema.prisma        Product, Topic, Vote models
prisma/seed.ts              Sample launches
src/app/page.tsx            Homepage
src/app/products/           Product pages
src/app/categories/         Category directory and pages
src/app/archive/            Past launches
src/app/search/, submit/    Search and launch submission
src/app/signin/, signup/    Account pages
src/app/profile/            Profile page and its server actions
src/app/uploads/            Serves uploaded media from ./uploads
src/app/actions.ts          Server actions: votes, digest, submissions, comments
src/app/auth-actions.ts     Sign up, sign in, sign out
src/lib/auth.ts             Password hashing and sessions
src/lib/uploads.ts          Upload signing and checks (R2 or local disk), video link parsing
src/lib/launches.ts         Homepage queries
src/lib/visitor.ts          Anonymous visitor cookie
src/components/             Launch card, badges, upvote button, week strip, sections
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run db:migrate` | Create/apply migrations |
| `npm run db:seed` | Reset and load sample data |
| `npm run db:studio` | Browse the database in Prisma Studio |
