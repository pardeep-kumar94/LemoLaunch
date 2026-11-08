import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { BadgeEmbed } from "@/components/badge-embed";
import { VerifiedBadge } from "@/components/badges";
import { CommentForm } from "@/components/comment-form";
import { LogoTile } from "@/components/logo-tile";
import {
  CheckIcon,
  CommentIcon,
  ExternalIcon,
  GitHubLogo,
  GlobeIcon,
  LinkedInLogo,
  PhoneIcon,
  StarIcon,
  XLogo,
} from "@/components/icons";
import { MediaGallery } from "@/components/media-gallery";
import { FollowButton } from "@/components/product/follow-button";
import { ReportForm } from "@/components/product/report-form";
import { ReviewForm } from "@/components/product/review-form";
import { SectionTabs } from "@/components/product/section-tabs";
import { ShareButtons } from "@/components/product/share-buttons";
import { Stars } from "@/components/product/stars";
import { UserAvatar } from "@/components/user-avatar";
import { UpvoteButton } from "@/components/upvote-button";
import { db } from "@/lib/db";
import { formatLaunchDay, isSameUtcDay, startOfUtcDay, toDayParam } from "@/lib/dates";
import { getCurrentUser } from "@/lib/auth";
import { siteOrigin } from "@/lib/origin";
import { getComments, getProductBySlug, getRelatedLaunches, isUpcoming } from "@/lib/launches";
import {
  buildFaq,
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

const SLUG_PATTERN = /^[a-z0-9-]{1,80}$/;
const DAY_MS = 86_400_000;
const sectionClass = "scroll-mt-20";
const h2Class = "font-display text-[28px] leading-tight font-extrabold";

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = SLUG_PATTERN.test(slug)
    ? await db.product.findUnique({ where: { slug }, select: { name: true, tagline: true } })
    : null;
  if (!product) return { title: "Product not found | LemoLaunch" };
  return { title: `${product.name} | LemoLaunch`, description: product.tagline };
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

  const [alternatives, comments, user, reviews, dayRank, categoryRank, origin] = await Promise.all([
    category ? getRelatedLaunches(product.id, category.slug, today, 6) : [],
    getComments(product.id),
    getCurrentUser(),
    upcoming ? [] : getReviews(product.id),
    upcoming ? null : getLaunchDayRank(product),
    upcoming || !category ? null : getCategoryWeekRank(product, category.slug, today),
    siteOrigin(),
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
  const status = upcoming
    ? `Launching ${weekday}, ${day}`
    : launchedToday
      ? "Launched today"
      : `Launched ${weekday}, ${day}`;

  const getLinks = [
    product.websiteUrl && { platform: "web", href: product.websiteUrl, eyebrow: "Visit", label: "Website" },
    product.appStoreUrl && { platform: "ios", href: product.appStoreUrl, eyebrow: "Download on the", label: "App Store" },
    product.playStoreUrl && { platform: "android", href: product.playStoreUrl, eyebrow: "Get it on", label: "Google Play" },
  ].filter((link): link is { platform: string; href: string; eyebrow: string; label: string } => Boolean(link));

  const video = !product.videoUrl
    ? null
    : isStoredUpload(product.videoUrl)
      ? { kind: "file" as const, src: product.videoUrl }
      : (() => {
          const embed = toEmbedUrl(product.videoUrl);
          return embed ? { kind: "embed" as const, src: embed } : null;
        })();
  const hasMedia = Boolean(video) || product.galleryUrls.length > 0;

  const faq = buildFaq({
    name: product.name,
    maker: product.maker,
    pricingModel: product.pricingModel,
    freeTrialDays: product.freeTrialDays,
    platforms: product.platforms,
    launchDate: product.launchDate,
    upcoming,
    alternatives: alternatives.map((a) => a.name),
  });

  const sections = [
    product.description && { id: "overview", label: "Overview" },
    { id: "facts", label: "Key facts" },
    hasMedia && { id: "screenshots", label: "Screenshots" },
    product.features.length > 0 && { id: "features", label: "Features" },
    !upcoming && { id: "reviews", label: "Reviews" },
    competitor && { id: "compare", label: "Compare" },
    { id: "faq", label: "FAQ" },
    { id: "discussion", label: "Discussion" },
    alternatives.length > 0 && { id: "alternatives", label: "Alternatives" },
  ].filter((s): s is { id: string; label: string } => Boolean(s));

  const facts: [string, React.ReactNode][] = [
    ["Category", category && <Link href={`/categories/${category.slug}`} className={linkClass}>{category.name}</Link>],
    ["Pricing", pricing],
    ["Free plan", freePlan === null ? null : freePlan ? "Yes" : "No"],
    ["Free trial", product.freeTrialDays ? `${product.freeTrialDays} days` : null],
    ["Platforms", product.platforms.length > 0 ? platformList(product.platforms) : null],
    [upcoming ? "Launches" : "Launched", `${weekday.slice(0, 3)}, ${day} ${launchYear}`],
    ["Launch day rank", dayRank && `#${dayRank.rank} of ${dayRank.of}`],
    ["Maker", product.maker],
    ["Rating", rating && `${formatRating(rating.average)} out of 5 (${rating.count})`],
  ];

  const makerLinks = [
    product.makerProfile?.websiteUrl && { label: "Website", href: product.makerProfile.websiteUrl, Icon: GlobeIcon },
    product.makerProfile?.xUrl && { label: "X", href: product.makerProfile.xUrl, Icon: XLogo },
    product.makerProfile?.githubUrl && { label: "GitHub", href: product.makerProfile.githubUrl, Icon: GitHubLogo },
    product.makerProfile?.linkedinUrl && { label: "LinkedIn", href: product.makerProfile.linkedinUrl, Icon: LinkedInLogo },
  ].filter((l): l is { label: string; href: string; Icon: typeof GlobeIcon } => Boolean(l));

  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD for search engines; "<" is escaped so product text can't close the tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.map((f) => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: { "@type": "Answer", text: f.answer },
            })),
          }).replace(/</g, "\\u003c"),
        }}
      />

      <section className="band">
        <div className="mx-auto max-w-6xl px-4 pt-8 pb-12 sm:px-8 lg:pb-14">
          <Link
            href={upcoming ? "/#upcoming" : dayHref}
            className="group inline-flex items-center gap-1.5 text-sm font-semibold"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 transition-transform group-hover:-translate-x-0.5">
              <path d="M10 3.5 5.5 8l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="underline decoration-pop decoration-2 underline-offset-4">
              {upcoming ? "Back to launches" : `Back to ${launchedToday ? "today" : weekday}'s launches`}
            </span>
          </Link>

          <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-end lg:gap-14">
            <div className="min-w-0">
              <div className="inline-block -rotate-3 rounded-[24px] border-2 border-on-signal bg-white p-1.5 shadow-[6px_6px_0_0_var(--pop)]">
                <LogoTile name={product.name} accent={product.accent} src={product.logoUrl} size="lg" />
              </div>
              <h1 className="lift-off mt-7 font-display text-[clamp(2.75rem,7vw,5.25rem)] leading-[0.92] font-extrabold tracking-[-0.025em] text-balance break-words">
                {product.name}
              </h1>
              <p className="mt-4 max-w-2xl text-xl leading-snug opacity-85 sm:text-2xl">{product.tagline}</p>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border-2 border-on-signal bg-white px-3 py-1 text-sm font-semibold">
                  <span className="size-2 rounded-full bg-pop shadow-[0_0_0_3px_color-mix(in_oklab,var(--pop)_25%,white)]" />
                  {status}
                </span>
                {product.topics.map((t) => (
                  <Link key={t.slug} href={`/categories/${t.slug}`} className={`${bandChip} transition-colors hover:border-on-signal hover:bg-white`}>
                    {t.name}
                  </Link>
                ))}
                {pricing && <span className={bandChip}>{pricing}</span>}
                {product.platforms.length > 0 && <span className={bandChip}>{platformList(product.platforms, { short: true })}</span>}
              </div>
              <p className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px]">
                <span className="inline-flex items-center gap-1.5">
                  by <span className="font-bold">{product.maker}</span>
                  {product.verified && <VerifiedBadge className="size-4" />}
                </span>
                {!upcoming && (
                  <span className="inline-flex items-center gap-1.5 tabular-nums">
                    <svg viewBox="0 0 12 10" width="10" height="9" aria-hidden="true"><path d="M6 0 L12 10 H0 Z" fill="currentColor" /></svg>
                    {product.voteCount.toLocaleString("en-US")} {product.voteCount === 1 ? "upvote" : "upvotes"}
                  </span>
                )}
                <a href="#discussion" className="inline-flex items-center gap-1.5 tabular-nums hover:underline">
                  <CommentIcon className="size-4" />
                  {comments.length} {comments.length === 1 ? "comment" : "comments"}
                </a>
                {rating && (
                  <a href="#reviews" className="inline-flex items-center gap-1.5 tabular-nums hover:underline">
                    <StarIcon className="size-4" />
                    {formatRating(rating.average)} ({rating.count} {rating.count === 1 ? "review" : "reviews"})
                  </a>
                )}
              </p>
            </div>

            <div className="lift-off lift-off-late rounded-[22px] border-2 border-on-signal bg-paper p-5 text-ink shadow-[8px_8px_0_0_var(--pop)] sm:p-6">
              {upcoming ? (
                <div className="flex items-center gap-4">
                  <CalendarTile date={product.launchDate} />
                  <div>
                    <p className="font-display text-lg leading-tight font-extrabold">
                      Goes live {daysUntil(product.launchDate, today)}
                    </p>
                    <p className="mt-1 text-sm text-mist">
                      00:00 UTC, <span className="whitespace-nowrap">{weekday.slice(0, 3)} {day}</span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <UpvoteButton
                    productId={product.id}
                    productName={product.name}
                    voteCount={product.voteCount}
                    hasVoted={product.hasVoted}
                  />
                  <div>
                    <p className="font-display text-lg leading-tight font-extrabold">Would you use it?</p>
                    <p className="mt-1 text-sm text-mist">Upvote {product.name} to help it climb the day&apos;s ranking.</p>
                  </div>
                </div>
              )}
              {getLinks.length > 0 && (
                <div className="mt-5 grid gap-2.5 border-t-2 border-line pt-5">
                  {getLinks.map((link, index) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`press flex h-14 items-center gap-3 rounded-[14px] border-2 px-4 ${
                        // The first link is the main call to action; the rest are quieter.
                        index === 0
                          ? "border-on-signal bg-signal text-on-signal shadow-[4px_4px_0_0_var(--on-signal)] dark:shadow-[4px_4px_0_0_var(--pop)]"
                          : "border-ink bg-paper text-ink hover:bg-signal-wash"
                      }`}
                    >
                      {link.platform === "web" ? <GlobeIcon className="size-5" /> : <PhoneIcon className="size-5" />}
                      <span className="flex-1 text-left leading-tight">
                        <span className="block text-xs opacity-75">{link.eyebrow}</span>
                        <span className="block font-bold">{link.label}</span>
                      </span>
                      <ExternalIcon className="size-4 opacity-60" />
                    </a>
                  ))}
                </div>
              )}
              <div className="mt-5 border-t-2 border-line pt-4">
                <ShareButtons url={pageUrl} text={`${product.name}: ${product.tagline}, on LemoLaunch`} />
              </div>
            </div>
          </div>
        </div>
        <div className="hazard" />
      </section>

      <SectionTabs sections={sections} />

      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-x-14 gap-y-14 px-4 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:py-14">
        <div className="flex min-w-0 flex-col gap-14">
          {product.description && (
            <section id="overview" aria-labelledby="overview-heading" className={sectionClass}>
              <h2 id="overview-heading" className={h2Class}>
                Overview
              </h2>
              <p className="mt-4 max-w-[65ch] text-lg leading-relaxed break-words whitespace-pre-line">
                {product.description}
              </p>
            </section>
          )}

          {isMaker && (
            <section
              id="badge"
              aria-labelledby="badge-heading"
              className="scroll-mt-20 rounded-[22px] border-2 border-dashed border-line p-5 sm:p-7"
            >
              <h2 id="badge-heading" className="font-display text-2xl font-extrabold">
                Add a badge to your site
              </h2>
              <p className="mt-2 max-w-[60ch] text-mist">
                Show visitors you launched on LemoLaunch. The badge links to this page and shows your upvote
                count. Only you can see this section.
              </p>
              <BadgeEmbed origin={origin} slug={product.slug} />
            </section>
          )}

          <section id="facts" aria-labelledby="facts-heading" className={sectionClass}>
            <h2 id="facts-heading" className={h2Class}>
              Key facts
            </h2>
            <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {facts
                .filter(([, value]) => value !== null && value !== undefined && value !== "")
                .map(([label, value]) => (
                  <div key={label} className="rounded-2xl border-2 border-line bg-paper px-4 py-3">
                    <dt className="text-sm text-mist">{label}</dt>
                    <dd className="mt-0.5 font-bold break-words">{value}</dd>
                  </div>
                ))}
            </dl>
          </section>

          {hasMedia && (
            <section id="screenshots" aria-labelledby="screenshots-heading" className={sectionClass}>
              <h2 id="screenshots-heading" className={`${h2Class} mb-5`}>
                Screenshots
              </h2>
              <MediaGallery name={product.name} video={video} images={product.galleryUrls} />
            </section>
          )}

          {product.features.length > 0 && (
            <section id="features" aria-labelledby="features-heading" className={sectionClass}>
              <h2 id="features-heading" className={h2Class}>
                Features
              </h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {product.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 rounded-2xl border-2 border-line bg-paper px-4 py-3">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-pop text-on-signal">
                      <CheckIcon className="size-3.5" />
                    </span>
                    <span className="font-semibold break-words">{feature}</span>
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
              <div className="mt-5 flex items-center gap-4">
                <p className="font-display text-5xl leading-none font-extrabold tabular-nums">
                  {rating ? formatRating(rating.average) : "–"}
                </p>
                <div>
                  <Stars rating={rating?.average ?? 0} className="size-5" />
                  <p className="mt-1 text-sm text-mist">
                    {rating
                      ? `${rating.count} ${rating.count === 1 ? "review" : "reviews"}`
                      : "No reviews yet"}
                  </p>
                </div>
              </div>
              <div className="mt-6">
                {!user ? (
                  <SignInPrompt href={`/signin?next=${encodeURIComponent(`${productPath}#reviews`)}`} action="Sign in to review">
                    Tried {product.name}? Rate it for other people.
                  </SignInPrompt>
                ) : isMaker ? (
                  <p className="text-sm text-mist">You can&apos;t review your own product.</p>
                ) : (
                  <ReviewForm
                    productId={product.id}
                    existing={ownReview ? { rating: ownReview.rating, body: ownReview.body } : null}
                  />
                )}
              </div>
              {reviews.length > 0 && (
                <ol className="mt-8 flex flex-col gap-5">
                  {reviews.map((review) => (
                    <li key={review.id} className="flex gap-3">
                      <UserAvatar name={review.user.name} src={review.user.avatarUrl} size="md" />
                      <div className="min-w-0 flex-1 rounded-[16px] rounded-tl-md border-2 border-line bg-paper px-4 py-3">
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-bold">{review.user.name}</span>
                          <Stars rating={review.rating} className="size-3.5" />
                          <span className="sr-only">{review.rating} out of 5 stars</span>
                          <time dateTime={review.createdAt.toISOString()} className="text-sm text-mist">
                            {timeAgo(review.createdAt)}
                          </time>
                        </p>
                        {review.body && <p className="mt-1 break-words whitespace-pre-line">{review.body}</p>}
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
              <div className="mt-5 overflow-x-auto rounded-[18px] border-2 border-ink bg-paper">
                <table className="w-full min-w-[30rem] text-left text-[15px]">
                  <thead>
                    <tr className="bg-signal-wash">
                      <th scope="col" className="w-36 px-4 py-3"><span className="sr-only">Compared</span></th>
                      <th scope="col" className="px-4 py-3">
                        <span className="flex items-center gap-2.5">
                          <LogoTile name={product.name} accent={product.accent} src={product.logoUrl} size="sm" />
                          {product.name}
                        </span>
                      </th>
                      <th scope="col" className="px-4 py-3">
                        <Link href={`/products/${competitor.slug}`} className="group flex items-center gap-2.5">
                          <LogoTile name={competitor.name} accent={competitor.accent} src={competitor.logoUrl} size="sm" />
                          <span className="decoration-pop decoration-2 underline-offset-4 group-hover:underline">{competitor.name}</span>
                        </Link>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-line">
                    <CompareRow label="Pricing" a={pricing ?? "Not listed"} b={pricingLabel(competitor.pricingModel) ?? "Not listed"} />
                    <CompareRow label="Platforms" a={platformList(product.platforms, { short: true }) || "Not listed"} b={platformList(competitor.platforms, { short: true }) || "Not listed"} />
                    <CompareRow label="Rating" a={ratingText(rating)} b={ratingText(ratings.get(competitor.id) ?? null)} />
                    <CompareRow
                      label="Upvotes"
                      a={upcoming ? "Not launched yet" : product.voteCount.toLocaleString("en-US")}
                      b={competitor.voteCount.toLocaleString("en-US")}
                    />
                    <CompareRow label="Launched" a={upcoming ? `Launches ${day}` : `${day} ${launchYear}`} b={shortDate(competitor.launchDate)} />
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section id="faq" aria-labelledby="faq-heading" className={sectionClass}>
            <h2 id="faq-heading" className={h2Class}>
              FAQ
            </h2>
            <div className="mt-5 grid gap-2.5">
              {faq.map((item, i) => (
                <details
                  key={item.question}
                  open={i === 0}
                  className="group rounded-2xl border-2 border-line bg-paper open:border-ink"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 font-bold [&::-webkit-details-marker]:hidden">
                    {item.question}
                    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 shrink-0 transition-transform group-open:rotate-180">
                      <path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </summary>
                  <p className="px-4 pb-4 text-mist">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <section id="discussion" aria-labelledby="discussion-heading" className={sectionClass}>
            {/* Older links and sign-in redirects point at #comments. */}
            <span id="comments" className="block scroll-mt-20" />
            <h2 id="discussion-heading" className={`${h2Class} flex items-center gap-2.5`}>
              Discussion
              <span className="rounded-lg bg-signal-wash px-2 py-0.5 text-lg tabular-nums">{comments.length}</span>
            </h2>
            <div className="mt-6">
              {user ? (
                <CommentForm productId={product.id} userName={user.name} />
              ) : (
                <SignInPrompt href={`/signin?next=${encodeURIComponent(`${productPath}#discussion`)}`} action="Sign in to comment">
                  Ask {makerFirstName} a question or share what you think.
                </SignInPrompt>
              )}
            </div>
            {comments.length > 0 ? (
              <ol className="mt-8 flex flex-col gap-5">
                {comments.map((comment) => (
                  <li key={comment.id} className="flex gap-3">
                    <UserAvatar name={comment.user.name} src={comment.user.avatarUrl} size="md" />
                    <div className="min-w-0 flex-1 rounded-[16px] rounded-tl-md border-2 border-line bg-paper px-4 py-3">
                      <p className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-bold">{comment.user.name}</span>
                        {comment.user.id === product.makerId && (
                          <span className="rounded-md bg-pop px-1.5 py-px text-xs font-bold text-on-signal">Maker</span>
                        )}
                        <time dateTime={comment.createdAt.toISOString()} className="text-sm text-mist">
                          {timeAgo(comment.createdAt)}
                        </time>
                      </p>
                      <p className="mt-1 break-words whitespace-pre-line">{comment.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="mt-6 flex items-center gap-4 rounded-[18px] border-2 border-dashed border-line px-5 py-6">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-pop-wash text-ink">
                  <CommentIcon className="size-5" />
                </span>
                <p>
                  <span className="block font-bold">No comments yet</span>
                  <span className="text-mist">Start the conversation.</span>
                </p>
              </div>
            )}
          </section>

          {alternatives.length > 0 && category && (
            <section id="alternatives" aria-labelledby="alternatives-heading" className={sectionClass}>
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="alternatives-heading" className={h2Class}>
                  Alternatives
                </h2>
                <Link href={`/categories/${category.slug}`} className="shrink-0 text-sm font-semibold underline decoration-pop decoration-2 underline-offset-4">
                  All in {category.name}
                </Link>
              </div>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {alternatives.map((launch) => (
                  <li key={launch.id}>
                    <Link
                      href={`/products/${launch.slug}`}
                      className="group flex h-full flex-col gap-3 rounded-[18px] border-2 border-line bg-paper p-4 transition-[border-color,box-shadow] hover:border-ink hover:shadow-[5px_5px_0_0_var(--pop)]"
                    >
                      <span className="flex items-center gap-3">
                        <LogoTile name={launch.name} accent={launch.accent} src={launch.logoUrl} size="md" />
                        <span className="min-w-0">
                          <span className="block truncate font-bold">{launch.name}</span>
                          <span className="flex items-center gap-1 text-sm font-semibold text-mist tabular-nums">
                            <svg viewBox="0 0 12 10" width="9" height="8" aria-hidden="true"><path d="M6 0 L12 10 H0 Z" fill="currentColor" /></svg>
                            {launch.voteCount}
                            <span className="sr-only">upvotes</span>
                            {pricingLabel(launch.pricingModel) && <span className="font-normal">· {pricingLabel(launch.pricingModel)}</span>}
                          </span>
                        </span>
                      </span>
                      <span className="line-clamp-2 text-sm text-mist">{launch.tagline}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-20 lg:self-start">
          <section aria-labelledby="info-heading" className="rounded-[20px] border-2 border-ink bg-paper p-5 shadow-[6px_6px_0_0_var(--pop)]">
            <h2 id="info-heading" className="font-display text-lg font-extrabold">
              Information
            </h2>
            <dl className="mt-2 divide-y-2 divide-line text-[15px]">
              {pricing && <InfoRow label="Pricing">{pricing}</InfoRow>}
              {!upcoming && <InfoRow label="Upvotes"><span className="tabular-nums">{product.voteCount.toLocaleString("en-US")}</span></InfoRow>}
              <InfoRow label="Comments">
                <a href="#discussion" className={`${linkClass} tabular-nums`}>{comments.length}</a>
              </InfoRow>
              <InfoRow label={upcoming ? "Launches" : "Launched"}>
                {upcoming ? (
                  `${weekday.slice(0, 3)}, ${day}`
                ) : (
                  <Link href={dayHref} className={linkClass}>
                    {launchedToday ? "Today" : `${weekday.slice(0, 3)}, ${day}`}
                  </Link>
                )}
              </InfoRow>
              {product.platforms.length > 0 && <InfoRow label="Platforms">{platformList(product.platforms, { short: true })}</InfoRow>}
              {product.websiteUrl && (
                <InfoRow label="Website">
                  <a href={product.websiteUrl} target="_blank" rel="noopener noreferrer" className={`${linkClass} inline-flex items-center gap-1`}>
                    <span className="max-w-36 truncate">{hostOf(product.websiteUrl)}</span>
                    <ExternalIcon className="size-3.5 shrink-0" />
                  </a>
                </InfoRow>
              )}
            </dl>
          </section>

          {dayRank && (
            <section aria-labelledby="ranking-heading" className="rounded-[20px] border-2 border-ink bg-paper p-5">
              <h2 id="ranking-heading" className="font-display text-lg font-extrabold">
                Launch ranking
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <RankTile rank={dayRank.rank} caption={`of ${dayRank.of} on launch day`} />
                {categoryRank && category && (
                  <RankTile rank={categoryRank.rank} caption={`in ${category.name} that week`} />
                )}
              </div>
            </section>
          )}

          <section aria-labelledby="maker-heading" className="rounded-[20px] border-2 border-ink bg-paper p-5">
            <h2 id="maker-heading" className="sr-only">
              Maker
            </h2>
            <div className="flex items-center gap-3">
              <UserAvatar name={product.maker} src={product.makerProfile?.avatarUrl} size="md" />
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-bold">
                  <span className="truncate">{product.maker}</span>
                  {product.verified && <VerifiedBadge className="size-4" />}
                </p>
                <p className="truncate text-sm text-mist">{product.makerProfile?.headline || `Maker of ${product.name}`}</p>
              </div>
            </div>
            {makerLinks.length > 0 && (
              <ul className="mt-4 flex gap-2">
                {makerLinks.map(({ label, href, Icon }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${product.maker} on ${label}`}
                      className="grid size-9 place-items-center rounded-[10px] border-2 border-line text-ink transition-colors hover:border-ink"
                    >
                      <Icon className="size-4" />
                    </a>
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
              </div>
            )}
          </section>

          <ReportForm productId={product.id} />
        </aside>
      </div>
    </>
  );
}

const bandChip = "rounded-full border-2 border-on-signal/25 bg-white/50 px-3 py-1 text-sm font-semibold";
const linkClass = "underline decoration-line decoration-2 underline-offset-4 hover:decoration-pop";

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="shrink-0 text-mist">{label}</dt>
      <dd className="min-w-0 text-right font-semibold">{children}</dd>
    </div>
  );
}

function RankTile({ rank, caption }: { rank: number; caption: string }) {
  return (
    <div className="rounded-2xl bg-signal-wash px-3 py-3">
      <p className="font-display text-3xl leading-none font-extrabold tabular-nums">#{rank}</p>
      <p className="mt-1.5 text-xs leading-snug font-semibold text-mist">{caption}</p>
    </div>
  );
}

function CompareRow({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <tr>
      <th scope="row" className="px-4 py-3 font-semibold text-mist">
        {label}
      </th>
      <td className="px-4 py-3 font-semibold">{a}</td>
      <td className="px-4 py-3 font-semibold">{b}</td>
    </tr>
  );
}

function SignInPrompt({ href, action, children }: { href: string; action: string; children: React.ReactNode }) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-3 rounded-[18px] border-2 border-ink bg-paper px-5 py-4">
      <span className="min-w-0 flex-1 basis-60">{children}</span>
      <Link
        href={href}
        className="press inline-flex h-10 items-center rounded-xl border-2 border-on-signal bg-signal px-4 text-sm font-bold text-on-signal shadow-[3px_3px_0_0_var(--pop)]"
      >
        {action}
      </Link>
    </p>
  );
}

/** A tear-off calendar page for an upcoming launch day. */
function CalendarTile({ date }: { date: Date }) {
  const month = date.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
  const weekday = date.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
  return (
    <span
      aria-hidden="true"
      className="flex w-[60px] shrink-0 flex-col overflow-hidden rounded-[14px] border-2 border-ink bg-paper text-center shadow-[3px_3px_0_0_var(--ink)]"
    >
      <span className="bg-pop py-0.5 text-[11px] font-bold tracking-wide text-on-signal uppercase">{month}</span>
      <span className="pt-1.5 font-display text-2xl leading-none font-extrabold tabular-nums">{date.getUTCDate()}</span>
      <span className="pb-1.5 text-[11px] font-semibold text-mist">{weekday}</span>
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
      <div className="band">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-20 pb-12 motion-safe:animate-pulse sm:px-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-end lg:pb-14">
          <div>
            <div className="size-24 -rotate-3 rounded-[24px] bg-on-signal/10 sm:size-28" />
            <div className="mt-7 h-16 w-2/3 max-w-md rounded-xl bg-on-signal/10" />
            <div className="mt-4 h-7 w-1/2 max-w-sm rounded bg-on-signal/10" />
          </div>
          <div className="h-56 rounded-[22px] bg-on-signal/10" />
        </div>
        <div className="hazard" />
      </div>
    </div>
  );
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
