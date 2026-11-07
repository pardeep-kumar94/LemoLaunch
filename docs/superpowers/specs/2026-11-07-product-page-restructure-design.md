# Product page restructure — design

Date: 2026-11-07
Status: ready for owner approval
Project 1 of 2. Project 2 (Launch Pass features) gets its own design after this ships.

## Intent

The product page (`/products/[slug]`) should follow the section structure of dodolaunch's
product pages (example: dodolaunch.com/p/freeviralkit), in LemoLaunch's own look (yellow band,
coral `#ff7a45` accents, cocoa ink, Lexend, hard offset shadows). The owner wants a page that
answers a visitor's questions in a predictable order — what it is, the key facts, what it looks
like, what it does, what people think, how it compares, and what else to look at — and that
gives Launch Pass features (project 2) natural places to plug in.

The approved mockup lives at
`.superpowers/brainstorm/32766-1794069814/content/product-page-structure.html`.

## Goals

- Same section order as the reference: hero, section tabs, Overview, Key facts, Screenshots,
  Features, Reviews, Compare, FAQ, Discussion, Alternatives; sidebar with Information,
  Launch ranking, Maker card, Report link.
- Collect the new product facts from makers in the submit form: pricing model, free trial,
  key features.
- Add star-rating reviews, separate from comments.
- Keep everything the page does today: upvoting, store/website buttons, gallery, comments,
  maker badge embed, upcoming-launch state.

## Non-goals

- Launch Pass features (featured days, promoted slots, stats, dofollow, notify-me, digest,
  launch deal, pinned comment). Project 2. This design only leaves room for them:
  the deal box goes at the end of Overview, the pinned comment at the top of Discussion,
  the promoted card first in Alternatives.
- dodolaunch's "Ask ChatGPT/Claude about us" and "For Agents" blocks (site-wide, not product).
- Editing a product after it is published (no edit flow exists today). Older products simply
  hide the sections they have no data for.
- Email of any kind (the app has no email sending yet). Notifications are in-app only.
- A public maker profile page, and a "people I follow" list.

## Anti-goals

- Copying dodolaunch's visual style, copy or branding. Structure only.
- Empty shells: a section with no data does not render, and its tab disappears. No
  "No features listed" placeholders, except Reviews and Discussion, which invite the first one.
- Fake or inflated numbers. Every rank, rating and count is computed from real rows.

## Page structure

Top to bottom. Anchors in brackets are the ids the tabs link to.

1. **Hero** (yellow band). Back link, tilted framed logo, name, tagline. Chips: launch status,
   categories (link to `/categories/[slug]`), pricing model, platforms. Meta line: maker name
   with verified seal, upvotes, comments, average rating (when there are reviews). Right-hand
   action card as built today (upvote or launch-day calendar tile, then website/App
   Store/Google Play buttons), plus a row of share buttons.
2. **Section tabs** (`<nav>`), sticky under the band. Lists only sections that render. The
   active tab follows scroll position. Horizontally scrollable on mobile.
3. **Overview** [`overview`]. Description. Maker-only badge embed section stays directly after
   Overview, unchanged.
4. **Key facts** [`facts`]. Grid of fact tiles: Category, Pricing, Free plan, Free trial,
   Platforms, Launched (or Launches), Launch day rank, Maker, Rating. A tile with no value is
   left out.
5. **Screenshots** [`screenshots`]. The existing `MediaGallery` (video + images).
6. **Features** [`features`]. The maker's key features, as a two-column checklist.
7. **Reviews** [`reviews`]. Average stars and count, the list of reviews, and a
   "Write a review" form (or sign-in prompt).
8. **Compare** [`compare`]. Table: this product vs one competitor. Rows: Pricing, Platforms,
   Rating, Upvotes, Launched.
9. **FAQ** [`faq`]. Questions written automatically from the facts.
10. **Discussion** [`discussion`]. The existing comments section, renamed. The old `#comments`
    anchor keeps working (sign-in redirects use it).
11. **Alternatives** [`alternatives`]. Up to 6 launched products in the same primary category,
    as cards.

Sidebar (desktop, sticky): **Information** (pricing, upvotes, comments, launch date,
platforms, website link), **Launch ranking** (launched products only), **Maker card**
(avatar, name, headline, social links, Follow button), **Report this product** link. On mobile the sidebar
cards follow Alternatives.

## Data changes

`Product` and `Submission` both get:

- `pricingModel String?` — `"free"`, `"freemium"` or `"paid"`.
- `freeTrialDays Int?` — 1–90, only meaningful for freemium and paid.
- `features String[] @default([])` — up to 6 items, each up to 80 characters.

`Product` also gets `primaryTopicSlug String?`: the category the maker picked on the submit
form (submissions carry exactly one). Products link to topics through an unordered
many-to-many relation, and the page currently takes `topics[0]`, which is the alphabetically
first one. `primaryTopicSlug` fixes that. `publishSubmission` sets it, the seed sets it to
each product's first listed topic, and a migration backfills existing rows with their
alphabetically first topic. Where it is null, fall back to `topics[0]`.

"Free plan" is derived: yes for free and freemium, no for paid. `publishSubmission` copies the
three fields to the product.

`User` gets `xUrl`, `githubUrl`, `linkedinUrl` (all `String?`), edited on `/profile` next to
the existing website field. The maker card shows the user's existing `headline`.

New `Review` model: `id`, `productId`, `userId`, `rating Int` (1–5), `body String` (optional
text, up to 1000 characters), `createdAt`, `updatedAt`. Unique on `(productId, userId)`.
Cascade-deletes with product and user.

New `Follow` model: `followerId`, `makerId` (both users), `createdAt`. Unique on the pair.
Cascade-deletes with either user. `User` also gets `notificationsSeenAt DateTime?`.

New `Report` model: `id`, `productId`, `userId String?`, `reason String`, `details String`,
`createdAt`. Nothing in the app reads reports yet; the owner reviews them in Prisma Studio.

The seed gives sample products pricing, trials, features, a few reviews, and creates
sample maker accounts (with social links) that own a few products, so Follow and
notifications can be checked locally. Sample accounts can't sign in, as today.

## Behaviour

**Submit form.** New "Pricing" field (radio: Free, Freemium, Paid), required for new
submissions. "Free trial" (optional number of days) shown for Freemium and Paid. "Key
features": up to 6 short text inputs, optional. Validation errors follow the form's existing
pattern.

**Reviews.** Signed-in users can review launched products only, one review each, editable
(submitting again updates it). Makers cannot review their own product. Rating required, text
optional. Sorted newest first. Upcoming products show no Reviews section.

**Launch day rank.** Position by upvotes among products with the same launch date, ties by
earliest `createdAt` (the order the feed already uses): "#2 of 6". Launched products only.

**Category rank.** Same ordering among products tagged with the product's primary category
(any of their topics, as `getRelatedLaunches` does today) launched in the same UTC week
(Monday–Sunday) as this product: "#1 in Travel that week". Compare and Alternatives use the
same "tagged with" rule.

**Compare competitor.** The most-upvoted other launched product in the primary category.
No competitor, no Compare section.

**FAQ.** Generated only from fields that exist: Is X free? (pricing model and trial), What
platforms does X run on?, Who made X?, When did X launch?, What are alternatives to X? (names
the top alternatives). Also emitted as `FAQPage` JSON-LD for search engines.

**Share buttons.** X, LinkedIn, Facebook and Copy link, using plain share URLs (no SDKs).
Copy link shows a short "Copied" state.

**Follow.** The maker card shows a Follow / Following toggle when the product has a maker
account (`makerId`) and the viewer is not that maker. Signed-out visitors are sent to sign in
and come back to the page. No follower counts are shown.

**Notifications.** In-app only. A bell in the header, for signed-in users, with a coral badge
showing the number of unread notifications (hidden at zero, "9+" above nine). Clicking it
opens a dropdown listing the latest 20: "{Maker} launched {Product}" with the logo and how
long ago, each linking to the product page. Opening the dropdown marks them all read
(sets `notificationsSeenAt`). Empty state: "No notifications yet. Follow makers to hear when
they launch."

A notification exists for each product, made by a maker you follow, that went live (launch
date reached) after you started following them. It is worked out when the header renders,
from `Follow` and `Product` rows, so no background job is needed when a launch goes live at
00:00 UTC. A notification is unread when its launch date is after `notificationsSeenAt`.
The mobile menu shows the same bell next to the menu button.

**Site name.** The site is called **LemoLaunch** everywhere: page titles and metadata,
footer and copyright, badge text and SVG title, embed script, README, and all
new copy (share text, FAQ answers, JSON-LD). The old name "LaunchPad"/"Launchpad" appears
in about 27 places across 18 files today; none should remain in user-facing text. The
project folder, package name and database name stay as they are.

**Report.** "Report this product" opens a small inline form (reason: spam, broken link,
misleading, offensive, other; optional details). Signed-out visitors can report too.
Confirmation replaces the form.

## Starting point

Build on the current working tree, not the last commit. It holds uncommitted work the owner
has already accepted: the redesigned product page hero and action card (with the maker
avatar in `getProductBySlug`), the header logo alignment fix, and the Launch Pass price change
to $19. The mockup matches that version. Commit it before starting, as separate commits for
the page redesign and the price change; commit only when the owner asks.

## Constraints

- Next.js 16 in this repo has breaking changes: read the relevant guide in
  `node_modules/next/dist/docs/` before writing code (see AGENTS.md).
- Use the existing tokens, `.band`, `.hazard`, `.press`, `lift-off`, `LogoTile`,
  `UserAvatar`, `PlatformBadges`, `VerifiedBadge`, `UpvoteButton`, `MediaGallery`.
- Server components by default; client components only for tabs scroll tracking, share copy,
  review form, report form.
- Works at 390px width with no horizontal scroll, and in dark mode.

## Decided by the owner

- Follow dodolaunch's section structure.
- Add the new fields to the submit form so makers fill them in.
- The mockup above.
- The site is LemoLaunch everywhere.
- Follow sends in-app notifications only: a badge and a notification list. No email.

## Builder's calls (made by Claude; owner may override)

- Pricing options are Free / Freemium / Paid; "free plan" is derived rather than asked.
- Pricing is required on new submissions; trial and features are optional.
- One competitor in Compare.
- Reviews: launched products only, one per user, editable, makers excluded.
- Reports go to a table with no admin screen.
- Mobile puts the sidebar after Alternatives.
- A product's primary category is the one picked on the submit form (`primaryTopicSlug`).
- Category rank, Compare and Alternatives count any product tagged with that category.
- On upcoming products, Compare and Alternatives still show (they only list launched
  products); ranks and Reviews are hidden.
- Notifications cover one event: a followed maker's product going live. Makers are not
  notified about new followers.
- Notifications are derived at read time rather than stored, so no scheduled job.
- Opening the bell marks everything read; there is no per-item read state.
