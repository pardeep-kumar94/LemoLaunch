import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LaunchCard, LaunchList } from "@/components/launch-card";
import { FilterTab, PageBand, Panel, PlatformFilter, SubmitCallout } from "@/components/sections";
import { Button } from "@/components/ui/button";
import { addUtcDays, formatLaunchDay, parseDayParam, startOfUtcDay, toDayParam } from "@/lib/dates";
import {
  countLaunchesInRange,
  countPlatformsInRange,
  getLaunchCountsByDay,
  getRankedLaunches,
  getTopicsInRange,
} from "@/lib/launches";
import { isPlatform, platformLabels } from "@/lib/platforms";
import { pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { readVisitorId } from "@/lib/visitor";

export const metadata: Metadata = pageMetadata({
  title: "Launch archive: every past launch day",
  description:
    "Browse every product launched on LemoLaunch, day by day, ranked by the community upvotes each launch earned.",
  path: "/archive",
});

/** How far back the day list reaches. */
const ARCHIVE_DAYS = 30;

export default function ArchivePage({ searchParams }: PageProps<"/archive">) {
  return (
    <main>
      <Suspense fallback={<PageBand title="Archive" />}>
        <Archive searchParams={searchParams} />
      </Suspense>
      <SubmitCallout />
    </main>
  );
}

async function Archive({ searchParams }: { searchParams: PageProps<"/archive">["searchParams"] }) {
  const params = await searchParams;
  const visitorId = await readVisitorId();
  await connection();
  const today = startOfUtcDay(new Date());
  const yesterday = addUtcDays(today, -1);

  // Week and month rankings moved to the leaderboard.
  if (params.range === "week") redirect("/leaderboard");
  if (params.range === "month") redirect("/leaderboard?days=30");

  // Any past day, yesterday by default; today itself belongs on the homepage.
  const requestedDay = parseDayParam(params.day);
  const day = requestedDay && requestedDay.getTime() < today.getTime() ? requestedDay : yesterday;
  const topic =
    typeof params.topic === "string" && /^[a-z0-9-]{1,40}$/.test(params.topic) ? params.topic : undefined;
  const platform = isPlatform(params.platform) ? params.platform : undefined;

  const [ranked, topics, dayCounts, platformCounts, total] = await Promise.all([
    getRankedLaunches({ from: day, to: day, visitorId, topicSlug: topic, platform }),
    getTopicsInRange(day, day),
    getLaunchCountsByDay(addUtcDays(today, -ARCHIVE_DAYS), yesterday),
    countPlatformsInRange(day, day),
    countLaunchesInRange(day, day),
  ]);

  const names = formatLaunchDay(day);
  const scope = `on ${names.weekday}, ${names.day}`;
  const activeTopic = topics.find((t) => t.slug === topic);
  const filtered = Boolean(activeTopic || platform);

  const hrefFor = (next: { day?: Date; topic?: string; platform?: string }) => {
    const query = new URLSearchParams();
    if (next.day && next.day.getTime() !== yesterday.getTime()) query.set("day", toDayParam(next.day));
    if (next.topic) query.set("topic", next.topic);
    if (next.platform) query.set("platform", next.platform);
    const qs = query.toString();
    return qs ? `/archive?${qs}` : "/archive";
  };
  const current = { day, platform };

  const pastDays = Array.from({ length: ARCHIVE_DAYS }, (_, i) => addUtcDays(yesterday, -i)).filter(
    (d) => (dayCounts.get(toDayParam(d)) ?? 0) > 0,
  );
  const previousDay = pastDays.find((d) => d.getTime() < day.getTime());
  const nextDay = [...pastDays].reverse().find((d) => d.getTime() > day.getTime());

  return (
    <>
      <PageBand
        title={`${names.weekday}, ${names.day}`}
        description={`${total} ${total === 1 ? "launch" : "launches"} on this day, ranked by the upvotes they earned. Today's launches are on the homepage.`}
      >
        <div className="mt-7 flex flex-wrap items-center gap-2">
          {previousDay ? (
            <Button asChild variant="outline" size="sm">
              <Link href={hrefFor({ day: previousDay })}>
                <ChevronLeft data-icon="inline-start" />
                {formatLaunchDay(previousDay).weekday}
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <ChevronLeft data-icon="inline-start" />
              Earlier
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href={nextDay ? hrefFor({ day: nextDay }) : "/"}>
              {nextDay ? formatLaunchDay(nextDay).weekday : "Today"}
              <ChevronRight data-icon="inline-end" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/leaderboard">Top launches of the week</Link>
          </Button>
        </div>
      </PageBand>

      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-10 px-4 pt-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section aria-labelledby="archive-list-heading" className="min-w-0">
          <h2 id="archive-list-heading" className="sr-only">
            {activeTopic ? `${activeTopic.name} launches` : "All launches"}
            {platform ? ` on ${platformLabels[platform].short}` : ""} {scope}
          </h2>
          <PlatformFilter
            active={platform}
            counts={platformCounts}
            total={total}
            hrefFor={(p) => hrefFor({ ...current, topic, platform: p })}
          />
          {topics.length > 1 && (
            <nav
              aria-label="Filter by category"
              className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
            >
              <FilterTab href={hrefFor(current)} active={!activeTopic}>
                All categories
              </FilterTab>
              {topics.map((t) => (
                <FilterTab
                  key={t.slug}
                  href={hrefFor({ ...current, topic: t.slug === activeTopic?.slug ? undefined : t.slug })}
                  active={t.slug === activeTopic?.slug}
                >
                  {t.name} <span className="num text-[12px] opacity-60">{t.count}</span>
                </FilterTab>
              ))}
            </nav>
          )}
          {ranked.length > 0 ? (
            <LaunchList className="mt-4">
              {ranked.map((launch, index) => (
                <LaunchCard
                  key={launch.id}
                  launch={launch}
                  rank={index + 1}
                  topicHref={(slug) => hrefFor({ ...current, topic: slug })}
                />
              ))}
            </LaunchList>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-input px-6 py-12 text-center">
              <p className="text-lg">
                {total === 0 ? `Nothing launched ${scope}.` : `No launches ${scope} match these filters.`}
              </p>
              {filtered && (
                <Button asChild variant="link" className="mt-1">
                  <Link href={hrefFor({ day })}>Clear filters</Link>
                </Button>
              )}
            </div>
          )}
        </section>

        {pastDays.length > 0 && (
          <aside>
            <Panel id="days-heading" title="Browse by day" className="lg:sticky lg:top-24">
              <ul className="-mx-2 flex max-h-[28rem] flex-col overflow-y-auto">
                {pastDays.map((d) => {
                  const dayNames = formatLaunchDay(d);
                  const count = dayCounts.get(toDayParam(d)) ?? 0;
                  const active = toDayParam(d) === toDayParam(day);
                  return (
                    <li key={toDayParam(d)}>
                      <Link
                        href={hrefFor({ day: d })}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors",
                          active ? "bg-accent font-medium text-accent-foreground" : "hover:bg-muted",
                        )}
                      >
                        <span>
                          {dayNames.weekday}, {dayNames.day}
                        </span>
                        <span className="num text-[12.5px] text-muted-foreground">{count}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </aside>
        )}
      </div>
    </>
  );
}
