# LemoLaunch

A daily launch directory. Visitors browse today's launches, step back through the week, filter by category, search, upvote what they'd use, and see what's coming next. Makers submit launches for review.

Built with Next.js 16 (App Router, Cache Components), PostgreSQL and Prisma, styled with Tailwind CSS. The "Lemonade" palette (lemon yellow, coral, cocoa) lives as CSS variables in `src/app/globals.css`; the typeface is Lexend.

## Getting started

Requires Node 20+ and a running PostgreSQL server.

```bash
npm install
cp .env.example .env          # then set DATABASE_URL
createdb launchpad            # or create the database however you prefer
npm run db:migrate            # apply migrations
npm run db:seed               # load sample launches
npm run dev
```

Open http://localhost:3000.

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
| `/submit` | Publish a launch (signed-in only): plan (free or Launch Pass), details, platforms and links, logo, 1-4 screenshots, video |
| `/pricing` | Free launch vs Launch Pass |
| `/submit/payment`, `/dev/checkout` | Launch Pass return page; simulated checkout (local development only) |

## How it works

- **Launch days are UTC calendar days.** A product's `launchDate` decides which day it appears on. The homepage always shows today; earlier days are in the archive; later days show under "Coming up" and can't be voted on yet.
- **Accounts** are email + password. Passwords are hashed with scrypt; sessions live in the `Session` table and the `lp_session` cookie holds a random token whose SHA-256 is the session id.
- **Platforms:** every product runs on any of `web`, `ios` and `android` (`Product.platforms`), with a link for each (`websiteUrl`, `appStoreUrl`, `playStoreUrl`). Submissions must include the matching link, and App Store and Google Play links are checked against their real hosts. The homepage and archive filter by `?platform=`.
- **Profiles:** `User` has an optional photo, headline and website. Products have an optional `makerId`; once a submission is approved into a product, setting it makes the launch appear under that maker's My products with its upvotes and comments. Changing your password signs out your other sessions.
- **Submitting a launch and commenting require an account.** Upvotes are still anonymous, one per browser via the `lp_visitor` cookie.
- **Uploads** (logos, screenshots, videos, profile photos) go straight from the browser to storage with short-lived signed links (`src/app/upload-actions.ts`, `src/lib/upload-client.ts`), so forms only carry file URLs. The server checks type and size before signing and re-checks the real file type before saving a URL. With the `R2_*` variables from `.env.example` set, files go to a Cloudflare R2 bucket (allow `PUT` from your site in the bucket's CORS policy); without them, they go to `./uploads` (gitignored) through `src/app/api/uploads/route.ts` and are served by `src/app/uploads/[...path]/route.ts`. Move existing local files to R2 with `npx tsx --tsconfig tsconfig.json scripts/migrate-uploads-to-r2.ts` (add `--dry-run` first).
- **Verified** and **featured** are flags on `Product`, set by the seed for now; there's no verification or promotion flow yet.
- **Launches publish themselves** (`src/lib/publish.ts`); there's no admin review. A free launch is scheduled on the next day with fewer than 8 free launches. A Launch Pass is scheduled on the maker's chosen day as soon as payment succeeds, and is featured for 7 days. Makers can cancel any launch before it goes live, from their profile; a paid one is refunded automatically.
- **Payments** use Dodo Payments (`src/lib/payments.ts`). Set the `DODO_*` variables from `.env.example` and point Dodo's webhook at `/api/webhooks/dodo`. Without keys, local development uses a simulated checkout and production hides the Launch Pass.
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
