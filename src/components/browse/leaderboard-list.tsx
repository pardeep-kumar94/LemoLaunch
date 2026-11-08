import Link from "next/link";
import { VerifiedBadge } from "@/components/badges";
import { LogoTile } from "@/components/logo-tile";
import { formatLaunchDay, isSameUtcDay } from "@/lib/dates";
import type { LaunchSummary } from "@/lib/launches";

export type LeaderboardEntry = LaunchSummary & { launchDate: Date; category: string | null };

/**
 * Ranked launches as rows: rank, logo, name and tagline, category, launch day, and a bar
 * showing each launch's upvotes against the leader's. Every rank looks the same.
 */
export function LeaderboardList({ entries, today }: { entries: LeaderboardEntry[]; today: Date }) {
  const top = Math.max(1, ...entries.map((e) => e.voteCount));
  return (
    <ol className="divide-y divide-border overflow-hidden rounded-2xl bg-card shadow-paper ring-1 ring-border">
      {entries.map((entry, index) => {
        const { weekday, day } = formatLaunchDay(entry.launchDate);
        const when = isSameUtcDay(entry.launchDate, today) ? "Today" : `${weekday.slice(0, 3)} ${day.replace(/ (\w{3})\w*$/, " $1")}`;
        return (
          <li key={entry.id}>
            <Link
              href={`/products/${entry.slug}`}
              className="grid grid-cols-[24px_40px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[color-mix(in_oklab,var(--accent)_55%,var(--card))] sm:grid-cols-[32px_48px_minmax(0,1fr)_auto] sm:gap-4 sm:px-5 md:grid-cols-[32px_48px_minmax(0,1fr)_130px_90px_220px] lg:grid-cols-[36px_48px_minmax(0,1fr)_150px_100px_260px]"
            >
              <span className="num text-center text-[15px] text-muted-foreground">{index + 1}</span>
              <LogoTile name={entry.name} accent={entry.accent} src={entry.logoUrl} className="size-10 rounded-[10px] text-base sm:size-12 sm:rounded-xl sm:text-xl" />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-[15.5px] leading-tight font-semibold tracking-[-0.01em]">
                  <span className="truncate">{entry.name}</span>
                  {entry.verified && <VerifiedBadge />}
                </span>
                <span className="mt-0.5 block truncate text-[13.5px] text-muted-foreground">{entry.tagline}</span>
                <span className="mt-1 block text-[12.5px] text-muted-foreground md:hidden">
                  {[entry.category, when].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span className="hidden truncate font-medium md:block">{entry.category ?? "—"}</span>
              <span className="num hidden text-[13px] text-muted-foreground md:block">{when}</span>
              <span className="flex items-center justify-end gap-3">
                <span aria-hidden className="hidden h-2 flex-1 overflow-hidden rounded-full bg-muted md:block">
                  <span className="block h-full rounded-full bg-lemon-deep" style={{ width: `${(entry.voteCount / top) * 100}%` }} />
                </span>
                <span className="num w-11 text-right font-medium">
                  {entry.voteCount}
                  <span className="sr-only"> upvotes</span>
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
