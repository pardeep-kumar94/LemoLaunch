import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { Search as SearchIcon } from "lucide-react";
import { LaunchCard, LaunchList } from "@/components/launch-card";
import { CategoryGrid, PageBand } from "@/components/sections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { startOfUtcDay } from "@/lib/dates";
import { getTopicDirectory, searchLaunches } from "@/lib/launches";
import { readVisitorId } from "@/lib/visitor";
import { TrackView } from "@/components/analytics/track-view";

export const metadata: Metadata = pageMetadata({
  title: "Search launches",
  description: "Search every startup, app and tool launched on LemoLaunch, and the makers behind them.",
  path: "/search",
  noindex: true,
});

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <main>
      <Suspense fallback={<PageBand title="Search launches" />}>
        <Search searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Search({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 80) : "";

  const visitorId = await readVisitorId();
  await connection();
  const today = startOfUtcDay(new Date());
  const [results, directory] = await Promise.all([
    query ? searchLaunches({ query }, today, visitorId) : Promise.resolve([]),
    getTopicDirectory(today),
  ]);

  return (
    <>
      {query && <TrackView event="search_performed" properties={{ query, results: results.length }} />}
      <PageBand title="Search launches" description="Every product launched on LemoLaunch, and the makers behind them.">
        <form action="/search" role="search" className="mt-7 flex max-w-2xl gap-2">
          <label className="relative flex-1">
            <span className="sr-only">Search by name, description or maker</span>
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              name="q"
              type="search"
              defaultValue={query}
              autoFocus={!query}
              placeholder="Try “postgres”, “travel” or a maker’s name"
              className="h-12 rounded-xl bg-card pl-11 text-base md:text-base"
            />
          </label>
          <Button type="submit" size="lg" className="h-12">
            Search
          </Button>
        </form>
      </PageBand>

      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-8">
        {!query ? (
          <section aria-labelledby="browse-heading">
            <h2 id="browse-heading" className="font-display text-[22px] font-bold">
              Or browse a category
            </h2>
            <div className="mt-4">
              <CategoryGrid topics={directory} />
            </div>
          </section>
        ) : results.length > 0 ? (
          <section aria-labelledby="results-heading" className="max-w-4xl">
            <h2 id="results-heading" className="font-display text-[22px] font-bold">
              {results.length} {results.length === 1 ? "launch matches" : "launches match"} “{query}”
            </h2>
            <LaunchList className="mt-4">
              {results.map((launch) => (
                <LaunchCard key={launch.id} launch={launch} />
              ))}
            </LaunchList>
          </section>
        ) : (
          <div className="max-w-4xl rounded-2xl border border-dashed border-input px-6 py-12 text-center">
            <p className="text-lg">No launches match “{query}”.</p>
            <p className="mt-1 text-muted-foreground">Check the spelling, or try a shorter word.</p>
            <Button asChild variant="outline" className="mt-5">
              <Link href="/categories">Browse categories instead</Link>
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
