import Link from "next/link";
import { MakerAvatar, RankBadge, VerifiedBadge } from "@/components/badges";
import { CommentIcon } from "@/components/icons";
import { LogoTile } from "@/components/logo-tile";
import { PlatformBadges } from "@/components/platform-badges";
import { UpvoteButton } from "@/components/upvote-button";
import type { LaunchSummary } from "@/lib/launches";

/** One product in a ranked list. The whole card opens the product page. */
export function LaunchCard({
  launch,
  rank,
  topicHref = (slug) => `/categories/${slug}`,
}: {
  launch: LaunchSummary;
  /** Position in the list, shown on the left; the top three also get a medal. */
  rank?: number;
  topicHref?: (slug: string) => string;
}) {
  return (
    <li>
      <article
        className={`relative flex items-center gap-3.5 rounded-[18px] border-2 p-4 transition-colors sm:gap-5 sm:px-5 ${
          launch.featured ? "border-pop bg-pop-wash" : "border-line bg-paper hover:border-ink"
        }`}
      >
        {launch.featured && (
          <span className="absolute -top-3 left-4 rounded-full border-2 border-on-signal bg-pop px-2.5 py-px text-[11px] font-bold text-on-signal sm:left-5">
            Featured
          </span>
        )}
        {rank !== undefined && (
          <span className="hidden w-7 shrink-0 text-center font-display text-[22px] font-extrabold text-mist tabular-nums sm:block">
            {rank}
          </span>
        )}
        <LogoTile name={launch.name} accent={launch.accent} src={launch.logoUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="font-display text-lg leading-tight font-extrabold sm:text-[19px]">
              <Link
                href={`/products/${launch.slug}`}
                className="decoration-pop decoration-[3px] underline-offset-4 after:absolute after:inset-0 after:rounded-[18px] hover:underline"
              >
                {launch.name}
              </Link>
            </h3>
            {launch.verified && <VerifiedBadge />}
            {rank !== undefined && <RankBadge rank={rank} />}
          </div>
          <p className="mt-0.5 text-mist sm:truncate">{launch.tagline}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-sm">
            <span className="flex items-center gap-1.5 text-mist">
              <MakerAvatar name={launch.maker} />
              {launch.maker}
            </span>
            <PlatformBadges platforms={launch.platforms} />
            {launch.topics.map((t) => (
              <Link
                key={t.slug}
                href={topicHref(t.slug)}
                scroll={false}
                className="relative z-10 font-semibold hover:underline hover:decoration-pop hover:decoration-2 hover:underline-offset-4"
              >
                <span aria-hidden="true" className="font-extrabold text-pop">
                  #
                </span>
                {t.name}
              </Link>
            ))}
            <Link
              href={`/products/${launch.slug}#comments`}
              className="relative z-10 flex items-center gap-1 text-mist hover:text-ink"
            >
              <CommentIcon className="size-4" />
              <span className="tabular-nums">{launch.commentCount}</span>
              <span className="sr-only">{launch.commentCount === 1 ? " comment" : " comments"}</span>
            </Link>
          </div>
        </div>
        <div className="relative z-10">
          <UpvoteButton
            productId={launch.id}
            productName={launch.name}
            voteCount={launch.voteCount}
            hasVoted={launch.hasVoted}
          />
        </div>
      </article>
    </li>
  );
}
