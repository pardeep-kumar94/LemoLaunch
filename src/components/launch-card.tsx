import Link from "next/link";
import { MessageCircle, Pin, Zap } from "lucide-react";
import { MakerAvatar, VerifiedBadge } from "@/components/badges";
import { LogoTile } from "@/components/logo-tile";
import { PlatformBadges } from "@/components/platform-badges";
import { Badge } from "@/components/ui/badge";
import { UpvoteButton } from "@/components/upvote-button";
import type { LaunchSummary } from "@/lib/launches";
import { cn } from "@/lib/utils";

/** A card holding launch rows, separated by hairlines. Children are LaunchCard items. */
export function LaunchList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <ol className={cn("divide-y divide-border overflow-hidden rounded-2xl bg-card shadow-paper ring-1 ring-border", className)}>
      {children}
    </ol>
  );
}

/** One product in a ranked list. The whole row opens the product page. */
export function LaunchCard({
  launch,
  rank,
  topicHref = (slug) => `/categories/${slug}`,
  pinned,
  promoted = false,
}: {
  launch: LaunchSummary;
  /** Position in the list, shown on the left. */
  rank?: number;
  topicHref?: (slug: string) => string;
  /** Fast Track: pinned to the top, with how much of the pinned time is left (0 to 1). */
  pinned?: { remaining: number };
  /** Paid placement; shown with a Promoted label and no rank. */
  promoted?: boolean;
}) {
  const label = pinned ? "Fast Track" : launch.featured ? "Featured" : null;
  // Unranked lists (search results) drop the rank column entirely.
  const showRank = rank !== undefined || Boolean(pinned) || promoted;
  return (
    <li
      className={cn(
        "group relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3.5 px-4 py-4 transition-colors sm:px-5",
        showRank ? "sm:grid-cols-[28px_48px_minmax(0,1fr)_auto]" : "sm:grid-cols-[48px_minmax(0,1fr)_auto]",
        promoted ? "bg-[color-mix(in_oklab,var(--muted)_55%,var(--card))]" : "hover:bg-[color-mix(in_oklab,var(--accent)_55%,var(--card))]",
      )}
    >
      {showRank && (
        <span className="num hidden text-center text-[13px] text-muted-foreground sm:block">
          {pinned ? <Pin className="mx-auto size-4 text-foreground" aria-label="Pinned" /> : promoted ? null : rank}
        </span>
      )}
      <div className="flex min-w-0 items-center gap-3.5 sm:contents">
        <LogoTile name={launch.name} accent={launch.accent} src={launch.logoUrl} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-[15.5px] leading-tight font-semibold tracking-[-0.01em]">
              <Link
                href={`/products/${launch.slug}`}
                className="outline-none after:absolute after:inset-0 focus-visible:underline focus-visible:decoration-lemon-deep focus-visible:decoration-2"
              >
                {launch.name}
              </Link>
            </h3>
            {launch.verified && <VerifiedBadge />}
            {label && (
              <Badge variant="lemon">
                <Zap aria-hidden />
                {label}
              </Badge>
            )}
            {promoted && <Badge variant="secondary">Promoted</Badge>}
          </div>
          <p className="mt-0.5 text-muted-foreground sm:truncate">{launch.tagline}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] text-muted-foreground">
            {launch.topics.slice(0, 2).map((t) => (
              <Link
                key={t.slug}
                href={topicHref(t.slug)}
                scroll={false}
                className="relative z-10 font-medium text-foreground hover:underline hover:decoration-lemon-deep hover:decoration-2"
              >
                {t.name}
              </Link>
            ))}
            <PlatformBadges platforms={launch.platforms} />
            <span className="hidden items-center gap-1.5 sm:inline-flex">
              <MakerAvatar name={launch.maker} />
              {launch.maker}
            </span>
            <Link
              href={`/products/${launch.slug}#discussion`}
              className="relative z-10 inline-flex items-center gap-1 hover:text-foreground"
            >
              <MessageCircle className="size-3" aria-hidden />
              <span className="num">{launch.commentCount}</span>
              <span className="sr-only">{launch.commentCount === 1 ? " comment" : " comments"}</span>
            </Link>
          </div>
        </div>
      </div>
      <UpvoteButton productId={launch.id} productName={launch.name} voteCount={launch.voteCount} hasVoted={launch.hasVoted} />
      {pinned && (
        <span aria-hidden className="absolute inset-x-0 -bottom-px h-[3px] bg-[color-mix(in_oklab,var(--lemon)_30%,transparent)]">
          <span className="block h-full rounded-r-full bg-lemon-deep" style={{ width: `${Math.round(pinned.remaining * 100)}%` }} />
        </span>
      )}
    </li>
  );
}
