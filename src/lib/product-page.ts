import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { addUtcDays, formatLaunchDay } from "@/lib/dates";
import { platformLabels, sortPlatforms } from "@/lib/platforms";

// Facts, rankings, reviews and FAQ for the product page.

export const PRICING_MODELS = ["free", "freemium", "paid"] as const;
export type PricingModel = (typeof PRICING_MODELS)[number];

export const pricingLabels: Record<PricingModel, string> = {
  free: "Free",
  freemium: "Freemium",
  paid: "Paid",
};

export const MAX_FEATURES = 6;
export const MAX_FEATURE_LENGTH = 80;
export const MAX_TRIAL_DAYS = 90;

export function isPricingModel(value: unknown): value is PricingModel {
  return typeof value === "string" && (PRICING_MODELS as readonly string[]).includes(value);
}

/** "Free" / "Freemium" / "Paid", or null for products from before pricing was asked. */
export function pricingLabel(model: string | null): string | null {
  return isPricingModel(model) ? pricingLabels[model] : null;
}

/** Free and freemium products have a free plan; paid ones don't. Null when unknown. */
export function hasFreePlan(model: string | null): boolean | null {
  return isPricingModel(model) ? model !== "paid" : null;
}

/** The maker's chosen category, falling back to the first topic for older products. */
export function primaryTopic<T extends { slug: string; name: string }>(product: {
  primaryTopicSlug: string | null;
  topics: T[];
}): T | undefined {
  return product.topics.find((t) => t.slug === product.primaryTopicSlug) ?? product.topics[0];
}

/** "Website, iPhone and iPad app, Android app", or with `short`, "Web, iOS, Android". */
export function platformList(platforms: readonly string[], { short = false } = {}): string {
  return sortPlatforms(platforms)
    .map((p) => (short ? platformLabels[p].short : platformLabels[p].long))
    .join(", ");
}

/** What a visitor can report a product for. */
export const REPORT_REASONS = {
  spam: "Spam",
  broken_link: "Broken link",
  misleading: "Misleading",
  offensive: "Offensive",
  other: "Something else",
} as const;

export type RatingSummary = { average: number; count: number };

/** Average star rating and review count for each product that has reviews. */
export async function getRatings(productIds: string[]): Promise<Map<string, RatingSummary>> {
  if (productIds.length === 0) return new Map();
  const rows = await db.review.groupBy({
    by: ["productId"],
    where: { productId: { in: productIds } },
    _avg: { rating: true },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.productId, { average: r._avg.rating ?? 0, count: r._count._all }]));
}

/** "4.6" — one decimal, as shown next to the stars. */
export function formatRating(average: number): string {
  return average.toFixed(1);
}

/** A product's reviews, newest first, with each author's name and photo. */
export function getReviews(productId: string) {
  return db.review.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      rating: true,
      body: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  });
}

export type Rank = { rank: number; of: number };

/** Products ranked by upvotes, ties going to the earlier launch — the order the feed uses. */
async function rankAmong(productId: string, where: Prisma.ProductWhereInput): Promise<Rank | null> {
  const rows = await db.product.findMany({
    where,
    orderBy: [{ votes: { _count: "desc" } }, { createdAt: "asc" }],
    select: { id: true },
  });
  const index = rows.findIndex((r) => r.id === productId);
  return index === -1 ? null : { rank: index + 1, of: rows.length };
}

/** Position among everything that launched the same day, e.g. #2 of 6. */
export function getLaunchDayRank(product: { id: string; launchDate: Date }): Promise<Rank | null> {
  return rankAmong(product.id, { launchDate: product.launchDate });
}

/** Monday of the UTC week containing `date`. */
export function startOfUtcWeek(date: Date): Date {
  return addUtcDays(date, -((date.getUTCDay() + 6) % 7));
}

/** Position among products tagged `topicSlug` that launched the same UTC week (Mon–Sun). */
export function getCategoryWeekRank(
  product: { id: string; launchDate: Date },
  topicSlug: string,
  today: Date,
): Promise<Rank | null> {
  const weekStart = startOfUtcWeek(product.launchDate);
  const weekEnd = addUtcDays(weekStart, 6);
  return rankAmong(product.id, {
    launchDate: { gte: weekStart, lte: weekEnd.getTime() < today.getTime() ? weekEnd : today },
    topics: { some: { slug: topicSlug } },
  });
}

export type Faq = { question: string; answer: string };

/** Questions and answers written from the product's facts. Only facts that exist get a question. */
export function buildFaq(product: {
  name: string;
  maker: string;
  pricingModel: string | null;
  freeTrialDays: number | null;
  platforms: string[];
  launchDate: Date;
  upcoming: boolean;
  alternatives: string[];
}): Faq[] {
  const { name } = product;
  const faq: Faq[] = [];
  const pricing = isPricingModel(product.pricingModel) ? product.pricingModel : null;
  if (pricing) {
    const trial = product.freeTrialDays
      ? ` You can try it free for ${product.freeTrialDays} ${product.freeTrialDays === 1 ? "day" : "days"}.`
      : "";
    const answer = {
      free: `Yes. ${name} is free to use.`,
      freemium: `${name} has a free plan, with paid plans for more features.${trial}`,
      paid: `No. ${name} is a paid product.${trial}`,
    }[pricing];
    faq.push({ question: `Is ${name} free?`, answer });
  }
  if (product.platforms.length > 0) {
    faq.push({
      question: `What platforms does ${name} run on?`,
      answer: `${name} is available on ${platformList(product.platforms)}.`,
    });
  }
  faq.push({ question: `Who made ${name}?`, answer: `${name} was made by ${product.maker}.` });
  const { weekday, day } = formatLaunchDay(product.launchDate);
  const year = product.launchDate.getUTCFullYear();
  faq.push(
    product.upcoming
      ? { question: `When does ${name} launch?`, answer: `${name} launches on LemoLaunch on ${weekday}, ${day} ${year}.` }
      : { question: `When did ${name} launch?`, answer: `${name} launched on LemoLaunch on ${weekday}, ${day} ${year}.` },
  );
  if (product.alternatives.length > 0) {
    faq.push({
      question: `What are alternatives to ${name}?`,
      answer: `Popular alternatives on LemoLaunch include ${joinNames(product.alternatives.slice(0, 3))}.`,
    });
  }
  return faq;
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
