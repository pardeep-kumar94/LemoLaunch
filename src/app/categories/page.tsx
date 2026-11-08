import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Suspense } from "react";
import { connection } from "next/server";
import { CategoryGrid, PageBand, SubmitCallout } from "@/components/sections";
import { startOfUtcDay } from "@/lib/dates";
import { getTopicDirectory } from "@/lib/launches";

export const metadata: Metadata = pageMetadata({
  title: "Browse startups, apps and tools by category",
  description:
    "Explore new AI tools, developer tools, design, productivity, finance and more, launched daily by indie makers on LemoLaunch.",
  path: "/categories",
});

export default function CategoriesPage() {
  return (
    <main>
      <PageBand
        title="Categories"
        description="Every launch on LemoLaunch, grouped by what it helps you do."
      />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
        <Suspense fallback={<GridSkeleton />}>
          <Directory />
        </Suspense>
      </div>
      <SubmitCallout />
    </main>
  );
}

async function Directory() {
  await connection();
  const topics = await getTopicDirectory(startOfUtcDay(new Date()));
  if (topics.length === 0) {
    return <p className="text-lg text-muted-foreground">No categories have launches yet.</p>;
  }
  return <CategoryGrid topics={topics} />;
}

function GridSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-3 motion-safe:animate-pulse sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-[86px] rounded-2xl bg-muted" />
      ))}
    </div>
  );
}
