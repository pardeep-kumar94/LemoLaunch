import { db } from "@/lib/db";
import { addUtcDays, toDayParam } from "@/lib/dates";
import { liveNow, summarySelect, toSummary, type LaunchSummary } from "@/lib/launches";
import { BOOST, BOOST_PLACEMENTS, type BoostPlacement } from "@/lib/pricing";

// Boosts: paid Promoted spots on the homepage. Each placement has a fixed number of spots per
// day; an unpaid checkout holds its spots for a while so two makers can't buy the last one.

const HOLD_MINUTES = 30;

/** Boosts that are paid, or unpaid but still holding their spots. */
function countingBoosts() {
  return {
    OR: [
      { paymentStatus: "paid" },
      { paymentStatus: "awaiting", createdAt: { gte: new Date(Date.now() - HOLD_MINUTES * 60_000) } },
    ],
  };
}

/** Spots left in a placement on each day of [start, start + days). Keyed by `YYYY-MM-DD`. */
export async function boostSpotsLeft(placement: BoostPlacement, start: Date, days: number) {
  const end = addUtcDays(start, days - 1);
  const boosts = await db.boost.findMany({
    where: { placement, startDate: { lte: end }, endDate: { gte: start }, ...countingBoosts() },
    select: { startDate: true, endDate: true },
  });
  const left = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const day = addUtcDays(start, i);
    const used = boosts.filter((b) => b.startDate <= day && b.endDate >= day).length;
    left.set(toDayParam(day), Math.max(0, BOOST.spotsPerDay[placement] - used));
  }
  return left;
}

/** Spots left today in every placement, for the boost page. */
export async function boostSpotsToday(today: Date): Promise<Record<BoostPlacement, number>> {
  const entries = await Promise.all(
    BOOST_PLACEMENTS.map(async (p) => [p, (await boostSpotsLeft(p, today, 1)).get(toDayParam(today)) ?? 0] as const),
  );
  return Object.fromEntries(entries) as Record<BoostPlacement, number>;
}

export type PromotedLaunch = LaunchSummary & { placement: BoostPlacement };

/** Live products with a paid boost running today, by placement (oldest boost first). */
export async function getActiveBoosts(today: Date, visitorId: string | null): Promise<Record<BoostPlacement, PromotedLaunch[]>> {
  const rows = await db.boost.findMany({
    where: {
      paymentStatus: "paid",
      startDate: { lte: today },
      endDate: { gte: today },
      product: { launchDate: { lte: today }, ...liveNow() },
    },
    orderBy: { paidAt: "asc" },
    select: { placement: true, product: { select: summarySelect(visitorId) } },
  });
  const byPlacement: Record<BoostPlacement, PromotedLaunch[]> = { top: [], middle: [], bottom: [] };
  const seen = new Set<string>();
  for (const row of rows) {
    const placement = row.placement as BoostPlacement;
    const key = `${placement}:${row.product.id}`;
    if (!byPlacement[placement] || seen.has(key)) continue;
    seen.add(key);
    if (byPlacement[placement].length < BOOST.spotsPerDay[placement]) {
      byPlacement[placement].push({ ...toSummary(row.product), placement });
    }
  }
  return byPlacement;
}
