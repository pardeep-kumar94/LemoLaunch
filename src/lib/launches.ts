import { db } from "@/lib/db";
import { addUtcDays, toDayParam } from "@/lib/dates";

export type LaunchSummary = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  maker: string;
  accent: string;
  logoUrl: string | null;
  verified: boolean;
  featured: boolean;
  platforms: string[];
  topics: { slug: string; name: string }[];
  voteCount: number;
  commentCount: number;
  hasVoted: boolean;
};

const summarySelect = (visitorId: string | null) =>
  ({
    id: true,
    slug: true,
    name: true,
    tagline: true,
    maker: true,
    accent: true,
    logoUrl: true,
    verified: true,
    featured: true,
    platforms: true,
    topics: { select: { slug: true, name: true }, orderBy: { name: "asc" } },
    _count: { select: { votes: true, comments: true } },
    votes: {
      // An empty visitor id never matches, so new visitors see no votes.
      where: { visitorId: visitorId ?? "" },
      select: { id: true },
      take: 1,
    },
  }) as const;

type SummaryRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  maker: string;
  accent: string;
  logoUrl: string | null;
  verified: boolean;
  featured: boolean;
  platforms: string[];
  topics: { slug: string; name: string }[];
  _count: { votes: number; comments: number };
  votes: { id: string }[];
};

function toSummary(row: SummaryRow): LaunchSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    maker: row.maker,
    accent: row.accent,
    logoUrl: row.logoUrl,
    verified: row.verified,
    featured: row.featured,
    platforms: row.platforms,
    topics: row.topics,
    voteCount: row._count.votes,
    commentCount: row._count.comments,
    hasVoted: row.votes.length > 0,
  };
}

/** The most recent launch day on or before `today`, or null if nothing has launched. */
export async function getLatestLaunchDay(today: Date): Promise<Date | null> {
  const latest = await db.product.findFirst({
    where: { launchDate: { lte: today } },
    orderBy: { launchDate: "desc" },
    select: { launchDate: true },
  });
  return latest?.launchDate ?? null;
}

/** Topics with at least one launch between `from` and `to` (inclusive), with how many. */
export async function getTopicsInRange(from: Date, to: Date) {
  const launchDate = { gte: from, lte: to };
  const rows = await db.topic.findMany({
    where: { products: { some: { launchDate } } },
    orderBy: { name: "asc" },
    select: {
      slug: true,
      name: true,
      _count: { select: { products: { where: { launchDate } } } },
    },
  });
  return rows.map((t) => ({ slug: t.slug, name: t.name, count: t._count.products }));
}

/** Launches between `from` and `to` (inclusive), ranked by upvotes. */
export async function getRankedLaunches({
  from,
  to,
  visitorId,
  topicSlug,
  platform,
}: {
  from: Date;
  to: Date;
  visitorId: string | null;
  topicSlug?: string;
  platform?: string;
}) {
  const rows = await db.product.findMany({
    where: {
      launchDate: { gte: from, lte: to },
      ...(topicSlug ? { topics: { some: { slug: topicSlug } } } : {}),
      ...(platform ? { platforms: { has: platform } } : {}),
    },
    orderBy: [{ votes: { _count: "desc" } }, { createdAt: "asc" }],
    take: 50,
    select: summarySelect(visitorId),
  });
  return rows.map(toSummary);
}

export function countLaunchesInRange(from: Date, to: Date): Promise<number> {
  return db.product.count({ where: { launchDate: { gte: from, lte: to } } });
}

/** Upvotes cast since `since`, across every product. */
export function countVotesSince(since: Date): Promise<number> {
  return db.vote.count({ where: { createdAt: { gte: since } } });
}

/** Products scheduled after `today`, soonest first. */
export async function getUpcomingLaunches(today: Date, limit = 4) {
  return db.product.findMany({
    where: { launchDate: { gt: today } },
    orderBy: [{ launchDate: "asc" }, { name: "asc" }],
    take: limit,
    select: { id: true, slug: true, name: true, tagline: true, accent: true, logoUrl: true, launchDate: true },
  });
}

/** The top launches from the launch day before `day`. */
export async function getPreviousDayTop(day: Date, limit = 3) {
  const previous = await db.product.findFirst({
    where: { launchDate: { lt: day } },
    orderBy: { launchDate: "desc" },
    select: { launchDate: true },
  });
  if (!previous) return null;

  const rows = await db.product.findMany({
    where: { launchDate: previous.launchDate },
    orderBy: [{ votes: { _count: "desc" } }, { createdAt: "asc" }],
    take: limit,
    select: summarySelect(null),
  });
  return { day: previous.launchDate, launches: rows.map(toSummary) };
}

export function isUpcoming(launchDate: Date, today: Date): boolean {
  return launchDate.getTime() >= addUtcDays(today, 1).getTime();
}

/** Number of launches on each day in [from, to], keyed by `YYYY-MM-DD`. */
export async function getLaunchCountsByDay(from: Date, to: Date) {
  const rows = await db.product.groupBy({
    by: ["launchDate"],
    where: { launchDate: { gte: from, lte: to } },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [toDayParam(r.launchDate), r._count._all]));
}

/** The most-upvoted launch from the seven days ending `today`. */
export async function getLaunchOfTheWeek(today: Date) {
  const row = await db.product.findFirst({
    where: { launchDate: { gte: addUtcDays(today, -6), lte: today } },
    orderBy: [{ votes: { _count: "desc" } }, { createdAt: "asc" }],
    select: {
      slug: true,
      name: true,
      tagline: true,
      accent: true,
      logoUrl: true,
      verified: true,
      launchDate: true,
      _count: { select: { votes: true } },
    },
  });
  return row && { ...row, voteCount: row._count.votes };
}

export async function getProductBySlug(slug: string, visitorId: string | null) {
  const row = await db.product.findUnique({
    where: { slug },
    select: {
      ...summarySelect(visitorId),
      description: true,
      websiteUrl: true,
      launchDate: true,
      galleryUrls: true,
      videoUrl: true,
      appStoreUrl: true,
      playStoreUrl: true,
      makerId: true,
      pricingModel: true,
      freeTrialDays: true,
      features: true,
      primaryTopicSlug: true,
      makerUser: {
        select: { avatarUrl: true, headline: true, websiteUrl: true, xUrl: true, githubUrl: true, linkedinUrl: true },
      },
    },
  });
  if (!row) return null;
  return {
    ...toSummary(row),
    description: row.description,
    websiteUrl: row.websiteUrl,
    launchDate: row.launchDate,
    galleryUrls: row.galleryUrls,
    videoUrl: row.videoUrl,
    appStoreUrl: row.appStoreUrl,
    playStoreUrl: row.playStoreUrl,
    makerId: row.makerId,
    makerProfile: row.makerUser,
    pricingModel: row.pricingModel,
    freeTrialDays: row.freeTrialDays,
    features: row.features,
    primaryTopicSlug: row.primaryTopicSlug,
  };
}

/** Other launched products sharing `topicSlug`, most upvoted first. */
export async function getRelatedLaunches(
  productId: string,
  topicSlug: string,
  today: Date,
  limit = 3,
) {
  const rows = await db.product.findMany({
    where: {
      id: { not: productId },
      launchDate: { lte: today },
      topics: { some: { slug: topicSlug } },
    },
    orderBy: [{ votes: { _count: "desc" } }, { createdAt: "asc" }],
    take: limit,
    select: { ...summarySelect(null), pricingModel: true, launchDate: true },
  });
  return rows.map((row) => ({ ...toSummary(row), pricingModel: row.pricingModel, launchDate: row.launchDate }));
}

/** Every topic with its number of launched products and its top three logos. */
export async function getTopicDirectory(today: Date) {
  const rows = await db.topic.findMany({
    orderBy: { name: "asc" },
    select: {
      slug: true,
      name: true,
      _count: { select: { products: { where: { launchDate: { lte: today } } } } },
      products: {
        where: { launchDate: { lte: today } },
        orderBy: [{ votes: { _count: "desc" } }, { createdAt: "asc" }],
        take: 3,
        select: { id: true, name: true, accent: true, logoUrl: true },
      },
    },
  });
  return rows
    .map((t) => ({ slug: t.slug, name: t.name, count: t._count.products, top: t.products }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function getTopics() {
  return db.topic.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } });
}

/** Launched products matching a text query and/or topic, most upvoted first. */
export async function searchLaunches(
  { query, topicSlug }: { query?: string; topicSlug?: string },
  today: Date,
  visitorId: string | null,
) {
  const rows = await db.product.findMany({
    where: {
      launchDate: { lte: today },
      ...(topicSlug ? { topics: { some: { slug: topicSlug } } } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { tagline: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
              { maker: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ votes: { _count: "desc" } }, { createdAt: "asc" }],
    take: 50,
    select: summarySelect(visitorId),
  });
  return rows.map(toSummary);
}

/** A product's comments, oldest first, with each author's name. */
export function getComments(productId: string) {
  return db.comment.findMany({
    where: { productId },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: {
      id: true,
      body: true,
      createdAt: true,
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  });
}

/** How many launches between `from` and `to` run on each platform. */
export async function countPlatformsInRange(from: Date, to: Date) {
  const rows = await db.product.findMany({
    where: { launchDate: { gte: from, lte: to } },
    select: { platforms: true },
  });
  const counts = { web: 0, ios: 0, android: 0 } as Record<string, number>;
  for (const row of rows) for (const p of row.platforms) if (p in counts) counts[p] += 1;
  return counts;
}

/** Launch Pass launches still inside their featured window, newest first. */
export async function getFeaturedLaunches(today: Date, limit = 3) {
  const rows = await db.product.findMany({
    where: { featuredUntil: { gte: today }, launchDate: { lte: today } },
    orderBy: [{ launchDate: "desc" }, { createdAt: "asc" }],
    take: limit,
    select: summarySelect(null),
  });
  return rows.map(toSummary);
}
