import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { BadgeEmbed } from "@/components/badge-embed";
import { CommentForm } from "@/components/comment-form";
import { LogoTile } from "@/components/logo-tile";
import { ExternalIcon, GlobeIcon, PhoneIcon } from "@/components/icons";
import { MediaGallery } from "@/components/media-gallery";
import { PlatformBadges } from "@/components/platform-badges";
import { UserAvatar } from "@/components/user-avatar";
import { UpvoteButton } from "@/components/upvote-button";
import { db } from "@/lib/db";
import { formatLaunchDay, isSameUtcDay, startOfUtcDay, toDayParam } from "@/lib/dates";
import { getCurrentUser } from "@/lib/auth";
import { siteOrigin } from "@/lib/origin";
import { getComments, getProductBySlug, getRelatedLaunches, isUpcoming } from "@/lib/launches";
import { platformLabels, sortPlatforms } from "@/lib/platforms";
import { toEmbedUrl } from "@/lib/uploads";
import { readVisitorId } from "@/lib/visitor";

const SLUG_PATTERN = /^[a-z0-9-]{1,80}$/;

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = SLUG_PATTERN.test(slug)
    ? await db.product.findUnique({ where: { slug }, select: { name: true, tagline: true } })
    : null;
  if (!product) return { title: "Product not found | LaunchPad" };
  return { title: `${product.name} | LaunchPad`, description: product.tagline };
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
  const primaryTopic = product.topics[0];
  const [related, comments, user] = await Promise.all([
    primaryTopic ? getRelatedLaunches(product.id, primaryTopic.slug, today) : [],
    getComments(product.id),
    getCurrentUser(),
  ]);
  const isMaker = Boolean(user && product.makerId === user.id);
  const origin = isMaker ? await siteOrigin() : "";

  const getLinks = [
    product.websiteUrl && { platform: "web", href: product.websiteUrl, eyebrow: "Visit", label: "Website" },
    product.appStoreUrl && { platform: "ios", href: product.appStoreUrl, eyebrow: "Download on the", label: "App Store" },
    product.playStoreUrl && { platform: "android", href: product.playStoreUrl, eyebrow: "Get it on", label: "Google Play" },
  ].filter((link): link is { platform: string; href: string; eyebrow: string; label: string } => Boolean(link));

  const video = !product.videoUrl
    ? null
    : product.videoUrl.startsWith("/uploads/")
      ? { kind: "file" as const, src: product.videoUrl }
      : (() => {
          const embed = toEmbedUrl(product.videoUrl);
          return embed ? { kind: "embed" as const, src: embed } : null;
        })();

  return (
    <>
      <section className="band">
        <div className="mx-auto max-w-6xl px-4 pt-10 pb-12 sm:px-8">
          <Link
            href={upcoming ? "/#upcoming" : dayHref}
            className="text-sm font-semibold underline decoration-pop decoration-2 underline-offset-4"
          >
            {upcoming
              ? "Back to launches"
              : `Back to ${launchedToday ? "today" : weekday}'s launches`}
          </Link>
          <div className="mt-8 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex min-w-0 items-center gap-5 sm:gap-6">
              <LogoTile name={product.name} accent={product.accent} src={product.logoUrl} size="lg" />
              <div className="min-w-0">
                <h1
                  className="lift-off font-display text-5xl leading-[0.95] font-extrabold tracking-[-0.015em] sm:text-7xl"
                >
                  {product.name}
                </h1>
                <p className="mt-2 max-w-xl text-lg opacity-80 sm:text-xl">{product.tagline}</p>
                <div className="mt-3">
                  <PlatformBadges platforms={product.platforms} tone="band" />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 xl:shrink-0 xl:flex-nowrap">
              {getLinks.map((link, index) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`press inline-flex h-16 items-center gap-2.5 rounded-[14px] border-2 border-on-signal px-4 shadow-[4px_4px_0_0_var(--on-signal)] ${
                    // The first link is the main call to action; the rest are quieter.
                    index === 0 ? "bg-on-signal text-signal" : "bg-white text-on-signal"
                  }`}
                >
                  {link.platform === "web" ? <GlobeIcon className="size-5" /> : <PhoneIcon className="size-5" />}
                  <span className="text-left leading-tight">
                    <span className="block text-xs opacity-75">{link.eyebrow}</span>
                    <span className="block font-bold">{link.label}</span>
                  </span>
                  <ExternalIcon className="size-4 opacity-60" />
                </a>
              ))}
              {upcoming ? (
                <p className="flex h-16 items-center rounded-[14px] border-2 border-on-signal px-4 font-semibold">
                  Launches {weekday}, {day}
                </p>
              ) : (
                <UpvoteButton
                  productId={product.id}
                  productName={product.name}
                  voteCount={product.voteCount}
                  hasVoted={product.hasVoted}
                  tone="band"
                />
              )}
            </div>
          </div>
        </div>
        <div className="hazard" />
      </section>

      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-14 px-4 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <article>
          {(video || product.galleryUrls.length > 0) && (
            <div className="mb-10">
              <MediaGallery name={product.name} video={video} images={product.galleryUrls} />
            </div>
          )}
          {product.description && (
            <p className="max-w-[62ch] text-xl leading-relaxed">{product.description}</p>
          )}
          <dl className="mt-10 grid max-w-xl grid-cols-[auto_1fr] gap-x-8 gap-y-4 border-t border-line pt-8">
            <dt className="text-mist">Made by</dt>
            <dd className="font-medium">{product.maker}</dd>
            <dt className="text-mist">{upcoming ? "Launches" : "Launched"}</dt>
            <dd className="font-medium">
              {upcoming ? (
                `${weekday}, ${day}`
              ) : (
                <Link
                  href={dayHref}
                  className="underline decoration-line decoration-2 underline-offset-4 hover:decoration-ink"
                >
                  {weekday}, {day}
                </Link>
              )}
            </dd>
            {product.platforms.length > 0 && (
              <>
                <dt className="text-mist">Available on</dt>
                <dd className="font-medium">
                  {sortPlatforms(product.platforms)
                    .map((p) => platformLabels[p].long)
                    .join(", ")}
                </dd>
              </>
            )}
            {product.topics.length > 0 && (
              <>
                <dt className="text-mist">Topics</dt>
                <dd className="flex flex-wrap gap-x-3 gap-y-1 font-medium">
                  {product.topics.map((t) => (
                    <span key={t.slug}>{t.name}</span>
                  ))}
                </dd>
              </>
            )}
            {!upcoming && (
              <>
                <dt className="text-mist">Upvotes</dt>
                <dd className="font-medium tabular-nums">{product.voteCount}</dd>
              </>
            )}
          </dl>
          {isMaker && (
            <section
              id="badge"
              aria-labelledby="badge-heading"
              className="mt-14 scroll-mt-6 rounded-[22px] border-2 border-dashed border-line p-5 sm:p-7"
            >
              <h2 id="badge-heading" className="font-display text-2xl font-extrabold">
                Add a badge to your site
              </h2>
              <p className="mt-2 max-w-[60ch] text-mist">
                Show visitors you launched on LaunchPad. The badge links to this page and shows your upvote
                count. Only you can see this section.
              </p>
              <BadgeEmbed origin={origin} slug={product.slug} />
            </section>
          )}
          <section id="comments" aria-labelledby="comments-heading" className="mt-14 scroll-mt-6 border-t-2 border-line pt-10">
            <h2 id="comments-heading" className="flex items-center gap-2.5 font-display text-[28px] font-extrabold">
              Comments
              <span className="rounded-lg bg-signal-wash px-2 py-0.5 text-lg tabular-nums">{comments.length}</span>
            </h2>
            <div className="mt-6">
              {user ? (
                <CommentForm productId={product.id} userName={user.name} />
              ) : (
                <p className="rounded-[18px] border-2 border-dashed border-line px-5 py-4">
                  <Link
                    href={`/signin?next=${encodeURIComponent(`/products/${product.slug}#comments`)}`}
                    className="font-bold underline decoration-pop decoration-[3px] underline-offset-4"
                  >
                    Sign in
                  </Link>{" "}
                  to ask {product.maker.split(" ")[0]} a question or share what you think.
                </p>
              )}
            </div>
            {comments.length > 0 ? (
              <ol className="mt-8 flex flex-col gap-5">
                {comments.map((comment) => (
                  <li key={comment.id} className="flex gap-3">
                    <UserAvatar name={comment.user.name} src={comment.user.avatarUrl} size="md" />
                    <div className="min-w-0 flex-1 rounded-[16px] border-2 border-line bg-paper px-4 py-3">
                      <p className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-bold">{comment.user.name}</span>
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
              <p className="mt-6 text-mist">No comments yet. Start the conversation.</p>
            )}
          </section>
        </article>

        {related.length > 0 && primaryTopic && (
          <aside aria-labelledby="related-heading">
            <h2 id="related-heading" className="font-display text-xl font-semibold">
              More in {primaryTopic.name}
            </h2>
            <ul className="mt-5 flex flex-col gap-5">
              {related.map((launch) => (
                <li key={launch.id}>
                  <Link href={`/products/${launch.slug}`} className="group flex gap-3">
                    <LogoTile name={launch.name} accent={launch.accent} src={launch.logoUrl} size="sm" />
                    <div className="min-w-0">
                      <p className="leading-tight font-semibold decoration-pop decoration-[3px] underline-offset-4 group-hover:underline">
                        {launch.name}
                      </p>
                      <p className="text-sm text-mist">{launch.tagline}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </>
  );
}

function ProductSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading product">
      <div className="band">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 pt-20 pb-12 motion-safe:animate-pulse sm:px-8">
          <div className="size-20 rounded-2xl bg-on-signal/10 sm:size-24" />
          <div className="flex-1">
            <div className="h-14 w-2/3 max-w-md rounded-xl bg-on-signal/10" />
            <div className="mt-3 h-6 w-1/2 max-w-sm rounded bg-on-signal/10" />
          </div>
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
