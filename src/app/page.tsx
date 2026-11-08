import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, ChevronDown, ChevronRight } from "lucide-react";
import { Countdown } from "@/components/countdown";
import { DigestForm } from "@/components/digest-form";
import { LaunchCard, LaunchList } from "@/components/launch-card";
import { LogoTile } from "@/components/logo-tile";
import { SeatGrid } from "@/components/seats";
import { FilterTab, MiniList, Panel, PlatformFilter, TopicChips } from "@/components/sections";
import { Button } from "@/components/ui/button";
import { addUtcDays, formatLaunchDay, startOfUtcDay, toDayParam } from "@/lib/dates";
import {
  countLaunchesInRange,
  countPlatformsInRange,
  getEditionNumber,
  getPreviousLaunchDays,
  getRankedLaunches,
  getTopicDirectory,
  getTopicsInRange,
} from "@/lib/launches";
import { isPlatform, platformLabels } from "@/lib/platforms";
import { DAILY_LAUNCH_LIMIT, launchQueue } from "@/lib/publish";
import { absoluteUrl, DEFAULT_DESCRIPTION, jsonLd, SITE_NAME } from "@/lib/seo";
import { readVisitorId } from "@/lib/visitor";

const siteJsonLd = jsonLd([
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/icon.png"),
    description: DEFAULT_DESCRIPTION,
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${absoluteUrl("/search")}?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  },
]);

/** Launches shown for today before "Show all". */
const TODAY_PREVIEW = 20;

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: siteJsonLd }} />
      <Suspense fallback={<HomeSkeleton />}>
        <HomeContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function HomeContent({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const params = await searchParams;
  const topic =
    typeof params.topic === "string" && /^[a-z0-9-]{1,40}$/.test(params.topic) ? params.topic : undefined;
  const platform = isPlatform(params.platform) ? params.platform : undefined;
  const showAll = params.all === "1";

  const visitorId = await readVisitorId();
  // "Today" depends on when the request arrives.
  await connection();
  const today = startOfUtcDay(new Date());

  const [ranked, topics, todayCount, platformCounts, weekLeaders, directory, edition, queue, pastDays] =
    await Promise.all([
      getRankedLaunches({ from: today, to: today, visitorId, topicSlug: topic, platform }),
      getTopicsInRange(today, today),
      countLaunchesInRange(today, today),
      countPlatformsInRange(today, today),
      getRankedLaunches({ from: addUtcDays(today, -6), to: today, visitorId: null, limit: 5 }),
      getTopicDirectory(today),
      getEditionNumber(today),
      launchQueue(today),
      getPreviousLaunchDays(today, 3),
    ]);
  const [yesterday, ...olderDays] = pastDays;
  const [yesterdayTop, ...olderTops] = await Promise.all([
    yesterday ? getRankedLaunches({ from: yesterday.day, to: yesterday.day, visitorId, limit: 5 }) : [],
    ...olderDays.map((d) => getRankedLaunches({ from: d.day, to: d.day, visitorId: null, limit: 5 })),
  ]);

  const activeTopic = topics.find((t) => t.slug === topic);
  const filtered = Boolean(activeTopic || platform);
  const homeHref = (next: { topic?: string; platform?: string; all?: boolean }) => {
    const query = new URLSearchParams();
    if (next.topic) query.set("topic", next.topic);
    if (next.platform) query.set("platform", next.platform);
    if (next.all) query.set("all", "1");
    const qs = query.toString();
    return qs ? `/?${qs}#today` : "/#today";
  };
  const topicHref = (slug?: string) => homeHref({ topic: slug, platform });
  const visible = filtered || showAll ? ranked : ranked.slice(0, TODAY_PREVIEW);
  const seatsTaken = Math.min(todayCount, DAILY_LAUNCH_LIMIT);
  const { weekday, day } = formatLaunchDay(today);
  const nextSeat = formatLaunchDay(queue.day);
  const archiveHref = (d: Date) => `/archive?day=${toDayParam(d)}`;
  const categoryList = topics.length > 0 ? topics : directory.slice(0, 7);

  return (
    <>
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-16 lg:py-12">
          <div>
            <p className="flex items-center gap-3 text-[13px]">
              <span className="inline-flex items-center gap-1.5 font-medium text-leaf">
                <span aria-hidden className="live-dot size-[7px] rounded-full bg-leaf" />
                Live now
              </span>
              <span className="num text-muted-foreground">Edition {edition}</span>
            </p>
            <h1 className="mt-3 font-display text-[clamp(3.25rem,8vw,5.25rem)] leading-[0.95] font-bold">
              {weekday},
              <br />
              {day}
            </h1>
            <p className="mt-5 max-w-[52ch] text-lg text-muted-foreground">
              {todayCount > 0 ? (
                <>
                  <span className="font-medium text-foreground">
                    {todayCount} of today&apos;s {DAILY_LAUNCH_LIMIT} launches are live.
                  </span>{" "}
                  Upvote the ones you&apos;d actually use; the community decides the order, and nobody
                  can pay to climb it.
                </>
              ) : (
                <>
                  <span className="font-medium text-foreground">Today&apos;s edition is still empty.</span> New
                  launches go live at 00:00 UTC; meanwhile, yesterday&apos;s are below.
                </>
              )}
            </p>
            {categoryList.length > 0 && (
              <nav aria-label="Jump to a category" className="mt-6 flex flex-wrap gap-2">
                {categoryList.slice(0, 6).map((t) => (
                  <FilterTab key={t.slug} href={topicHref(t.slug === activeTopic?.slug ? undefined : t.slug)} active={t.slug === activeTopic?.slug}>
                    {t.name} <span className="num text-[12px] opacity-60">{t.count}</span>
                  </FilterTab>
                ))}
                <Button asChild variant="ghost" size="sm">
                  <Link href="/categories">
                    All categories
                    <ChevronRight data-icon="inline-end" />
                  </Link>
                </Button>
              </nav>
            )}
          </div>

          <div className="rounded-2xl bg-card p-5 shadow-paper ring-1 ring-border sm:p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-semibold">Today&apos;s {DAILY_LAUNCH_LIMIT} seats</h2>
              <p className="num text-[13px] text-muted-foreground">
                <span className="font-semibold text-foreground">{seatsTaken}</span> / {DAILY_LAUNCH_LIMIT} taken
              </p>
            </div>
            <SeatGrid
              total={DAILY_LAUNCH_LIMIT}
              filled={seatsTaken}
              animate
              className="mt-4 grid-cols-20 gap-[3px] sm:gap-1 lg:grid-cols-10"
            />
            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-[3px] bg-lemon-soft shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--lemon-deep)_45%,var(--card))]" />
                Launched
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-[3px] shadow-[inset_0_0_0_1px_var(--input)]" />
                Open
              </span>
            </div>
            <div className="my-5 border-t border-dashed border-input" />
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[13px] text-muted-foreground">Next edition in</p>
                <Countdown className="text-[30px] leading-tight font-medium tracking-[-0.02em]" />
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/submit">
                  Take a seat
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Free seats open from {nextSeat.weekday}, {nextSeat.day}.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-10 px-4 pt-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <section id="today" aria-labelledby="today-heading" className="scroll-mt-24">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
              <h2 id="today-heading" className="font-display text-[26px] font-bold">
                {activeTopic ? `${activeTopic.name} today` : "Today"}
                {platform && <span className="text-muted-foreground"> on {platformLabels[platform].short}</span>}
              </h2>
              <span className="text-muted-foreground">Ranked by upvotes, updated live</span>
              <div className="w-full sm:ml-auto sm:w-auto">
                <PlatformFilter
                  active={platform}
                  counts={platformCounts}
                  total={todayCount}
                  hrefFor={(p) => homeHref({ topic, platform: p })}
                />
              </div>
            </div>

            {visible.length > 0 ? (
              <LaunchList className="mt-4">
                {visible.map((launch, index) => (
                  <LaunchCard key={launch.id} launch={launch} rank={index + 1} topicHref={(slug) => topicHref(slug)} />
                ))}
                {visible.length < ranked.length && (
                  <li className="flex justify-center px-4 py-3.5">
                    <Button asChild variant="outline">
                      <Link href={homeHref({ topic, platform, all: true })} scroll={false}>
                        Show all {todayCount} launches
                        <ChevronDown data-icon="inline-end" />
                      </Link>
                    </Button>
                  </li>
                )}
              </LaunchList>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-input px-6 py-12 text-center">
                <p className="text-lg">
                  {todayCount === 0
                    ? "Nothing has launched yet today. The next edition goes live at 00:00 UTC."
                    : "No launches today match these filters."}
                </p>
                {filtered && (
                  <Button asChild variant="link" className="mt-1">
                    <Link href="/#today">Clear filters</Link>
                  </Button>
                )}
              </div>
            )}
          </section>

          {yesterday && yesterdayTop.length > 0 && !filtered && (
            <section aria-labelledby="yesterday-heading" className="mt-12">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 id="yesterday-heading" className="font-display text-[26px] font-bold">
                  {isYesterday(yesterday.day, today) ? "Yesterday" : formatLaunchDay(yesterday.day).weekday}
                </h2>
                <span className="text-muted-foreground">
                  {formatLaunchDay(yesterday.day).weekday}, {formatLaunchDay(yesterday.day).day} · {yesterday.count}{" "}
                  {yesterday.count === 1 ? "launch" : "launches"} · final ranking
                </span>
                <Button asChild variant="ghost" size="sm" className="ml-auto">
                  <Link href={archiveHref(yesterday.day)}>
                    See all {yesterday.count}
                    <ChevronRight data-icon="inline-end" />
                  </Link>
                </Button>
              </div>
              <LaunchList className="mt-4">
                {yesterdayTop.map((launch, index) => (
                  <LaunchCard key={launch.id} launch={launch} rank={index + 1} />
                ))}
              </LaunchList>
            </section>
          )}

          {olderDays.length > 0 && !filtered && (
            <ul className="mt-6 grid gap-2.5">
              {olderDays.map((d, i) => {
                const names = formatLaunchDay(d.day);
                return (
                  <li key={toDayParam(d.day)}>
                    <Link
                      href={archiveHref(d.day)}
                      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-card px-5 py-3.5 shadow-paper ring-1 ring-border transition-shadow hover:shadow-lift"
                    >
                      <span className="w-28 font-display text-lg font-bold">{names.weekday}</span>
                      <span className="w-28 text-muted-foreground">{names.day}</span>
                      <span className="flex -space-x-2" aria-hidden>
                        {olderTops[i]?.map((l) => (
                          <span key={l.id} className="rounded-[9px] ring-2 ring-card">
                            <LogoTile name={l.name} accent={l.accent} src={l.logoUrl} size="xs" />
                          </span>
                        ))}
                      </span>
                      <span className="num text-[13px] text-muted-foreground">
                        {d.count} {d.count === 1 ? "launch" : "launches"}
                      </span>
                      <span className="ml-auto inline-flex items-center gap-1 text-[13px] font-medium">
                        Open edition <ChevronRight className="size-3.5" aria-hidden />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <aside className="flex flex-col gap-5">
          {weekLeaders.length > 0 && (
            <Panel id="leaders-heading" title="This week's leaders">
              <MiniList ranked showVotes launches={weekLeaders.map((l) => ({ ...l, subtitle: l.tagline }))} />
              <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                <Link href="/leaderboard">Full leaderboard</Link>
              </Button>
            </Panel>
          )}
          {categoryList.length > 0 && (
            <Panel id="categories-heading" title="Categories" link={{ href: "/categories", label: "View all" }}>
              <TopicChips topics={categoryList.slice(0, 8)} />
            </Panel>
          )}
          <section
            id="digest"
            aria-labelledby="digest-heading"
            className="scroll-mt-24 rounded-2xl bg-accent p-5 ring-1 ring-[color-mix(in_oklab,var(--lemon-deep)_40%,var(--border))]"
          >
            <h2 id="digest-heading" className="font-display text-[19px] font-bold">
              The morning paper
            </h2>
            <p className="mt-1 text-sm text-accent-foreground">Yesterday&apos;s best launches in your inbox each morning.</p>
            <DigestForm />
          </section>
        </aside>
      </div>
    </>
  );
}

function isYesterday(day: Date, today: Date) {
  return day.getTime() === addUtcDays(today, -1).getTime();
}

function HomeSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading launches">
      <div className="border-b border-border">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 motion-safe:animate-pulse sm:px-8 lg:grid-cols-[1fr_340px]">
          <div>
            <div className="h-4 w-40 rounded bg-muted" />
            <div className="mt-4 h-40 w-full max-w-lg rounded-2xl bg-muted" />
            <div className="mt-6 h-8 w-full max-w-md rounded-lg bg-muted" />
          </div>
          <div className="h-[420px] rounded-2xl bg-muted" />
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-10 motion-safe:animate-pulse sm:px-8">
        <div className="h-[520px] rounded-2xl bg-muted lg:mr-[360px]" />
      </div>
    </div>
  );
}
