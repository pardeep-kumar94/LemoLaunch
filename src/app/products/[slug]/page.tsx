import type { Metadata } from "next";
import { absoluteUrl, jsonLd, pageMetadata } from "@/lib/seo";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Check, ChevronRight, ExternalLink, Globe, MessageCircle, Smartphone, Star, Ticket } from "lucide-react";
import { BadgeEmbed } from "@/components/badge-embed";
import { VerifiedBadge } from "@/components/badges";
import { CommentForm } from "@/components/comment-form";
import { LogoTile } from "@/components/logo-tile";
import { GitHubLogo, LinkedInLogo, XLogo } from "@/components/icons";
import { MediaGallery } from "@/components/media-gallery";
import { PlatformBadges } from "@/components/platform-badges";
import { FollowButton } from "@/components/product/follow-button";
import { ReportForm } from "@/components/product/report-form";
import { ReviewForm } from "@/components/product/review-form";
import { SectionTabs } from "@/components/product/section-tabs";
import { TrackView } from "@/components/analytics/track-view";
import { ShareButtons } from "@/components/product/share-buttons";
import { Stars } from "@/components/product/stars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserAvatar } from "@/components/user-avatar";
import { UpvoteButton } from "@/components/upvote-button";
import { db } from "@/lib/db";
import { formatLaunchDay, isSameUtcDay, startOfUtcDay, toDayParam } from "@/lib/dates";
import { getCurrentUser } from "@/lib/auth";
import { siteOrigin } from "@/lib/origin";
import { getComments, getEditionNumber, getProductBySlug, getRelatedLaunches, isUpcoming } from "@/lib/launches";
import {
  formatRating,
  getCategoryWeekRank,
  getLaunchDayRank,
  getRatings,
  getReviews,
  hasFreePlan,
  platformList,
  pricingLabel,
  primaryTopic,
  type RatingSummary,
} from "@/lib/product-page";
import { isStoredUpload, toEmbedUrl } from "@/lib/uploads";
import { readVisitorId } from "@/lib/visitor";
import { cn } from "@/lib/utils";

const SLUG_PATTERN = /^[a-z0-9-]{1,80}$/;
const DAY_MS = 86_400_000;
// Sections clear the sticky site header (64px) and the section tabs (about 45px).
const sectionClass = "scroll-mt-32";
const h2Class = "font-display text-2xl font-bold";

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = SLUG_PATTERN.test(slug)
    ? await db.product.findUnique({
        where: { slug },
        select: { name: true, tagline: true, description: true, topics: { select: { name: true }, take: 1 } },
      })
    : null;
  if (!product) return { title: "Product not found", robots: { index: false } };
  const category = product.topics[0]?.name;
  const description = clip(
    `${product.tagline}. ${product.description ?? ""}`.trim() ||
      `${product.name} on LemoLaunch${category ? `, a new ${category} product` : ""}.`,
    158,
  );
  return pageMetadata({
    title: `${product.name}: ${product.tagline}`,
    description,
    path: `/products/${slug}`,
  });
}

export default function ProductPage({ params }: PageProps<"/products/[slug]">) {
  return (
    <main>
      <Suspense fallback={<ProductSkeleton />}>
        <Product params={params} />
      </Suspense>
    </main>
  );
}

async function Product({ params }: { params: PageProps<"/products/[slug]">["params"] }) {
  const { slug } = await params;
  if (!SLUG_PATTERN.test(slug)) notFound();

  const visitorId = await readVisitorId();
  await connection();
  const today = startOfUtcDay(new Date());

  const product = await getProductBySlug(slug, visitorId);
  if (!product) notFound();

  const upcoming = isUpcoming(product.launchDate, today);
  const launchedToday = isSameUtcDay(product.launchDate, today);
  const dayHref = launchedToday ? "/" : `/archive?day=${toDayParam(product.launchDate)}`;
  const { weekday, day } = formatLaunchDay(product.launchDate);
  const launchYear = product.launchDate.getUTCFullYear();
  const category = primaryTopic(product);

  const [alternatives, comments, user, reviews, dayRank, categoryRank, origin, edition, starCounts] = await Promise.all([
    category ? getRelatedLaunches(product.id, category.slug, today, 6) : [],
    getComments(product.id),
    getCurrentUser(),
    upcoming ? [] : getReviews(product.id),
    upcoming ? null : getLaunchDayRank(product),
    upcoming || !category ? null : getCategoryWeekRank(product, category.slug, today),
    siteOrigin(),
    getEditionNumber(product.launchDate),
    upcoming
      ? []
      : db.review.groupBy({ by: ["rating"], where: { productId: product.id }, _count: { _all: true } }),
  ]);
  const competitor = alternatives[0];
  const [ratings, following] = await Promise.all([
    getRatings([product.id, ...(competitor ? [competitor.id] : [])]),
    user && product.makerId && product.makerId !== user.id
      ? db.follow
          .findUnique({
            where: { followerId_makerId: { followerId: user.id, makerId: product.makerId } },
            select: { makerId: true },
          })
          .then(Boolean)
      : false,
  ]);
  const rating = ratings.get(product.id) ?? null;
  const isMaker = Boolean(user && product.makerId === user.id);
  const ownReview = user ? reviews.find((r) => r.user.id === user.id) : undefined;
  const makerFirstName = product.maker.split(" ")[0];
  const pricing = pricingLabel(product.pricingModel);
  const freePlan = hasFreePlan(product.pricingModel);
  const pageUrl = `${origin}/products/${product.slug}`;
  const productPath = `/products/${product.slug}`;
  const getLinks = [
    product.websiteUrl && { platform: "web", href: product.websiteUrl, label: `Visit ${hostOf(product.websiteUrl)}` },
    product.appStoreUrl && { platform: "ios", href: product.appStoreUrl, label: "App Store" },
    product.playStoreUrl && { platform: "android", href: product.playStoreUrl, label: "Google Play" },
  ].filter((link): link is { platform: string; href: string; label: string } => Boolean(link));
  const outboundKind: Record<string, string> = { web: "website", ios: "app_store", android: "google_play" };
  const starTotal = starCounts.reduce((sum, row) => sum + row._count._all, 0);
  const starShare = (n: number) =>
    starTotal === 0 ? 0 : Math.round(((starCounts.find((row) => row.rating === n)?._count._all ?? 0) / starTotal) * 100);

  const video = !product.videoUrl
    ? null
    : isStoredUpload(product.videoUrl)
      ? { kind: "file" as const, src: product.videoUrl }
      : (() => {
          const embed = toEmbedUrl(product.videoUrl);
          return embed ? { kind: "embed" as const, src: embed } : null;
        })();
  const hasMedia = Boolean(video) || product.galleryUrls.length > 0;

  const sections = [
    product.description && { id: "overview", label: "Overview" },
    hasMedia && { id: "screenshots", label: "Screenshots" },
    product.features.length > 0 && { id: "features", label: "Features" },
    !upcoming && { id: "reviews", label: rating ? `Reviews · ${formatRating(rating.average)}` : "Reviews" },
    competitor && { id: "compare", label: "Compare" },
    { id: "discussion", label: comments.length > 0 ? `Discussion · ${comments.length}` : "Discussion" },
    alternatives.length > 0 && { id: "alternatives", label: "Alternatives" },
  ].filter((s): s is { id: string; label: string } => Boolean(s));

  const outbound = (href: string, kind: string, label: string) => (
    <a href={href} target="_blank" rel="noopener noreferrer" data-track-outbound={kind} data-product-slug={product.slug} className={`${linkClass} inline-flex max-w-full items-center gap-1`}>
      <span className="truncate">{label}</span>
      <ExternalLink className="size-3.5 shrink-0" aria-hidden />
    </a>
  );
  const facts: [string, React.ReactNode][] = [
    ["Website", product.websiteUrl && outbound(product.websiteUrl, "website", hostOf(product.websiteUrl))],
    ["App Store", product.appStoreUrl && outbound(product.appStoreUrl, "app_store", "Download")],
    ["Google Play", product.playStoreUrl && outbound(product.playStoreUrl, "google_play", "Download")],
    ["Category", category && <Link href={`/categories/${category.slug}`} className={linkClass}>{category.name}</Link>],
    ["Pricing", pricing],
    ["Free plan", freePlan === null ? null : freePlan ? "Yes" : "No"],
    ["Free trial", product.freeTrialDays ? `${product.freeTrialDays} days` : null],
    ["Platforms", product.platforms.length > 0 ? platformList(product.platforms) : null],
    ["Week rank", categoryRank && category && `#${categoryRank.rank} in ${category.name}`],
    ["Rating", rating && `${formatRating(rating.average)} out of 5 (${rating.count})`],
  ];
  const ticketStats: [string, React.ReactNode][] = upcoming
    ? [
        ["Goes live", `${weekday.slice(0, 3)} ${day.split(" ")[0]} ${day.split(" ")[1]?.slice(0, 3) ?? ""}`],
        ["Time", "00:00 UTC"],
      ]
    : [
        ["Day rank", dayRank ? `#${dayRank.rank} of ${dayRank.of}` : "–"],
        ["Upvotes", product.voteCount.toLocaleString("en-US")],
        ["Launched", launchedToday ? "Today" : `${weekday.slice(0, 3)} ${day.split(" ")[0]} ${day.split(" ")[1]?.slice(0, 3) ?? ""}`],
        ["Comments", comments.length.toLocaleString("en-US")],
      ];

  const profile = product.makerProfile;
  const makerLinks: { label: string; href: string; Icon: (props: { className?: string }) => React.ReactNode }[] = [
    ...(profile?.websiteUrl ? [{ label: "Website", href: profile.websiteUrl, Icon: Globe }] : []),
    ...(profile?.xUrl ? [{ label: "X", href: profile.xUrl, Icon: XLogo }] : []),
    ...(profile?.githubUrl ? [{ label: "GitHub", href: profile.githubUrl, Icon: GitHubLogo }] : []),
    ...(profile?.linkedinUrl ? [{ label: "LinkedIn", href: profile.linkedinUrl, Icon: LinkedInLogo }] : []),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD for search engines; "<" is escaped so product text can't close the tag.
        dangerouslySetInnerHTML={{
          __html: jsonLd([
            {
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: product.name,
              description: product.description || product.tagline,
              url: absoluteUrl(productPath),
              applicationCategory: category?.name ? `${category.name}Application` : "BusinessApplication",
              operatingSystem: product.platforms.length > 0 ? platformList(product.platforms, { short: true }) : undefined,
              ...(product.logoUrl ? { image: product.logoUrl.startsWith("http") ? product.logoUrl : absoluteUrl(product.logoUrl) } : {}),
              author: { "@type": "Person", name: product.maker },
              datePublished: product.launchDate.toISOString().slice(0, 10),
              ...(product.pricingModel === "free" || product.pricingModel === "freemium"
                ? { offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } }
                : {}),
              ...(rating
                ? { aggregateRating: { "@type": "AggregateRating", ratingValue: formatRating(rating.average), ratingCount: rating.count, bestRating: 5, worstRating: 1 } }
                : {}),
            },
            {
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "LemoLaunch", item: absoluteUrl("/") },
                ...(category
                  ? [{ "@type": "ListItem", position: 2, name: category.name, item: absoluteUrl(`/categories/${category.slug}`) }]
                  : []),
                { "@type": "ListItem", position: category ? 3 : 2, name: product.name, item: absoluteUrl(productPath) },
              ],
            },
          ]),
        }}
      />

      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 pt-6 pb-8 sm:px-8 sm:pt-7 lg:pb-10">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
              <li>
                <Link href={upcoming ? "/" : dayHref} className="hover:text-foreground">
                  {upcoming || launchedToday ? "Today" : `${weekday}'s launches`}
                </Link>
              </li>
              {category && (
                <>
                  <li aria-hidden>
                    <ChevronRight className="size-3.5" />
                  </li>
                  <li>
                    <Link href={`/categories/${category.slug}`} className="hover:text-foreground">
                      {category.name}
                    </Link>
                  </li>
                </>
              )}
              <li aria-hidden>
                <ChevronRight className="size-3.5" />
              </li>
              <li aria-current="page" className="truncate font-medium text-foreground">
                {product.name}
              </li>
            </ol>
          </nav>

          <div className="mt-6 grid gap-8 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end lg:gap-12">
            <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
              <LogoTile name={product.name} accent={product.accent} src={product.logoUrl} size="lg" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <h1 className="font-display text-[clamp(2.5rem,6vw,3.75rem)] leading-[0.95] font-bold break-words text-balance">
                    {product.name}
                  </h1>
                  {product.featured && <Badge variant="lemon">Featured</Badge>}
                </div>
                <p className="mt-3 max-w-2xl text-lg leading-snug text-muted-foreground sm:text-xl">{product.tagline}</p>
                <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13.5px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 text-foreground">
                    <UserAvatar name={product.maker} src={product.makerProfile?.avatarUrl} size="sm" className="size-6 text-[10px]" />
                    {product.maker}
                    {product.verified && <VerifiedBadge />}
                  </span>
                  {category && (
                    <>
                      <Dot />
                      <Link href={`/categories/${category.slug}`} className="hover:text-foreground">
                        {category.name}
                      </Link>
                    </>
                  )}
                  {pricing && (
                    <>
                      <Dot />
                      <span>{pricing}</span>
                    </>
                  )}
                  {product.platforms.length > 0 && (
                    <>
                      <Dot />
                      <PlatformBadges platforms={product.platforms} />
                    </>
                  )}
                  <Dot />
                  <a href="#discussion" className="inline-flex items-center gap-1 hover:text-foreground">
                    <MessageCircle className="size-3.5" aria-hidden />
                    <span className="num">{comments.length}</span>
                    <span className="sr-only">{comments.length === 1 ? "comment" : "comments"}</span>
                  </a>
                  {rating && (
                    <>
                      <Dot />
                      <a href="#reviews" className="inline-flex items-center gap-1 hover:text-foreground">
                        <Star className="size-3.5 fill-lemon-deep text-lemon-deep" aria-hidden />
                        <span className="num">{formatRating(rating.average)}</span>
                        <span className="sr-only">out of 5 from {rating.count} {rating.count === 1 ? "review" : "reviews"}</span>
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <div className={cn("grid gap-3", !upcoming && "grid-cols-[auto_minmax(0,1fr)]")}>
                {upcoming ? (
                  <div className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-paper ring-1 ring-border">
                    <CalendarTile date={product.launchDate} />
                    <div>
                      <p className="font-display text-lg leading-tight font-bold">Goes live {daysUntil(product.launchDate, today)}</p>
                      <p className="num mt-1 text-[13px] text-muted-foreground">
                        00:00 UTC, {weekday.slice(0, 3)} {day}
                      </p>
                    </div>
                  </div>
                ) : (
                  <UpvoteButton
                    productId={product.id}
                    productName={product.name}
                    voteCount={product.voteCount}
                    hasVoted={product.hasVoted}
                    size="lg"
                  />
                )}
                {getLinks.length > 0 ? (
                  <div className="grid gap-2">
                    {getLinks.map((link, index) => (
                      <Button
                        key={link.href}
                        asChild
                        variant={index === 0 ? "default" : "outline"}
                        size={index === 0 ? "lg" : "default"}
                        className="w-full min-w-0 justify-start"
                      >
                        <a
                          href={link.href}
                          data-track-outbound={outboundKind[link.platform]}
                          data-product-slug={product.slug}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {link.platform === "web" ? <Globe data-icon="inline-start" /> : <Smartphone data-icon="inline-start" />}
                          <span className="truncate">{link.label}</span>
                          <ExternalLink data-icon="inline-end" className="ml-auto opacity-60" />
                        </a>
                      </Button>
                    ))}
                  </div>
                ) : (
                  !upcoming && (
                    <p className="self-center text-sm text-muted-foreground">
                      Upvote {product.name} to help it climb the day&apos;s ranking.
                    </p>
                  )
                )}
              </div>
              <ShareButtons url={pageUrl} text={`${product.name}: ${product.tagline}, on LemoLaunch`} />
            </div>
          </div>
        </div>
      </section>

      <TrackView event="product_viewed" properties={{ product_slug: product.slug, upcoming }} />
      <SectionTabs sections={sections} />

      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-x-12 gap-y-12 px-4 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:py-12">
        <div className="flex min-w-0 flex-col gap-12">
          {product.description && (
            <section id="overview" aria-labelledby="overview-heading" className={sectionClass}>
              <h2 id="overview-heading" className="sr-only">
                Overview
              </h2>
              <p className="max-w-[65ch] text-[17px] leading-relaxed break-words whitespace-pre-line">{product.description}</p>
            </section>
          )}

          {isMaker && (
            <section id="badge" aria-labelledby="badge-heading" className="scroll-mt-32 rounded-2xl border border-dashed border-input p-5 sm:p-6">
              <h2 id="badge-heading" className="font-display text-xl font-bold">
                Add a badge to your site
              </h2>
              <p className="mt-1.5 max-w-[60ch] text-sm text-muted-foreground">
                Show visitors you launched on LemoLaunch. The badge links to this page and shows your upvote count. Only
                you can see this section.
              </p>
              <BadgeEmbed origin={origin} slug={product.slug} />
            </section>
          )}

          {hasMedia && (
            <section id="screenshots" aria-labelledby="screenshots-heading" className={sectionClass}>
              <h2 id="screenshots-heading" className={`${h2Class} mb-4`}>
                Screenshots
              </h2>
              <MediaGallery name={product.name} video={video} images={product.galleryUrls} />
            </section>
          )}

          {product.features.length > 0 && (
            <section id="features" aria-labelledby="features-heading" className={sectionClass}>
              <h2 id="features-heading" className={h2Class}>
                What it does
              </h2>
              <ul className="mt-4 grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
                {product.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span className="mt-px grid size-6 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                      <Check className="size-3.5" strokeWidth={2.75} aria-hidden />
                    </span>
                    <span className="font-medium break-words">{feature}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!upcoming && (
            <section id="reviews" aria-labelledby="reviews-heading" className={sectionClass}>
              <h2 id="reviews-heading" className={h2Class}>
                Reviews
              </h2>
              <div className="mt-4 grid gap-6 rounded-2xl bg-card p-5 shadow-paper ring-1 ring-border sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center sm:gap-8 sm:p-6">
                <div>
                  <p className="font-display text-5xl leading-none font-bold">{rating ? formatRating(rating.average) : "–"}</p>
                  <div className="mt-2">
                    <Stars rating={rating?.average ?? 0} />
                  </div>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    {rating ? `${rating.count} ${rating.count === 1 ? "review" : "reviews"}` : "No reviews yet"}
                  </p>
                </div>
                <dl className="grid gap-1.5">
                  {[5, 4, 3, 2, 1].map((n) => (
                    <div key={n} className="grid grid-cols-[14px_minmax(0,1fr)_38px] items-center gap-2.5 text-[12.5px]">
                      <dt className="num text-muted-foreground">
                        {n}
                        <span className="sr-only"> stars</span>
                      </dt>
                      <dd className="h-2 overflow-hidden rounded-full bg-muted">
                        <span className="block h-full rounded-full bg-lemon-deep" style={{ width: `${starShare(n)}%` }} />
                      </dd>
                      <dd className="num text-right text-muted-foreground">{starShare(n)}%</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="mt-5">
                {!user ? (
                  <SignInPrompt href={`/signin?next=${encodeURIComponent(`${productPath}#reviews`)}`} action="Sign in to review">
                    Tried {product.name}? Rate it for other people.
                  </SignInPrompt>
                ) : isMaker ? (
                  <p className="text-sm text-muted-foreground">You can&apos;t review your own product.</p>
                ) : (
                  <ReviewForm productId={product.id} existing={ownReview ? { rating: ownReview.rating, body: ownReview.body } : null} />
                )}
              </div>
              {reviews.length > 0 && (
                <ol className="mt-7 flex flex-col gap-6">
                  {reviews.map((review) => (
                    <li key={review.id} className="flex gap-3">
                      <UserAvatar name={review.user.name} src={review.user.avatarUrl} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-semibold">{review.user.name}</span>
                          <Stars rating={review.rating} className="size-3.5" />
                          <span className="sr-only">{review.rating} out of 5 stars</span>
                          <time dateTime={review.createdAt.toISOString()} className="text-[12.5px] text-muted-foreground">
                            {timeAgo(review.createdAt)}
                          </time>
                        </p>
                        {review.body && <p className="mt-1 max-w-[65ch] break-words whitespace-pre-line">{review.body}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}

          {competitor && (
            <section id="compare" aria-labelledby="compare-heading" className={sectionClass}>
              <h2 id="compare-heading" className={h2Class}>
                {product.name} vs {competitor.name}
              </h2>
              <div className="mt-4 overflow-hidden rounded-2xl bg-card shadow-paper ring-1 ring-border">
                <Table className="min-w-[30rem] text-[14px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-32 pl-5">
                        <span className="sr-only">Compared</span>
                      </TableHead>
                      <TableHead>
                        <span className="flex items-center gap-2.5 font-semibold text-foreground">
                          <LogoTile name={product.name} accent={product.accent} src={product.logoUrl} size="xs" />
                          {product.name}
                        </span>
                      </TableHead>
                      <TableHead className="pr-5">
                        <Link href={`/products/${competitor.slug}`} className="group flex items-center gap-2.5 font-semibold text-foreground">
                          <LogoTile name={competitor.name} accent={competitor.accent} src={competitor.logoUrl} size="xs" />
                          <span className="group-hover:underline group-hover:decoration-lemon-deep group-hover:decoration-2">{competitor.name}</span>
                        </Link>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <CompareRow label="Pricing" a={pricing ?? "Not listed"} b={pricingLabel(competitor.pricingModel) ?? "Not listed"} />
                    <CompareRow
                      label="Platforms"
                      a={platformList(product.platforms, { short: true }) || "Not listed"}
                      b={platformList(competitor.platforms, { short: true }) || "Not listed"}
                    />
                    <CompareRow label="Rating" a={ratingText(rating)} b={ratingText(ratings.get(competitor.id) ?? null)} />
                    <CompareRow
                      label="Upvotes"
                      a={upcoming ? "Not launched yet" : product.voteCount.toLocaleString("en-US")}
                      b={competitor.voteCount.toLocaleString("en-US")}
                    />
                    <CompareRow label="Launched" a={upcoming ? `Launches ${day}` : `${day} ${launchYear}`} b={shortDate(competitor.launchDate)} />
                  </TableBody>
                </Table>
              </div>
            </section>
          )}

          <section id="discussion" aria-labelledby="discussion-heading" className={sectionClass}>
            {/* Older links and sign-in redirects point at #comments. */}
            <span id="comments" className="block scroll-mt-32" />
            <h2 id="discussion-heading" className={`${h2Class} flex items-baseline gap-2`}>
              Discussion
              <span className="num text-base font-normal text-muted-foreground">{comments.length}</span>
            </h2>
            <div className="mt-4">
              {user ? (
                <CommentForm productId={product.id} userName={user.name} makerFirstName={makerFirstName} />
              ) : (
                <SignInPrompt href={`/signin?next=${encodeURIComponent(`${productPath}#discussion`)}`} action="Sign in to comment">
                  Ask {makerFirstName} a question or share what you think.
                </SignInPrompt>
              )}
            </div>
            {comments.length > 0 ? (
              <ol className="mt-7 flex flex-col gap-6">
                {comments.map((comment) => (
                  <li key={comment.id} className="flex gap-3">
                    <UserAvatar name={comment.user.name} src={comment.user.avatarUrl} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-semibold">{comment.user.name}</span>
                        {comment.user.id === product.makerId && <Badge variant="lemon">Maker</Badge>}
                        <time dateTime={comment.createdAt.toISOString()} className="text-[12.5px] text-muted-foreground">
                          {timeAgo(comment.createdAt)}
                        </time>
                      </p>
                      <p className="mt-1 max-w-[65ch] break-words whitespace-pre-line">{comment.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="mt-6 flex items-center gap-4 rounded-2xl border border-dashed border-input px-5 py-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                  <MessageCircle className="size-[18px]" aria-hidden />
                </span>
                <p>
                  <span className="block font-semibold">No comments yet</span>
                  <span className="text-muted-foreground">Start the conversation.</span>
                </p>
              </div>
            )}
          </section>

          {alternatives.length > 0 && category && (
            <section id="alternatives" aria-labelledby="alternatives-heading" className={sectionClass}>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 id="alternatives-heading" className={h2Class}>
                  Alternatives
                </h2>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/categories/${category.slug}`}>
                    All in {category.name}
                    <ChevronRight data-icon="inline-end" />
                  </Link>
                </Button>
              </div>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {alternatives.map((launch) => (
                  <li key={launch.id}>
                    <Link
                      href={`/products/${launch.slug}`}
                      className="flex h-full flex-col gap-3 rounded-2xl bg-card p-4 shadow-paper ring-1 ring-border transition-shadow hover:shadow-lift"
                    >
                      <span className="flex items-center gap-3">
                        <LogoTile name={launch.name} accent={launch.accent} src={launch.logoUrl} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{launch.name}</span>
                          <span className="num flex items-center gap-1 text-[12.5px] text-muted-foreground">
                            {launch.voteCount}
                            <span className="font-sans">upvotes</span>
                            {pricingLabel(launch.pricingModel) && <span className="font-sans">· {pricingLabel(launch.pricingModel)}</span>}
                          </span>
                        </span>
                      </span>
                      <span className="line-clamp-2 text-sm text-muted-foreground">{launch.tagline}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-32 lg:self-start">
          <section id="facts" aria-labelledby="facts-heading" className="scroll-mt-32 overflow-hidden rounded-2xl bg-card shadow-paper ring-1 ring-border">
            <div className="flex items-center gap-2.5 bg-accent px-5 py-3.5 text-accent-foreground">
              <Ticket className="size-[18px]" aria-hidden />
              <h2 id="facts-heading" className="font-semibold">
                Launch ticket
              </h2>
              <span className="num ml-auto text-[12.5px]">Edition {edition}</span>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 px-5 pt-4 pb-4">
              {ticketStats.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="num mt-0.5 text-[17px] font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mx-5 border-t border-dashed border-input" />
            <dl className="px-5 pt-1 pb-3 text-sm">
              {facts
                .filter(([, value]) => value !== null && value !== undefined && value !== "")
                .map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 border-b border-border py-2.5 last:border-0">
                    <dt className="shrink-0 text-muted-foreground">{label}</dt>
                    <dd className="min-w-0 text-right font-medium break-words">{value}</dd>
                  </div>
                ))}
            </dl>
          </section>

          <section aria-labelledby="maker-heading" className="rounded-2xl bg-card p-5 shadow-paper ring-1 ring-border">
            <h2 id="maker-heading" className="sr-only">
              Maker
            </h2>
            <div className="flex items-center gap-3">
              <UserAvatar name={product.maker} src={product.makerProfile?.avatarUrl} size="md" className="size-11" />
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-semibold">
                  <span className="truncate">{product.maker}</span>
                  {product.verified && <VerifiedBadge />}
                </p>
                <p className="line-clamp-2 text-[13px] text-muted-foreground">
                  {product.makerProfile?.headline || `Maker of ${product.name}`}
                </p>
              </div>
            </div>
            {makerLinks.length > 0 && (
              <ul className="mt-4 flex gap-1.5">
                {makerLinks.map(({ label, href, Icon }) => (
                  <li key={label}>
                    <Button asChild variant="outline" size="icon-sm">
                      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${product.maker} on ${label}`}>
                        <Icon className="size-3.5" />
                      </a>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {product.makerId && !isMaker && (
              <div className="mt-4">
                <FollowButton
                  makerId={product.makerId}
                  makerName={product.maker}
                  following={following}
                  signInHref={user ? null : `/signin?next=${encodeURIComponent(productPath)}`}
                />
                <p className="mt-2 text-center text-xs text-muted-foreground">Get a notification when they launch again</p>
              </div>
            )}
          </section>

          <ReportForm productId={product.id} />
        </aside>
      </div>
    </>
  );
}

const linkClass = "underline decoration-input decoration-[1.5px] underline-offset-4 hover:decoration-lemon-deep";

function Dot() {
  return <span aria-hidden className="size-[3px] rounded-full bg-input" />;
}

function CompareRow({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableHead scope="row" className="pl-5 font-normal text-muted-foreground">
        {label}
      </TableHead>
      <TableCell className="font-medium">{a}</TableCell>
      <TableCell className="pr-5 font-medium">{b}</TableCell>
    </TableRow>
  );
}

function SignInPrompt({ href, action, children }: { href: string; action: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl bg-card px-5 py-4 shadow-paper ring-1 ring-border">
      <p className="min-w-0 flex-1 basis-60">{children}</p>
      <Button asChild>
        <Link href={href}>{action}</Link>
      </Button>
    </div>
  );
}

/** A tear-off calendar page for an upcoming launch day. */
function CalendarTile({ date }: { date: Date }) {
  const month = date.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
  const weekday = date.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
  return (
    <span aria-hidden="true" className="flex w-14 shrink-0 flex-col overflow-hidden rounded-xl bg-card text-center ring-1 ring-border">
      <span className="bg-lemon py-0.5 text-[11px] font-semibold text-on-lemon uppercase">{month}</span>
      <span className="num pt-1 text-2xl leading-none font-medium">{date.getUTCDate()}</span>
      <span className="pb-1.5 text-[11px] text-muted-foreground">{weekday}</span>
    </span>
  );
}

function ratingText(rating: RatingSummary | null): string {
  return rating ? `${formatRating(rating.average)} out of 5 (${rating.count})` : "No reviews yet";
}

function shortDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function daysUntil(date: Date, today: Date): string {
  const days = Math.round((date.getTime() - today.getTime()) / DAY_MS);
  return days <= 1 ? "tomorrow" : `in ${days} days`;
}

function ProductSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading product">
      <div className="border-b border-border">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-14 pb-10 motion-safe:animate-pulse sm:px-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
          <div className="flex items-center gap-6">
            <div className="size-20 shrink-0 rounded-[20px] bg-muted sm:size-26" />
            <div className="flex-1">
              <div className="h-14 w-2/3 max-w-md rounded-xl bg-muted" />
              <div className="mt-4 h-6 w-1/2 max-w-sm rounded bg-muted" />
            </div>
          </div>
          <div className="h-36 rounded-2xl bg-muted" />
        </div>
      </div>
    </div>
  );
}

function clip(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").replace(/\.\./g, ".");
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

/** "5 min ago" style label. Only called while rendering this request-time page. */
function timeAgo(date: Date): string {
  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? "day" : "days"} ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
