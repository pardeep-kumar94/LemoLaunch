import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { LaunchCard } from "@/components/launch-card";
import { PageBand, SubmitCallout } from "@/components/sections";
import { db } from "@/lib/db";
import { startOfUtcDay } from "@/lib/dates";
import { getTopicDirectory, searchLaunches } from "@/lib/launches";
import { readVisitorId } from "@/lib/visitor";

const SLUG_PATTERN = /^[a-z0-9-]{1,40}$/;

export async function generateMetadata({
  params,
}: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const topic = SLUG_PATTERN.test(slug)
    ? await db.topic.findUnique({ where: { slug }, select: { name: true } })
    : null;
  return { title: topic ? `${topic.name} launches | LaunchPad` : "Category not found | LaunchPad" };
}

export default function CategoryPage({ params }: PageProps<"/categories/[slug]">) {
  return (
    <main>
      <Suspense fallback={<PageBand title="Loading category" />}>
        <Category params={params} />
      </Suspense>
      <SubmitCallout />
    </main>
  );
}

async function Category({ params }: { params: PageProps<"/categories/[slug]">["params"] }) {
  const { slug } = await params;
  if (!SLUG_PATTERN.test(slug)) notFound();
  const topic = await db.topic.findUnique({ where: { slug }, select: { slug: true, name: true } });
  if (!topic) notFound();

  const visitorId = await readVisitorId();
  await connection();
  const today = startOfUtcDay(new Date());
  const [launches, directory] = await Promise.all([
    searchLaunches({ topicSlug: slug }, today, visitorId),
    getTopicDirectory(today),
  ]);

  return (
    <>
      <PageBand
        title={topic.name}
        description={`${launches.length} ${launches.length === 1 ? "launch" : "launches"}, ranked by upvotes across every launch day.`}
      >
        <nav aria-label="Other categories" className="mt-8 flex flex-wrap gap-2">
          {directory.map((t) => (
            <Link
              key={t.slug}
              href={`/categories/${t.slug}`}
              aria-current={t.slug === slug ? "page" : undefined}
              className={`rounded-full border-2 px-3.5 py-1 text-sm font-medium transition-colors ${
                t.slug === slug
                  ? "border-on-signal bg-on-signal text-signal"
                  : "border-on-signal/30 hover:bg-on-signal/10"
              }`}
            >
              {t.name}
            </Link>
          ))}
        </nav>
      </PageBand>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-8">
        {launches.length > 0 ? (
          <ol className="flex flex-col gap-3.5">
            {launches.map((launch, index) => (
              <LaunchCard key={launch.id} launch={launch} rank={index + 1} />
            ))}
          </ol>
        ) : (
          <p className="text-lg text-mist">Nothing has launched in {topic.name} yet.</p>
        )}
      </div>
    </>
  );
}
