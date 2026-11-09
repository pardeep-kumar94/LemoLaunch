import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { absoluteUrl } from "@/lib/seo";

// Every public page search engines should index: the main pages, each category and every
// product. Built per request so new launches appear without a redeploy.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const [products, topics] = await Promise.all([
    db.product.findMany({
      select: { slug: true, launchDate: true, createdAt: true },
      orderBy: { launchDate: "desc" },
      take: 45_000,
    }),
    db.topic.findMany({ select: { slug: true } }),
  ]);
  const now = new Date();

  return [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/leaderboard"), lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/archive"), lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: absoluteUrl("/categories"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: absoluteUrl("/submit"), changeFrequency: "monthly", priority: 0.8 },
    ...topics.map((t) => ({
      url: absoluteUrl(`/categories/${t.slug}`),
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...products.map((p) => ({
      url: absoluteUrl(`/products/${p.slug}`),
      lastModified: p.launchDate > p.createdAt ? p.launchDate : p.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
