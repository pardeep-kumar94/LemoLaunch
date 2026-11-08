import Link from "next/link";
import { ArrowRight, ChevronRight, ChevronUp, Globe, Smartphone } from "lucide-react";
import { VerifiedBadge } from "@/components/badges";
import { LogoTile } from "@/components/logo-tile";
import { Button } from "@/components/ui/button";
import { PLATFORMS, platformLabels, type Platform } from "@/lib/platforms";
import { cn } from "@/lib/utils";

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
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h2 id={id} className={cn("font-display font-bold", size === "lg" ? "text-[26px]" : "text-xl")}>
        {title}
      </h2>
      {description && <p className="text-muted-foreground">{description}</p>}
      {link && (
        <Button asChild variant="ghost" size="sm" className="ml-auto">
          <Link href={link.href}>
            {link.label}
            <ChevronRight data-icon="inline-end" />
          </Link>
        </Button>
      )}
    </div>
  );
}

/** Sidebar card with a heading and optional link. */
export function Panel({
  id,
  title,
  link,
  action,
  children,
  className,
}: {
  id: string;
  title: string;
  link?: { href: string; label: string };
  /** A control on the right of the heading, e.g. a period switch. */
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={cn("rounded-2xl bg-card p-5 shadow-paper ring-1 ring-border", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id={id} className="font-display text-[19px] font-bold">
          {title}
        </h2>
        {action}
        {link && (
          <Link href={link.href} className="text-[13px] font-medium text-muted-foreground hover:text-foreground">
            {link.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/** Compact list of launches for sidebars, optionally numbered and with upvote counts. */
export function MiniList({
  launches,
  showVotes = false,
  ranked = false,
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
  /** Numbers the list and draws vote bars, for leaderboards. */
  ranked?: boolean;
}) {
  const List = ranked ? "ol" : "ul";
  const top = Math.max(1, ...launches.map((l) => l.voteCount ?? 0));
  return (
    <List className="flex flex-col">
      {launches.map((launch, index) => (
        <li key={launch.id}>
          <Link href={`/products/${launch.slug}`} className="group flex items-center gap-3 py-2">
            {ranked && <span className="num w-4 shrink-0 text-center text-[13px] text-muted-foreground">{index + 1}</span>}
            <LogoTile name={launch.name} accent={launch.accent} src={launch.logoUrl} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 leading-tight font-semibold group-hover:underline group-hover:decoration-lemon-deep group-hover:decoration-2">
                <span className="truncate">{launch.name}</span>
                {launch.verified && <VerifiedBadge className="size-3.5" />}
              </span>
              {ranked && launch.voteCount !== undefined ? (
                <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-lemon-deep" style={{ width: `${(launch.voteCount / top) * 100}%` }} />
                </span>
              ) : (
                <span className="block truncate text-[13px] text-muted-foreground">{launch.subtitle}</span>
              )}
            </span>
            {showVotes && launch.voteCount !== undefined && (
              <span className="num flex shrink-0 items-center gap-0.5 text-[13px]">
                {!ranked && <ChevronUp className="size-3" aria-hidden />}
                {launch.voteCount}
                <span className="sr-only"> upvotes</span>
              </span>
            )}
          </Link>
        </li>
      ))}
    </List>
  );
}

type TopicEntry = {
  slug: string;
  name: string;
  count: number;
  top: { id: string; name: string; accent: string; logoUrl: string | null }[];
};

function LogoStack({ products }: { products: TopicEntry["top"] }) {
  return (
    <span className="flex -space-x-2" aria-hidden="true">
      {products.map((p) => (
        <span key={p.id} className="rounded-[10px] ring-2 ring-card">
          <LogoTile name={p.name} accent={p.accent} src={p.logoUrl} size="sm" />
        </span>
      ))}
    </span>
  );
}

const launchesLabel = (n: number) => `${n} ${n === 1 ? "launch" : "launches"}`;

/** Every category, for the categories page. */
export function CategoryGrid({ topics }: { topics: TopicEntry[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {topics.map((topic) => (
        <li key={topic.slug}>
          <Link
            href={`/categories/${topic.slug}`}
            className="flex items-center justify-between gap-4 rounded-2xl bg-card p-5 shadow-paper ring-1 ring-border transition-shadow hover:shadow-lift"
          >
            <span>
              <span className="block font-display text-xl font-bold">{topic.name}</span>
              <span className="num text-[13px] text-muted-foreground">{launchesLabel(topic.count)}</span>
            </span>
            <LogoStack products={topic.top} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Filter link styled as a small button; the active one is filled. */
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
    <Button asChild size="sm" variant={active ? "default" : "outline"} className="shrink-0 [&_.opacity-70]:opacity-60">
      <Link href={href} scroll={false} aria-current={active ? "page" : undefined}>
        {children}
      </Link>
    </Button>
  );
}

/** A segmented control made of links, like shadcn Tabs but for URL state. */
export function Segmented({
  label,
  options,
  className,
}: {
  label: string;
  options: { href: string; label: React.ReactNode; active: boolean; dim?: boolean }[];
  className?: string;
}) {
  return (
    <nav
      aria-label={label}
      className={cn("inline-flex h-9 max-w-full items-center overflow-x-auto rounded-xl bg-muted p-[3px] text-muted-foreground [scrollbar-width:none]", className)}
    >
      {options.map((o, i) => (
        <Link
          key={i}
          href={o.href}
          scroll={false}
          aria-current={o.active ? "page" : undefined}
          className={cn(
            "inline-flex h-full shrink-0 items-center gap-1.5 rounded-[9px] px-2.5 text-[13px] font-medium whitespace-nowrap transition-colors",
            o.active ? "bg-card text-foreground shadow-xs" : "hover:text-foreground",
            o.dim && !o.active && "opacity-50",
          )}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}

/** "All / Web / iOS / Android" switch with counts. */
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
    { label: "All", count: total },
    ...PLATFORMS.map((p) => ({ key: p, label: platformLabels[p].short, count: counts[p] ?? 0 })),
  ];
  return (
    <Segmented
      label="Filter by platform"
      options={options.map((o) => ({
        href: hrefFor(o.key),
        active: o.key === active,
        dim: o.count === 0,
        label: (
          <>
            {o.key === "web" && <Globe className="size-3.5" aria-hidden />}
            {(o.key === "ios" || o.key === "android") && <Smartphone className="size-3.5" aria-hidden />}
            {o.label}
            <span className="num text-[12px] opacity-60">{o.count}</span>
          </>
        ),
      }))}
    />
  );
}

/** Category links with counts, as a list. */
export function TopicChips({ topics }: { topics: { slug: string; name: string; count: number }[] }) {
  return (
    <ul className="flex flex-col">
      {topics.map((t) => (
        <li key={t.slug} className="border-b border-border last:border-0">
          <Link href={`/categories/${t.slug}`} className="flex items-center justify-between py-2 hover:text-foreground">
            <span className="font-medium">{t.name}</span>
            <span className="num text-[12.5px] text-muted-foreground">{t.count}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Closing call to action before the footer. */
export function SubmitCallout() {
  return (
    <section aria-labelledby="callout-heading" className="mx-auto mt-20 max-w-6xl px-4 sm:px-8">
      <div className="flex flex-col gap-6 rounded-3xl bg-accent px-6 py-10 ring-1 ring-[color-mix(in_oklab,var(--lemon-deep)_40%,var(--border))] sm:px-10 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <h2 id="callout-heading" className="font-display text-4xl leading-[1] font-bold text-balance sm:text-[44px]">
            Launching something? Take a seat.
          </h2>
          <p className="mt-3 text-[17px] text-accent-foreground">
            100 products launch each day at 00:00 UTC. A free launch takes the next open seat.
          </p>
        </div>
        <Button asChild size="lg" className="self-start md:self-auto">
          <Link href="/submit">
            Submit your launch
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

/** Page header for inner pages: a big display title, an intro line and optional controls. */
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
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-10 sm:px-8 sm:pt-14">
        <h1 className="font-display text-5xl leading-[0.95] font-bold text-balance sm:text-[64px]">{title}</h1>
        {description && <p className="mt-4 max-w-2xl text-[17px] text-muted-foreground">{description}</p>}
        {children}
      </div>
    </section>
  );
}
