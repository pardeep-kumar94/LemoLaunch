# LemoLaunch SEO keyword plan

Two audiences search for two different things: **makers** looking for a place to launch, and
**discoverers** looking for new tools. Each cluster below maps to the page that should rank for it.

Search volumes and difficulty are not included; check them in Google Search Console (once data
arrives), Google Keyword Planner, Ahrefs or Semrush before prioritising.

## 1. Brand

| Keyword | Page |
|---|---|
| lemolaunch, lemo launch, lemolaunch.com | `/` |

## 2. Launch platform (head terms, competitive)

| Keyword | Page |
|---|---|
| product launch platform, startup launch platform | `/` |
| launch your product, launch your startup, where to launch my startup | `/`, `/submit` |
| product hunt alternative, product hunt alternatives, sites like product hunt | `/` (plus a dedicated article later) |
| new startups, new products today, daily product launches, trending startups | `/`, `/leaderboard` |
| startup directory, SaaS directory, indie product directory | `/`, `/categories` |

## 3. Maker intent (people ready to submit)

| Keyword | Page |
|---|---|
| submit startup, submit your startup, submit startup for free | `/submit` |
| list my SaaS, launch SaaS, submit SaaS, submit side project | `/submit` |
| free startup directories, startup directories list, best places to launch a startup | article (to write) |
| dofollow startup directory, get backlinks for startup | `/pricing` (once the Launch Pass includes a dofollow link) |
| indie hacker launch, launch side project, get first users for my startup | article (to write) |
| launch badge for website, "launched on" badge | `/pricing`, product pages |

## 4. Discovery by category (one page each, `/categories/[slug]`)

| Category | Target phrases |
|---|---|
| AI | new AI tools, best new AI tools 2026, AI startups, AI apps launched today |
| Developer tools | new developer tools, dev tools for startups, best new APIs and dev tools |
| Design | new design tools, best design apps 2026, tools for designers |
| Productivity | new productivity apps, best productivity tools 2026, productivity SaaS |
| Finance | new finance apps, fintech startups, tools for freelancers' finances |
| Writing | new writing tools, AI writing apps, tools for writers |
| Lifestyle | new lifestyle apps, apps for everyday life |
| Travel | new travel apps, trip planning apps, travel startups |
| Health | new health apps, habit tracker apps, wellness startups |

## 5. Long tail on every product page (`/products/[slug]`)

Every launch automatically targets these, through its title, description, Key facts, Compare and Alternatives
sections:

- `[product]`, `[product] review`, `is [product] free`, `[product] pricing`
- `[product] alternatives`, `apps like [product]`
- `[product] vs [competitor]`
- `who made [product]`, `[product] launch`

This is where a new site can rank fastest: thousands of specific, low-competition searches.

## What the code already does

- Unique titles, descriptions and canonical URLs on every public page; private pages are `noindex`.
- `sitemap.xml` (home, leaderboard, archive, categories, every product, updated per request) and
  `robots.txt`.
- Structured data: Organization and WebSite (with search box) on the home page; SoftwareApplication
  and BreadcrumbList on product pages; CollectionPage, ItemList and BreadcrumbList on
  category pages.
- Social share images for the site and every product (Open Graph and X cards).

## Next steps that move rankings most

1. **Backlinks through badges.** Every maker who embeds the "Launched on LemoLaunch" badge links
   back to their product page. Encourage it after launch (email, profile prompt).
2. **Alternatives pages.** `/alternatives/[product]` pages listing similar launches capture
   "[product] alternatives" searches with their own URL.
3. **Articles for maker intent.** "Free startup directories to launch on in 2026",
   "Product Hunt alternatives", "How to launch a SaaS with no audience". Each links to `/submit`.
4. **Category copy.** A short intro paragraph on each category page (what's in it, who it's for).
5. **Performance.** Keep Core Web Vitals green; images are already compressed before upload.
6. **Search Console.** Watch the Queries report after a few weeks and write pages for the queries
   that already get impressions.
