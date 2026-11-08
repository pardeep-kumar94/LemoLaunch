import { db } from "@/lib/db";
import { addUtcDays, startOfUtcDay, toDayParam } from "@/lib/dates";
import { DAILY_LAUNCH_LIMIT } from "@/lib/publish";

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

/** Fast Track launches stay hidden until their launch time; everything else is live all day. */
export function liveNow(now = new Date()) {
  return { OR: [{ launchAt: null }, { launchAt: { lte: now } }] };
}

export const summarySelect = (visitorId: string | null) =>
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

export function toSummary(row: SummaryRow): LaunchSummary {
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
    where: { launchDate: { lte: today }, ...liveNow() },
    orderBy: { launchDate: "desc" },
    select: { launchDate: true },
  });
  return latest?.launchDate ?? null;
}

/** Topics with at least one launch between `from` and `to` (inclusive), with how many. */
export async function getTopicsInRange(from: Date, to: Date) {
  const where = { launchDate: { gte: from, lte: to }, ...liveNow() };
  const rows = await db.topic.findMany({
    where: { products: { some: where } },
    orderBy: { name: "asc" },
    select: {
      slug: true,
      name: true,
      _count: { select: { products: { where } } },
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
  limit = DAILY_LAUNCH_LIMIT,
  excludeIds,
}: {
  from: Date;
  to: Date;
  visitorId: string | null;
  topicSlug?: string;
  platform?: string;
  limit?: number;
  /** Products shown elsewhere on the page, like the pinned Fast Track launch. */
  excludeIds?: string[];
}) {
  const rows = await db.product.findMany({
    where: {
      launchDate: { gte: from, lte: to },
      ...liveNow(),
      ...(excludeIds?.length ? { id: { notIn: excludeIds } } : {}),
      ...(topicSlug ? { topics: { some: { slug: topicSlug } } } : {}),
      ...(platform ? { platforms: { has: platform } } : {}),
    },
    orderBy: [{ votes: { _count: "desc" } }, { createdAt: "asc" }],
    take: limit,
    select: summarySelect(visitorId),
  });
  return rows.map(toSummary);
}

export function countLaunchesInRange(from: Date, to: Date): Promise<number> {
  return db.product.count({ where: { launchDate: { gte: from, lte: to }, ...liveNow() } });
}

/** Upvotes cast since `since`, across every product. */
export function countVotesSince(since: Date): Promise<number> {
  return db.vote.count({ where: { createdAt: { gte: since } } });
}

export function isUpcoming(launchDate: Date, today: Date): boolean {
  return launchDate.getTime() >= addUtcDays(today, 1).getTime();
}

/** Not live yet: a later day, or a Fast Track launch whose slot hasn't started. */
export function isProductUpcoming(product: { launchDate: Date; launchAt: Date | null }, now = new Date()): boolean {
  if (product.launchAt) return product.launchAt.getTime() > now.getTime();
  return isUpcoming(product.launchDate, startOfUtcDay(now));
}

/** The Fast Track launch pinned to the top right now, with how much of its pinned time is left. */
export async function getPinnedLaunch(now: Date, visitorId: string | null) {
  const row = await db.product.findFirst({
    where: { launchAt: { lte: now }, pinnedUntil: { gt: now } },
    orderBy: { launchAt: "desc" },
    select: { ...summarySelect(visitorId), launchAt: true, pinnedUntil: true },
  });
  if (!row?.launchAt || !row.pinnedUntil) return null;
  const total = row.pinnedUntil.getTime() - row.launchAt.getTime();
  return { launch: toSummary(row), remaining: Math.max(0, Math.min(1, (row.pinnedUntil.getTime() - now.getTime()) / total)), pinnedUntil: row.pinnedUntil };
}

/** Number of launches on each day in [from, to], keyed by `YYYY-MM-DD`. */
export async function getLaunchCountsByDay(from: Date, to: Date) {
  const rows = await db.product.groupBy({
    by: ["launchDate"],
    where: { launchDate: { gte: from, lte: to }, ...liveNow() },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [toDayParam(r.launchDate), r._count._all]));
}

export async function getProductBySlug(slug: string, visitorId: string | null) {
  const row = await db.product.findUnique({
    where: { slug },
    select: {
      ...summarySelect(visitorId),
      description: true,
      websiteUrl: true,
      launchDate: true,
      launchAt: true,
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
    launchAt: row.launchAt,
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
      ...liveNow(),
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
      _count: { select: { products: { where: { launchDate: { lte: today }, ...liveNow() } } } },
      products: {
        where: { launchDate: { lte: today }, ...liveNow() },
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
      AND: [liveNow()],
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
    where: { launchDate: { gte: from, lte: to }, ...liveNow() },
    select: { platforms: true },
  });
  const counts = { web: 0, ios: 0, android: 0 } as Record<string, number>;
  for (const row of rows) for (const p of row.platforms) if (p in counts) counts[p] += 1;
  return counts;
}

/** Today's edition number: launch days since the first product went live, counting from 1. */
export async function getEditionNumber(today: Date): Promise<number> {
  const first = await db.product.findFirst({ orderBy: { launchDate: "asc" }, select: { launchDate: true } });
  if (!first) return 1;
  return Math.max(1, Math.round((today.getTime() - first.launchDate.getTime()) / 86_400_000) + 1);
}

/** The most recent launch days before `day` that had launches, newest first. */
export async function getPreviousLaunchDays(day: Date, limit: number): Promise<{ day: Date; count: number }[]> {
  const rows = await db.product.groupBy({
    by: ["launchDate"],
    where: { launchDate: { lt: day } },
    _count: { _all: true },
    orderBy: { launchDate: "desc" },
    take: limit,
  });
  return rows.map((r) => ({ day: r.launchDate, count: r._count._all }));
}

/** Free seats taken on a day (Fast Track launches don't use one). */
export function countSeatsTaken(day: Date): Promise<number> {
  return db.product.count({ where: { launchDate: day, launchAt: null } });
}
