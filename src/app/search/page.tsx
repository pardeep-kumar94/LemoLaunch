import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { SearchIcon } from "@/components/icons";
import { LaunchCard } from "@/components/launch-card";
import { PageBand, TopicChips } from "@/components/sections";
import { startOfUtcDay } from "@/lib/dates";
import { getTopicDirectory, searchLaunches } from "@/lib/launches";
import { readVisitorId } from "@/lib/visitor";

export const metadata: Metadata = { title: "Search | LaunchPad" };

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
      <PageBand title="Search launches">
        <form action="/search" role="search" className="mt-8 flex max-w-2xl gap-2">
          <label className="flex h-14 flex-1 items-center gap-3 rounded-2xl border-2 border-on-signal bg-white px-4 shadow-[6px_6px_0_0_var(--on-signal)]">
            <SearchIcon className="size-5 text-on-signal/60" />
            <span className="sr-only">Search by name, description or maker</span>
            <input
              name="q"
              type="search"
              defaultValue={query}
              autoFocus={!query}
              placeholder="Try “postgres”, “travel” or a maker’s name"
              className="w-full bg-transparent text-lg text-on-signal placeholder:text-on-signal/50 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="press h-14 rounded-2xl border-2 border-on-signal bg-on-signal px-6 font-bold text-signal shadow-[4px_4px_0_0_var(--pop)]"
          >
            Search
          </button>
        </form>
      </PageBand>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-8">
        {!query ? (
          <section aria-labelledby="browse-heading">
            <h2 id="browse-heading" className="font-display text-xl font-semibold">
              Or browse a category
            </h2>
            <div className="mt-4">
              <TopicChips topics={directory} />
            </div>
          </section>
        ) : results.length > 0 ? (
          <section aria-labelledby="results-heading">
            <h2 id="results-heading" className="font-display text-xl font-semibold">
              {results.length} {results.length === 1 ? "launch matches" : "launches match"} “{query}”
            </h2>
            <ol className="mt-6 flex flex-col gap-3.5">
              {results.map((launch) => (
                <LaunchCard key={launch.id} launch={launch} />
              ))}
            </ol>
          </section>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-line px-6 py-12 text-center">
            <p className="text-lg">No launches match “{query}”.</p>
            <p className="mt-1 text-mist">Check the spelling, or try a shorter word.</p>
            <Link
              href="/categories"
              className="mt-4 inline-block font-semibold underline decoration-pop decoration-[3px] underline-offset-4"
            >
              Browse categories instead
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
