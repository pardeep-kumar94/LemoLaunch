import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { LaunchCard } from "@/components/launch-card";
import {
  FilterTab,
  PageBand,
  Panel,
  PlatformFilter,
  Podium,
  SectionHeading,
  SubmitCallout,
} from "@/components/sections";
import { addUtcDays, formatLaunchDay, parseDayParam, startOfUtcDay, toDayParam } from "@/lib/dates";
import {
  countLaunchesInRange,
  countPlatformsInRange,
  getLaunchCountsByDay,
  getRankedLaunches,
  getTopicsInRange,
} from "@/lib/launches";
import { isPlatform, platformLabels } from "@/lib/platforms";
import { readVisitorId } from "@/lib/visitor";

export const metadata: Metadata = { title: "Archive | LemoLaunch" };

type Range = "yesterday" | "week" | "month";

const ranges: { key: Range; label: string; scope: string }[] = [
  { key: "yesterday", label: "Yesterday", scope: "yesterday" },
  { key: "week", label: "Last 7 days", scope: "in the last 7 days" },
  { key: "month", label: "Last 30 days", scope: "in the last 30 days" },
];

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

  // A specific past day wins over a range; today itself belongs on the homepage.
  const requestedDay = parseDayParam(params.day);
  const day = requestedDay && requestedDay.getTime() < today.getTime() ? requestedDay : null;
  const range: Range = params.range === "week" || params.range === "month" ? params.range : "yesterday";
  const topic =
    typeof params.topic === "string" && /^[a-z0-9-]{1,40}$/.test(params.topic) ? params.topic : undefined;
  const platform = isPlatform(params.platform) ? params.platform : undefined;

  const view = day
    ? { from: day, to: day }
    : range === "week"
      ? { from: addUtcDays(today, -7), to: yesterday }
      : range === "month"
        ? { from: addUtcDays(today, -30), to: yesterday }
        : { from: yesterday, to: yesterday };

  const [ranked, topics, dayCounts, platformCounts, viewTotal] = await Promise.all([
    getRankedLaunches({ ...view, visitorId, topicSlug: topic, platform }),
    getTopicsInRange(view.from, view.to),
    getLaunchCountsByDay(addUtcDays(today, -30), yesterday),
    countPlatformsInRange(view.from, view.to),
    countLaunchesInRange(view.from, view.to),
  ]);

  const dayNames = day ? formatLaunchDay(day) : null;
  const scope = dayNames
    ? `on ${dayNames.weekday}, ${dayNames.day}`
    : ranges.find((r) => r.key === range)!.scope;
  const activeTopic = topics.find((t) => t.slug === topic);
  const total = viewTotal;

  const hrefFor = (next: { range?: Range; day?: Date; topic?: string; platform?: string }) => {
    const query = new URLSearchParams();
    if (next.day) query.set("day", toDayParam(next.day));
    else if (next.range && next.range !== "yesterday") query.set("range", next.range);
    if (next.topic) query.set("topic", next.topic);
    if (next.platform) query.set("platform", next.platform);
    const qs = query.toString();
    return qs ? `/archive?${qs}` : "/archive";
  };
  const current = { range: day ? undefined : range, day: day ?? undefined, platform };
  const filtered = Boolean(activeTopic || platform);

  const podium = filtered ? [] : ranked.slice(0, 3);
  const rest = filtered ? ranked : ranked.slice(3);

  const pastDays = Array.from({ length: 30 }, (_, i) => addUtcDays(yesterday, -i)).filter(
    (d) => (dayCounts.get(toDayParam(d)) ?? 0) > 0,
  );

  return (
    <>
      <PageBand
        title="Archive"
        description="Every launch from past days, ranked by the upvotes it earned. Today's launches are on the homepage."
      >
        <nav aria-label="Archive range" className="mt-8 flex flex-wrap gap-2">
          {ranges.map((r) => {
            const active = !day && range === r.key;
            return (
              <Link
                key={r.key}
                href={hrefFor({ range: r.key })}
                aria-current={active ? "page" : undefined}
                className={`rounded-full border-2 px-4 py-1.5 font-semibold transition-colors ${
                  active
                    ? "border-on-signal bg-on-signal text-signal"
                    : "border-on-signal/30 hover:bg-on-signal/10"
                }`}
              >
                {r.label}
              </Link>
            );
          })}
          {dayNames && (
            <span aria-current="page" className="rounded-full border-2 border-on-signal bg-on-signal px-4 py-1.5 font-semibold text-signal">
              {dayNames.weekday}, {dayNames.day}
            </span>
          )}
        </nav>
      </PageBand>

      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        {podium.length > 0 && (
          <section aria-labelledby="archive-podium-heading" className="mt-14">
            <SectionHeading
              id="archive-podium-heading"
              title={`Top 3 ${scope}`}
              description="Ranked by upvotes."
            />
            <div className="mt-9">
              <Podium launches={podium} />
            </div>
          </section>
        )}

        <div className="mt-16 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section aria-labelledby="archive-list-heading">
            <SectionHeading
              id="archive-list-heading"
              title={`${activeTopic ? `${activeTopic.name} launches` : "All launches"}${
                platform ? ` on ${platformLabels[platform].short}` : ""
              } ${scope}`}
            />
            <div className="mt-4">
              <PlatformFilter
                active={platform}
                counts={platformCounts}
                total={viewTotal}
                hrefFor={(p) => hrefFor({ ...current, topic, platform: p })}
              />
            </div>
            {topics.length > 1 && (
              <nav
                aria-label="Filter by category"
                className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
              >
                <FilterTab href={hrefFor(current)} active={!activeTopic}>
                  All
                </FilterTab>
                {topics.map((t) => (
                  <FilterTab
                    key={t.slug}
                    href={hrefFor({ ...current, topic: t.slug === activeTopic?.slug ? undefined : t.slug })}
                    active={t.slug === activeTopic?.slug}
                  >
                    {t.name} <span className="font-normal opacity-70">{t.count}</span>
                  </FilterTab>
                ))}
              </nav>
            )}
            {rest.length > 0 ? (
              <ol className="mt-5 flex flex-col gap-3.5">
                {rest.map((launch, index) => (
                  <LaunchCard
                    key={launch.id}
                    launch={launch}
                    rank={index + (filtered ? 1 : 4)}
                    topicHref={(slug) => hrefFor({ ...current, topic: slug })}
                  />
                ))}
              </ol>
            ) : (
              <div className="mt-5 rounded-[18px] border-2 border-dashed border-line px-6 py-10 text-center">
                <p className="text-lg">
                  {total === 0
                    ? `Nothing launched ${scope}.`
                    : filtered
                      ? `No launches ${scope} match these filters.`
                      : `That's everything: all of these launches are in the top 3 above.`}
                </p>
              </div>
            )}
          </section>

          {pastDays.length > 0 && (
            <aside>
              <Panel id="days-heading" title="Browse by day">
                <ul className="flex flex-col">
                  {pastDays.map((d) => {
                    const names = formatLaunchDay(d);
                    const count = dayCounts.get(toDayParam(d)) ?? 0;
                    const active = day && toDayParam(d) === toDayParam(day);
                    return (
                      <li key={toDayParam(d)}>
                        <Link
                          href={hrefFor({ day: d })}
                          aria-current={active ? "page" : undefined}
                          className={`-mx-2 flex items-center justify-between rounded-lg px-2 py-2 transition-colors ${
                            active ? "bg-signal-wash font-bold" : "hover:bg-signal-wash"
                          }`}
                        >
                          <span>
                            {names.weekday}, {names.day}
                          </span>
                          <span className="text-sm text-mist tabular-nums">
                            {count} {count === 1 ? "launch" : "launches"}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </Panel>
            </aside>
          )}
        </div>
      </div>
    </>
  );
}
