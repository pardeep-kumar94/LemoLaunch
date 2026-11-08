import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { LeaderboardList } from "@/components/browse/leaderboard-list";
import { FilterTab, PageBand, PlatformFilter, Segmented, SubmitCallout } from "@/components/sections";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { addUtcDays, startOfUtcDay } from "@/lib/dates";
import { countLaunchesInRange, countPlatformsInRange, getRankedLaunches, getTopicsInRange } from "@/lib/launches";
import { isPlatform, platformLabels } from "@/lib/platforms";
import { pageMetadata } from "@/lib/seo";
import { readVisitorId } from "@/lib/visitor";

export const metadata: Metadata = pageMetadata({
  title: "Leaderboard: top product launches this week and month",
  description:
    "The most-upvoted startups, SaaS and apps launched on LemoLaunch in the last 7, 14 and 30 days, ranked by the community.",
  path: "/leaderboard",
});

const WINDOWS = [7, 14, 30] as const;
type Window = (typeof WINDOWS)[number];

/** Rows shown per leaderboard. */
const LEADERBOARD_SIZE = 50;

export default function LeaderboardPage({ searchParams }: PageProps<"/leaderboard">) {
  return (
    <main>
      <Suspense fallback={<PageBand title="Leaderboard" />}>
        <Leaderboard searchParams={searchParams} />
      </Suspense>
      <SubmitCallout />
    </main>
  );
}

async function Leaderboard({ searchParams }: { searchParams: PageProps<"/leaderboard">["searchParams"] }) {
  const params = await searchParams;
  const visitorId = await readVisitorId();
  await connection();
  const today = startOfUtcDay(new Date());

  const days: Window = WINDOWS.find((w) => String(w) === params.days) ?? 7;
  const topic =
    typeof params.topic === "string" && /^[a-z0-9-]{1,40}$/.test(params.topic) ? params.topic : undefined;
  const platform = isPlatform(params.platform) ? params.platform : undefined;
  // Launches from the last `days` days, today included.
  const from = addUtcDays(today, -(days - 1));

  const [ranked, topics, platformCounts, total] = await Promise.all([
    getRankedLaunches({ from, to: today, visitorId, topicSlug: topic, platform, limit: LEADERBOARD_SIZE }),
    getTopicsInRange(from, today),
    countPlatformsInRange(from, today),
    countLaunchesInRange(from, today),
  ]);
  // Launch day and main category for each row.
  const details = new Map(
    (
      await db.product.findMany({
        where: { id: { in: ranked.map((l) => l.id) } },
        select: { id: true, launchDate: true, primaryTopicSlug: true },
      })
    ).map((row) => [row.id, row]),
  );
  const entries = ranked.map((launch) => {
    const row = details.get(launch.id);
    const primary = launch.topics.find((t) => t.slug === row?.primaryTopicSlug) ?? launch.topics[0];
    return { ...launch, launchDate: row?.launchDate ?? today, category: primary?.name ?? null };
  });
  const activeTopic = topics.find((t) => t.slug === topic);

  const hrefFor = (next: { days?: Window; topic?: string; platform?: string }) => {
    const query = new URLSearchParams();
    if (next.days && next.days !== 7) query.set("days", String(next.days));
    if (next.topic) query.set("topic", next.topic);
    if (next.platform) query.set("platform", next.platform);
    const qs = query.toString();
    return qs ? `/leaderboard?${qs}` : "/leaderboard";
  };

  return (
    <>
      <PageBand
        title="Leaderboard"
        description={`The most-upvoted launches of the last ${days} days. Every launch counts from the day it goes live.`}
      >
        <Segmented
          label="Leaderboard period"
          className="mt-7 h-10 [&>a]:px-4 [&>a]:text-sm"
          options={WINDOWS.map((w) => ({ href: hrefFor({ days: w, topic, platform }), label: `${w} days`, active: w === days }))}
        />
      </PageBand>

      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-8">
        <h2 className="sr-only">
          Top {activeTopic ? `${activeTopic.name} launches` : "launches"}
          {platform ? ` on ${platformLabels[platform].short}` : ""}, last {days} days
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <PlatformFilter
            active={platform}
            counts={platformCounts}
            total={total}
            hrefFor={(p) => hrefFor({ days, topic, platform: p })}
          />
          <p className="num ml-auto text-[13px] text-muted-foreground">
            {total} {total === 1 ? "launch" : "launches"} in the last {days} days
          </p>
        </div>
        {topics.length > 1 && (
          <nav
            aria-label="Filter by category"
            className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
          >
            <FilterTab href={hrefFor({ days, platform })} active={!activeTopic}>
              All categories
            </FilterTab>
            {topics.map((t) => (
              <FilterTab
                key={t.slug}
                href={hrefFor({ days, platform, topic: t.slug === activeTopic?.slug ? undefined : t.slug })}
                active={t.slug === activeTopic?.slug}
              >
                {t.name} <span className="num text-[12px] opacity-60">{t.count}</span>
              </FilterTab>
            ))}
          </nav>
        )}

        <div className="mt-5">
          {entries.length > 0 ? (
            <LeaderboardList entries={entries} today={today} />
          ) : (
            <div className="rounded-2xl border border-dashed border-input px-6 py-12 text-center">
              <p className="text-lg">
                {total === 0 ? `Nothing launched in the last ${days} days.` : "No launches match these filters."}
              </p>
              {total > 0 && (
                <Button asChild variant="link" className="mt-1">
                  <Link href={hrefFor({ days })}>Clear filters</Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
