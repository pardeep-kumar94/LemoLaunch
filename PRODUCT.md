# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences with equal weight:

- **Makers**: indie founders and small teams launching a product. They submit it, pick a plan,
  watch upvotes and comments on launch day, and add a "Launched on LemoLaunch" badge to their own
  site.
- **Discoverers**: people who come back daily to see what launched, upvote what they would use,
  comment, review, follow makers and browse the archive and categories.

## Product Purpose

LemoLaunch is a daily launch directory. New products go live every day at 00:00 UTC, the community
upvotes them, and each day produces a ranking. Success is makers getting real attention for a fair
price, and discoverers finding something worth trying every day.

## Positioning

- **Cheap and fair:** a free launch, or a $19 Launch Pass. Paying never buys upvotes or rank; every
  launch is ranked by the community.
- **Built for indie and small makers**, not big companies.
- **A daily ritual:** a fresh set of launches every day at 00:00 UTC, a countdown to the next drop,
  and a daily ranking.

## Operating Context

- Daily feed of today's launches ranked by upvotes, with a top-3 podium, a week strip of launch
  days, upcoming launches, featured (Launch Pass) launches, and a daily email digest sign-up.
- Product pages: hero with upvote and store links, section tabs (Overview, Key facts, Screenshots,
  Features, Reviews, Compare, FAQ, Discussion, Alternatives), information sidebar, launch ranking,
  maker card with Follow, report link.
- Archive by day and leaderboards; categories; search; pricing; submit flow (free or Launch Pass,
  pricing model, features, logo, screenshots, video); profile (my products, edit profile, account);
  sign in and sign up; in-app notifications bell; embeddable badge (SVG, three themes).

## Capabilities and Constraints

- Next.js 16 (App Router, Cache Components), React 19, Tailwind CSS 4, Prisma with Postgres.
- Payments through Dodo Payments; simulated checkout in local development.
- No email sending yet; notifications are in-app only.
- Launch Pass features beyond pick-your-day and featured placement are planned but not built
  (featured 2 days, promoted spots, launch stats, dofollow link, notify-me, digest spot, launch
  deal, pinned maker comment).

## Brand Commitments

- The name **LemoLaunch** stays.
- Personality: friendly and playful, not corporate.
- Everything else (logo, colours, type, shapes) is open to change in a redesign.

## Evidence on Hand

- Sample launches, logos (`public/logos/`) and screenshots (`public/samples/`) from the seed are
  demonstration data, not real customers.
- No real testimonials, press, user counts or traffic numbers exist. Do not invent them.

## Product Principles

- Fair beats flashy: never imply that money buys rank.
- Every day is a fresh start: today's launches and the next drop are always the focus.
- Small makers first: copy and pricing speak to solo founders and tiny teams.
- Warm, human and a little playful, without getting in the way of browsing and voting.
