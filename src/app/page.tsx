import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { MakerAvatar, VerifiedBadge } from "@/components/badges";
import { Countdown } from "@/components/countdown";
import { DigestForm } from "@/components/digest-form";
import { SearchIcon } from "@/components/icons";
import { LaunchCard } from "@/components/launch-card";
import { LogoTile } from "@/components/logo-tile";
import {
  FilterTab,
  MiniList,
  PlatformFilter,
  Panel,
  Podium,
  SectionHeading,
  SubmitCallout,
  TopicChips,
} from "@/components/sections";
import { WeekStrip } from "@/components/week-strip";
import { addUtcDays, formatLaunchDay, isSameUtcDay, startOfUtcDay, toDayParam } from "@/lib/dates";
import {
  countLaunchesInRange,
  countPlatformsInRange,
  countVotesSince,
  getFeaturedLaunches,
  getLaunchCountsByDay,
  getLaunchOfTheWeek,
  getPreviousDayTop,
  getRankedLaunches,
  getTopicDirectory,
  getTopicsInRange,
  getUpcomingLaunches,
} from "@/lib/launches";
import { isPlatform, platformLabels } from "@/lib/platforms";
import { readVisitorId } from "@/lib/visitor";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main>
      <Suspense fallback={<HomeSkeleton />}>
        <HomeContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function HomeContent({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const params = await searchParams;
  const topic =
    typeof params.topic === "string" && /^[a-z0-9-]{1,40}$/.test(params.topic)
      ? params.topic
      : undefined;
  const platform = isPlatform(params.platform) ? params.platform : undefined;

  const visitorId = await readVisitorId();
  // "Today" depends on when the request arrives.
  await connection();
  const today = startOfUtcDay(new Date());

  const [ranked, topics, todayCount, upcoming, weekCounts, launchOfTheWeek, directory, votesToday, catalogSize, previous, platformCounts] =
    await Promise.all([
      getRankedLaunches({ from: today, to: today, visitorId, topicSlug: topic, platform }),
      getTopicsInRange(today, today),
      countLaunchesInRange(today, today),
      getUpcomingLaunches(today),
      getLaunchCountsByDay(addUtcDays(today, -6), today),
      getLaunchOfTheWeek(today),
      getTopicDirectory(today),
      countVotesSince(today),
      countLaunchesInRange(new Date(0), today),
      getPreviousDayTop(today),
      countPlatformsInRange(today, today),
    ]);
  const featured = await getFeaturedLaunches(today);

  const activeTopic = topics.find((t) => t.slug === topic);
  const homeHref = (next: { topic?: string; platform?: string }) => {
    const query = new URLSearchParams();
    if (next.topic) query.set("topic", next.topic);
    if (next.platform) query.set("platform", next.platform);
    const qs = query.toString();
    return qs ? `/?${qs}#feed` : "/";
  };
  const topicHref = (slug?: string) => homeHref({ topic: slug, platform });
  const filtered = Boolean(activeTopic || platform);
  // Past days live in the archive; today is always the homepage.
  const dayHref = (day: Date) => (isSameUtcDay(day, today) ? "/" : `/archive?day=${toDayParam(day)}`);

  const podium = filtered ? [] : ranked.slice(0, 3);
  const feed = filtered ? ranked : ranked.slice(3);
  const feedOffset = filtered ? 1 : 4;
  const feedTitle = `${activeTopic ? `${activeTopic.name} launches` : "All launches"}${
    platform ? ` on ${platformLabels[platform].short}` : ""
  } today`;

  return (
    <>
      <section className="band">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-6 pb-14 sm:px-8 lg:grid-cols-[1.35fr_1fr] lg:gap-12 lg:pt-8 lg:pb-16">
          <div>
            <p className="lift-off inline-flex items-center gap-2 rounded-full border-2 border-on-signal bg-white px-3.5 py-1 text-sm font-semibold">
              <span className="size-2.5 rounded-full bg-pop shadow-[0_0_0_4px_color-mix(in_oklab,var(--pop)_25%,white)]" />
              {todayCount > 0
                ? `${todayCount} ${todayCount === 1 ? "product" : "products"} launched today`
                : "New launches every day at 00:00 UTC"}
            </p>
            <h1
              className="lift-off lift-off-late mt-5 font-display text-[clamp(2.75rem,6.5vw,4.75rem)] leading-[0.92] font-extrabold tracking-[-0.02em]"
            >
              The best new products,{" "}
              <span className="box-decoration-clone [box-shadow:inset_0_-0.28em_0_var(--pop)]">
                every single day.
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-lg opacity-80 sm:text-[19px]">
              Discover what makers shipped today, upvote what you&apos;d actually use, and catch
              tomorrow&apos;s launches before anyone else.
            </p>
            <form
              action="/search"
              role="search"
              className="mt-7 flex max-w-xl gap-2 rounded-2xl border-2 border-on-signal bg-white p-1.5 shadow-[6px_6px_0_0_var(--on-signal)]"
            >
              <label className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5">
                <SearchIcon className="size-5 shrink-0 opacity-50" />
                <span className="sr-only">Search launches</span>
                <input
                  name="q"
                  type="search"
                  placeholder={`Search ${catalogSize} launches and makers`}
                  className="w-full bg-transparent text-[17px] text-on-signal placeholder:text-on-signal/50 focus:outline-none"
                />
              </label>
              <button
                type="submit"
                className="press h-11 shrink-0 rounded-xl border-2 border-on-signal bg-on-signal px-5 font-bold text-signal shadow-[3px_3px_0_0_var(--pop)]"
              >
                Search
              </button>
            </form>
            {votesToday > 0 && (
              <p className="mt-6 flex items-center gap-3 text-[15px] font-semibold">
                <span className="flex -space-x-2" aria-hidden="true">
                  {ranked.slice(0, 5).map((launch) => (
                    <span key={launch.id} className="rounded-full ring-2 ring-signal [&>span]:size-8 [&>span]:text-xs">
                      <MakerAvatar name={launch.maker} />
                    </span>
                  ))}
                </span>
                {votesToday.toLocaleString("en-US")} upvotes cast today
              </p>
            )}
          </div>

          <div className="lift-off lift-off-late rounded-[22px] border-2 border-on-signal bg-paper p-5 text-ink shadow-[8px_8px_0_0_var(--pop)] sm:p-6">
            <p className="mb-2.5 text-sm font-bold text-mist">Next launches go live in</p>
            <Countdown />
            <p className="mt-5 mb-2 text-sm font-bold text-mist">This week</p>
            <WeekStrip
              today={today}
              selected={today}
              counts={weekCounts}
              hrefForDay={dayHref}
            />
          </div>
        </div>
        <div className="hazard" />
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        {podium.length > 0 && (
          <section aria-labelledby="podium-heading" className="mt-14">
            <SectionHeading
              id="podium-heading"
              title="Today's top 3"
              description="Ranked by upvotes, updated live."
              link={{ href: "/archive?range=month", label: "Monthly leaderboard" }}
            />
            <div className="mt-9">
              <Podium launches={podium} />
            </div>
          </section>
        )}

        <div className="mt-16 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_330px]">
          <section id="feed" aria-labelledby="feed-heading" className="scroll-mt-6">
            <SectionHeading
              id="feed-heading"
              title={feedTitle}
              link={{ href: "/archive", label: "Browse the archive" }}
            />
            <div className="mt-4">
              <PlatformFilter
                active={platform}
                counts={platformCounts}
                total={todayCount}
                hrefFor={(p) => homeHref({ topic, platform: p })}
              />
            </div>
            {topics.length > 1 && (
              <nav
                aria-label="Filter by category"
                className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
              >
                <FilterTab href={topicHref()} active={!activeTopic}>
                  All <span className="font-normal opacity-70">{todayCount}</span>
                </FilterTab>
                {topics.map((t) => (
                  <FilterTab
                    key={t.slug}
                    href={topicHref(t.slug === activeTopic?.slug ? undefined : t.slug)}
                    active={t.slug === activeTopic?.slug}
                  >
                    {t.name} <span className="font-normal opacity-70">{t.count}</span>
                  </FilterTab>
                ))}
              </nav>
            )}

            {feed.length > 0 ? (
              <ol className="mt-5 flex flex-col gap-3.5">
                {feed.map((launch, index) => (
                  <LaunchCard
                    key={launch.id}
                    launch={launch}
                    rank={index + feedOffset}
                    topicHref={(slug) => topicHref(slug)}
                  />
                ))}
              </ol>
            ) : (
              <div className="mt-5 rounded-[18px] border-2 border-dashed border-line px-6 py-10 text-center">
                <p className="text-lg">
                  {todayCount === 0
                    ? "Nothing has launched yet today. New launches go live at 00:00 UTC."
                    : filtered
                      ? "No launches today match these filters."
                      : "That's everything: all of today's launches are in the top 3 above."}
                </p>
                {todayCount === 0 && (
                  <Link
                    href="/archive"
                    className="mt-2 inline-block font-semibold underline decoration-pop decoration-[3px] underline-offset-4"
                  >
                    See yesterday&apos;s launches
                  </Link>
                )}
              </div>
            )}
          </section>

          <aside className="flex flex-col gap-6">
            {launchOfTheWeek && <LaunchOfTheWeek launch={launchOfTheWeek} />}
            {featured.length > 0 && (
              <Panel id="featured-heading" title="Featured launches" link={{ href: "/pricing", label: "What's this?" }}>
                <p className="-mt-2 mb-1 text-[13px] text-mist">Paid placement. Never affects rankings.</p>
                <MiniList launches={featured.map((l) => ({ ...l, subtitle: l.tagline }))} />
              </Panel>
            )}
            {upcoming.length > 0 && (
              <div id="upcoming" className="scroll-mt-6">
                <Panel id="upcoming-heading" title="Coming up">
                  <p className="-mt-2 mb-1 text-[13px] text-mist">Voting opens when they go live.</p>
                  <MiniList launches={upcoming.map((l) => ({ ...l, subtitle: l.tagline }))} />
                </Panel>
              </div>
            )}
            {previous && (
              <Panel
                id="winners-heading"
                title={`${formatLaunchDay(previous.day).weekday}'s winners`}
                link={{ href: dayHref(previous.day), label: "View day" }}
              >
                <MiniList
                  showVotes
                  launches={previous.launches.map((l) => ({ ...l, subtitle: l.topics[0]?.name ?? l.tagline }))}
                />
              </Panel>
            )}
            {directory.length > 0 && (
              <Panel id="popular-heading" title="Popular categories" link={{ href: "/categories", label: "View all" }}>
                <TopicChips topics={directory.slice(0, 8)} />
              </Panel>
            )}
            <section
              id="digest"
              aria-labelledby="digest-heading"
              className="scroll-mt-6 rounded-[20px] border-2 border-on-signal bg-signal p-5 text-on-signal"
            >
              <h2 id="digest-heading" className="font-display text-xl font-extrabold">
                Daily digest
              </h2>
              <p className="mt-1 text-sm opacity-80">The top launches in your inbox each morning.</p>
              <DigestForm />
            </section>
          </aside>
        </div>

      </div>

      <SubmitCallout />
    </>
  );
}

function LaunchOfTheWeek({
  launch,
}: {
  launch: NonNullable<Awaited<ReturnType<typeof getLaunchOfTheWeek>>>;
}) {
  const { weekday } = formatLaunchDay(launch.launchDate);
  return (
    <section
      aria-labelledby="week-heading"
      className="overflow-hidden rounded-[20px] border-2 border-ink bg-paper shadow-[6px_6px_0_0_var(--pop)]"
    >
      <h2 id="week-heading" className="bg-pop px-5 py-2 text-[13px] font-bold text-on-signal">
        Launch of the week
      </h2>
      <div className="p-5">
        <Link href={`/products/${launch.slug}`} className="group flex items-center gap-3.5">
          <LogoTile name={launch.name} accent={launch.accent} src={launch.logoUrl} />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 font-display text-xl leading-tight font-extrabold decoration-pop decoration-[3px] underline-offset-4 group-hover:underline">
              {launch.name}
              {launch.verified && <VerifiedBadge />}
            </span>
            <span className="mt-0.5 block text-sm text-mist">{launch.tagline}</span>
          </span>
        </Link>
        <p className="mt-4 flex items-center justify-between gap-3 text-sm text-mist">
          Launched {weekday}
          <span className="rounded-lg bg-pop px-2.5 py-1 font-bold text-on-signal tabular-nums">
            {launch.voteCount} upvotes
          </span>
        </p>
      </div>
    </section>
  );
}

function HomeSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading launches">
      <div className="band">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-8 pb-16 motion-safe:animate-pulse sm:px-8 lg:grid-cols-[1.35fr_1fr]">
          <div>
            <div className="h-8 w-56 rounded-full bg-on-signal/10" />
            <div className="mt-5 h-40 w-full max-w-xl rounded-2xl bg-on-signal/10" />
            <div className="mt-7 h-14 w-full max-w-xl rounded-2xl bg-on-signal/10" />
          </div>
          <div className="h-64 rounded-[22px] bg-on-signal/10" />
        </div>
        <div className="hazard" />
      </div>
      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-14 motion-safe:animate-pulse sm:px-8 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-56 rounded-[22px] bg-line" />
        ))}
      </div>
    </div>
  );
}
