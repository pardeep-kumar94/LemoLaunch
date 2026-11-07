import Link from "next/link";
import { MakerAvatar, VerifiedBadge } from "@/components/badges";
import { CommentIcon, GlobeIcon, PhoneIcon, UpTriangle } from "@/components/icons";
import { LogoTile } from "@/components/logo-tile";
import { PlatformBadges } from "@/components/platform-badges";
import { UpvoteButton } from "@/components/upvote-button";
import type { LaunchSummary } from "@/lib/launches";
import { PLATFORMS, platformLabels, type Platform } from "@/lib/platforms";

/** Section heading with an optional "see all" link on the right. */
export function SectionHeading({
  id,
  title,
  description,
  link,
  size = "lg",
}: {
  id: string;
  title: string;
  description?: string;
  link?: { href: string; label: string };
  size?: "sm" | "lg";
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2
          id={id}
          className={`font-display font-extrabold tracking-[-0.02em] ${
            size === "lg" ? "text-[28px] sm:text-[34px]" : "text-xl"
          }`}
        >
          {title}
        </h2>
        {description && <p className="mt-1 text-mist">{description}</p>}
      </div>
      {link && (
        <Link
          href={link.href}
          className="shrink-0 text-sm font-semibold text-mist underline decoration-pop decoration-2 underline-offset-4 hover:text-ink"
        >
          {link.label}
        </Link>
      )}
    </div>
  );
}

/** Rounded sidebar panel with a heading and optional link. */
export function Panel({
  id,
  title,
  link,
  children,
}: {
  id: string;
  title: string;
  link?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="rounded-[20px] border-2 border-line bg-paper p-5">
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <h2 id={id} className="font-display text-xl font-extrabold">
          {title}
        </h2>
        {link && (
          <Link href={link.href} className="text-[13px] font-semibold text-mist hover:text-ink">
            {link.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/** Compact list of launches for sidebars, optionally with upvote counts. */
export function MiniList({
  launches,
  showVotes = false,
}: {
  launches: {
    id: string;
    slug: string;
    name: string;
    accent: string;
    logoUrl?: string | null;
    subtitle: string;
    voteCount?: number;
    verified?: boolean;
  }[];
  showVotes?: boolean;
}) {
  return (
    <ul className="flex flex-col">
      {launches.map((launch) => (
        <li key={launch.id}>
          <Link href={`/products/${launch.slug}`} className="group flex items-center gap-3 py-2">
            <LogoTile name={launch.name} accent={launch.accent} src={launch.logoUrl} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-[15px] leading-tight font-bold decoration-pop decoration-2 underline-offset-4 group-hover:underline">
                {launch.name}
                {launch.verified && <VerifiedBadge className="size-4" />}
              </span>
              <span className="block truncate text-[13px] text-mist">{launch.subtitle}</span>
            </span>
            {showVotes && launch.voteCount !== undefined && (
              <span className="flex shrink-0 items-center gap-1 rounded-lg bg-signal-wash px-2 py-1 text-xs font-bold tabular-nums">
                <UpTriangle className="size-2.5" />
                {launch.voteCount}
                <span className="sr-only"> upvotes</span>
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

const medals = [
  { name: "Gold", card: "medal-gold pt-9 lg:order-2", chip: "medal-chip-gold" },
  { name: "Silver", card: "medal-silver lg:order-1", chip: "medal-chip-silver" },
  { name: "Bronze", card: "medal-bronze lg:order-3", chip: "medal-chip-bronze" },
];

/** The top three launches as gold, silver and bronze plates, first place raised in the middle. */
export function Podium({ launches }: { launches: LaunchSummary[] }) {
  return (
    <ol className="grid gap-8 lg:grid-cols-[1fr_1.15fr_1fr] lg:items-end lg:gap-5">
      {launches.slice(0, 3).map((launch, index) => {
        const medal = medals[index];
        return (
          <li
            key={launch.id}
            className={`medal-card relative rounded-[22px] p-5 pt-8 sm:p-6 sm:pt-9 ${medal.card}`}
          >
            {index === 0 && <span aria-hidden="true" className="medal-shine" />}
            <span
              className={`medal-chip absolute -top-4 left-5 inline-flex items-center gap-1.5 rounded-[10px] px-3 py-0.5 font-display text-[15px] font-extrabold ${medal.chip}`}
            >
              {index === 0 && (
                <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5">
                  <path d="M2 5l3 2.5L8 3l3 4.5L14 5l-1.25 7.5h-9.5L2 5Z" fill="currentColor" />
                </svg>
              )}
              #{index + 1}
              <span className="text-xs font-bold opacity-70">{medal.name}</span>
            </span>
            <span className="relative block">
              <span className="inline-block rounded-[20px] bg-white/70 p-1 ring-2 ring-white/80">
                <LogoTile name={launch.name} accent={launch.accent} src={launch.logoUrl} size={index === 0 ? "podium" : "md"} />
              </span>
            </span>
            <h3 className="relative mt-3 flex items-center gap-2 font-display text-[26px] leading-tight font-extrabold">
              <Link
                href={`/products/${launch.slug}`}
                className="decoration-pop decoration-[3px] underline-offset-4 hover:underline"
              >
                {launch.name}
              </Link>
              {launch.verified && <VerifiedBadge />}
            </h3>
            <p className="relative mt-1 text-mist">{launch.tagline}</p>
            <div className="relative mt-3">
              <PlatformBadges platforms={launch.platforms} />
            </div>
            <div className="relative mt-4 flex items-center justify-between gap-3">
              <span className="flex min-w-0 flex-col gap-1.5 text-sm text-mist">
                <span className="flex min-w-0 items-center gap-2">
                  <MakerAvatar name={launch.maker} />
                  <span className="truncate">{launch.maker}</span>
                </span>
                <Link href={`/products/${launch.slug}#comments`} className="flex w-fit items-center gap-1.5 hover:text-ink">
                  <CommentIcon className="size-4" />
                  {launch.commentCount} {launch.commentCount === 1 ? "comment" : "comments"}
                </Link>
              </span>
              <UpvoteButton
                productId={launch.id}
                productName={launch.name}
                voteCount={launch.voteCount}
                hasVoted={launch.hasVoted}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

type TopicEntry = {
  slug: string;
  name: string;
  count: number;
  top: { id: string; name: string; accent: string; logoUrl: string | null }[];
};

function LogoStack({ products, size = "md" }: { products: TopicEntry["top"]; size?: "sm" | "md" }) {
  const box = size === "md" ? "size-10 rounded-xl text-base" : "size-9 rounded-lg text-sm";
  return (
    <span className="flex -space-x-2.5" aria-hidden="true">
      {products.map((p) => (
        <span key={p.id} className={`overflow-hidden border-2 border-paper ${box} [&>*]:size-full [&>*]:rounded-none`}>
          <LogoTile name={p.name} accent={p.accent} src={p.logoUrl} size="sm" />
        </span>
      ))}
    </span>
  );
}

const launchesLabel = (n: number) => `${n} ${n === 1 ? "launch" : "launches"}`;

/** Every category as an even grid, for the categories page. */
export function CategoryGrid({ topics }: { topics: TopicEntry[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {topics.map((topic) => (
        <li key={topic.slug}>
          <Link
            href={`/categories/${topic.slug}`}
            className="flex items-center justify-between gap-4 rounded-[20px] border-2 border-ink bg-paper p-5 transition-[box-shadow] hover:shadow-[6px_6px_0_0_var(--pop)]"
          >
            <span>
              <span className="block font-display text-xl font-extrabold">{topic.name}</span>
              <span className="text-sm font-semibold text-mist">{launchesLabel(topic.count)}</span>
            </span>
            <LogoStack products={topic.top} size="sm" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Pill-shaped filter link; the active one is filled. */
export function FilterTab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={`shrink-0 rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition-colors ${
        active
          ? "border-on-signal bg-on-signal text-signal dark:bg-signal dark:text-on-signal"
          : "border-line bg-paper hover:border-ink"
      }`}
    >
      {children}
    </Link>
  );
}

/** "All / Web / iOS / Android" switch with counts, as a segmented control. */
export function PlatformFilter({
  active,
  counts,
  total,
  hrefFor,
}: {
  active?: Platform;
  counts: Record<string, number>;
  total: number;
  hrefFor: (platform?: Platform) => string;
}) {
  const options: { key?: Platform; label: string; count: number }[] = [
    { label: "All platforms", count: total },
    ...PLATFORMS.map((p) => ({ key: p, label: platformLabels[p].short, count: counts[p] ?? 0 })),
  ];
  return (
    <nav aria-label="Filter by platform" className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-[14px] border-2 border-line bg-paper p-1 [scrollbar-width:none]">
      {options.map((o) => {
        const isActive = o.key === active;
        return (
          <Link
            key={o.label}
            href={hrefFor(o.key)}
            scroll={false}
            aria-current={isActive ? "page" : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-sm font-semibold transition-colors ${
              isActive
                ? "bg-on-signal text-signal dark:bg-signal dark:text-on-signal"
                : "text-mist hover:text-ink"
            } ${o.count === 0 && !isActive ? "opacity-50" : ""}`}
          >
            {o.key === "web" && <GlobeIcon className="size-3.5" />}
            {(o.key === "ios" || o.key === "android") && <PhoneIcon className="size-3.5" />}
            {o.label}
            <span className="font-normal opacity-70 tabular-nums">{o.count}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Topic chips linking to category pages. */
export function TopicChips({ topics }: { topics: { slug: string; name: string; count: number }[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {topics.map((t) => (
        <li key={t.slug}>
          <Link
            href={`/categories/${t.slug}`}
            className="inline-flex items-center gap-1 rounded-full border-2 border-line px-3 py-1 text-sm font-semibold transition-colors hover:border-ink"
          >
            {t.name}
            <span className="font-normal text-mist tabular-nums">{t.count}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Closing call to action on a cocoa band. */
export function SubmitCallout() {
  return (
    <section aria-labelledby="callout-heading" className="mt-20 bg-on-signal text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-14 sm:px-8 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <h2
            id="callout-heading"
            className="font-display text-4xl leading-[0.95] font-extrabold tracking-[-0.02em] text-signal sm:text-[52px]"
          >
            Launching something? Put it on the pad.
          </h2>
          <p className="mt-3 max-w-xl text-lg opacity-80">
            Pick a launch day. It goes live at 00:00 UTC in front of everyone checking
            today&apos;s launches.
          </p>
        </div>
        <Link
          href="/submit"
          className="press inline-flex h-14 shrink-0 items-center self-start rounded-2xl border-2 border-signal bg-signal px-7 text-lg font-bold text-on-signal shadow-[4px_4px_0_0_var(--pop)] md:self-auto"
        >
          Submit your launch
        </Link>
      </div>
    </section>
  );
}

/** Yellow page header used by inner pages, closed with the hazard edge. */
export function PageBand({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="band">
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-12 sm:px-8 sm:pt-12">
        <h1
          className="lift-off font-display text-5xl leading-[0.95] font-extrabold tracking-[-0.02em] sm:text-7xl"
        >
          {title}
        </h1>
        {description && <p className="mt-4 max-w-xl text-lg opacity-80">{description}</p>}
        {children}
      </div>
      <div className="hazard" />
    </section>
  );
}
