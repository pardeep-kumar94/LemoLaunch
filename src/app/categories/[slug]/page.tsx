import type { Metadata } from "next";
import { absoluteUrl, jsonLd, pageMetadata } from "@/lib/seo";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { LaunchCard, LaunchList } from "@/components/launch-card";
import { PageBand, Segmented, SubmitCallout } from "@/components/sections";
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
  if (!topic) return { title: "Category not found", robots: { index: false } };
  return pageMetadata({
    title: `Best new ${topic.name} tools, apps and startups`,
    description: `Discover the newest ${topic.name} products launched by indie makers on LemoLaunch, ranked daily by community upvotes. Find ${topic.name.toLowerCase()} tools and alternatives worth trying.`,
    path: `/categories/${slug}`,
  });
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd([
            {
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              name: `Best new ${topic.name} launches`,
              url: absoluteUrl(`/categories/${slug}`),
              mainEntity: {
                "@type": "ItemList",
                itemListOrder: "https://schema.org/ItemListOrderDescending",
                numberOfItems: launches.length,
                itemListElement: launches.slice(0, 50).map((l, i) => ({
                  "@type": "ListItem",
                  position: i + 1,
                  url: absoluteUrl(`/products/${l.slug}`),
                  name: l.name,
                })),
              },
            },
            {
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "LemoLaunch", item: absoluteUrl("/") },
                { "@type": "ListItem", position: 2, name: "Categories", item: absoluteUrl("/categories") },
                { "@type": "ListItem", position: 3, name: topic.name, item: absoluteUrl(`/categories/${slug}`) },
              ],
            },
          ]),
        }}
      />
      <PageBand
        title={`Best new ${topic.name} launches`}
        description={`${launches.length} ${launches.length === 1 ? "launch" : "launches"}, ranked by upvotes across every launch day.`}
      >
        <Segmented
          label="Other categories"
          className="mt-7"
          options={directory.map((t) => ({
            href: `/categories/${t.slug}`,
            active: t.slug === slug,
            label: (
              <>
                {t.name} <span className="num text-[12px] opacity-60">{t.count}</span>
              </>
            ),
          }))}
        />
      </PageBand>
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-8">
        {launches.length > 0 ? (
          <LaunchList className="max-w-4xl">
            {launches.map((launch, index) => (
              <LaunchCard key={launch.id} launch={launch} rank={index + 1} />
            ))}
          </LaunchList>
        ) : (
          <div className="max-w-4xl rounded-2xl border border-dashed border-input px-6 py-12 text-center">
            <p className="text-lg">Nothing has launched in {topic.name} yet.</p>
            <p className="mt-1 text-muted-foreground">Launching something like this? It could be the first.</p>
          </div>
        )}
      </div>
    </>
  );
}
