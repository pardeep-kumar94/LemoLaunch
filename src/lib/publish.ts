import { db } from "@/lib/db";
import { addUtcDays, startOfUtcDay } from "@/lib/dates";

// Launches publish themselves: free ones join the queue and take the next day with room,
// Launch Pass ones go on the day the maker picked, as soon as the payment succeeds.

/** At most this many products launch on one day; the queue moves on to the next day after that. */
export const DAILY_LAUNCH_LIMIT = 100;

/** Days a Launch Pass keeps a product in the "Featured launches" panel, counting launch day. */
export const FEATURED_DAYS = 7;

/**
 * Where a new free launch would land in the queue: the first day from tomorrow with fewer than
 * DAILY_LAUNCH_LIMIT launches, how many launches are scheduled ahead of it, and how many are
 * already on that day (so the new launch takes seat `onDay + 1`).
 */
export async function launchQueue(today: Date): Promise<{ day: Date; ahead: number; onDay: number }> {
  const from = addUtcDays(today, 1);
  const rows = await db.product.groupBy({
    by: ["launchDate"],
    where: { launchDate: { gte: from } },
    _count: { _all: true },
  });
  const counts = new Map(rows.map((r) => [r.launchDate.getTime(), r._count._all]));
  let day = from;
  let ahead = 0;
  for (let count = counts.get(day.getTime()) ?? 0; count >= DAILY_LAUNCH_LIMIT; count = counts.get(day.getTime()) ?? 0) {
    ahead += count;
    day = addUtcDays(day, 1);
  }
  const onDay = counts.get(day.getTime()) ?? 0;
  return { day, ahead: ahead + onDay, onDay };
}

/** The first day from tomorrow with room for another launch. */
export async function nextOpenLaunchDay(today: Date): Promise<Date> {
  return (await launchQueue(today)).day;
}

/** Lowercase, hyphenated, and unique among products. */
async function uniqueProductSlug(name: string): Promise<string> {
  const base =
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || "launch";
  let slug = base;
  for (let n = 2; await db.product.findUnique({ where: { slug }, select: { id: true } }); n++) {
    slug = `${base}-${n}`;
  }
  return slug;
}

const accents = ["#1D5C7A", "#6B3FA0", "#0F6E6E", "#A1401F", "#2F6B3A", "#8C2F55", "#2E4A8C", "#7A5418"];

function accentFor(name: string): string {
  const hash = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return accents[hash % accents.length];
}

/**
 * Turns a submission into a scheduled product owned by its maker. Free launches take the next
 * day with room in the queue; a paid Launch Pass keeps the maker's day (or tomorrow, if that day has passed).
 * Does nothing if the submission is already published or still waiting for payment.
 */
export async function publishSubmission(submissionId: string): Promise<{ slug: string; launchDate: Date } | null> {
  const submission = await db.submission.findUnique({
    where: { id: submissionId },
    include: { user: { select: { name: true } } },
  });
  if (!submission || submission.status !== "pending") return null;

  const today = startOfUtcDay(new Date());
  const tomorrow = addUtcDays(today, 1);
  const paidPass = submission.plan === "pass" && submission.paymentStatus === "paid";
  const launchDate = paidPass
    ? submission.launchDate && submission.launchDate.getTime() >= tomorrow.getTime()
      ? submission.launchDate
      : tomorrow
    : await nextOpenLaunchDay(today);
  const slug = await uniqueProductSlug(submission.name);

  const published = await db.$transaction(async (tx) => {
    // Claim the submission first so a webhook and the return page can't both publish it.
    const claimed = await tx.submission.updateMany({
      where: { id: submission.id, status: "pending" },
      data: { status: "approved", reviewedAt: new Date(), launchDate },
    });
    if (claimed.count === 0) return null;

    const product = await tx.product.create({
      data: {
        slug,
        name: submission.name,
        tagline: submission.tagline,
        description: submission.description || null,
        maker: submission.user.name,
        makerId: submission.userId,
        accent: accentFor(submission.name),
        logoUrl: submission.logoUrl,
        galleryUrls: submission.galleryUrls,
        videoUrl: submission.videoUrl || null,
        platforms: submission.platforms,
        websiteUrl: submission.websiteUrl,
        appStoreUrl: submission.appStoreUrl,
        playStoreUrl: submission.playStoreUrl,
        pricingModel: submission.pricingModel,
        freeTrialDays: submission.freeTrialDays,
        features: submission.features,
        primaryTopicSlug: submission.topicSlug,
        launchDate,
        featured: paidPass,
        featuredUntil: paidPass ? addUtcDays(launchDate, FEATURED_DAYS - 1) : null,
        topics: submission.topicSlug ? { connect: [{ slug: submission.topicSlug }] } : undefined,
      },
      select: { id: true },
    });
    await tx.submission.update({ where: { id: submission.id }, data: { productId: product.id } });
    return { slug, launchDate };
  });
  return published;
}
