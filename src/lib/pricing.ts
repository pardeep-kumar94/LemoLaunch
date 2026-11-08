// What LemoLaunch charges, in one place. Shared by the server and the browser, so no server-only
// imports here. Prices are in US cents.
//
// Free: join the queue for the next day with an open seat (100 seats a day).
// Fast Track: go live at a 2-hour slot you pick, pinned to the top of the day for 2 hours.
// Boost: a Promoted spot on the homepage for 1 to 7 days, with a discount for longer boosts.
// None of these ever change the upvote ranking.

export const CURRENCY = "USD";

export const FAST_TRACK = {
  priceCents: 500,
  /** Slots start every this many hours, from 00:00 UTC. */
  slotHours: 2,
  /** How long a Fast Track launch stays pinned at the top. */
  pinnedHours: 2,
  /** How many days ahead, counting today, a slot can be booked. */
  daysAhead: 7,
};

export const BOOST_PLACEMENTS = ["top", "middle", "bottom"] as const;
export type BoostPlacement = (typeof BOOST_PLACEMENTS)[number];

export const BOOST = {
  perDayCents: { top: 2500, middle: 1500, bottom: 1000 } satisfies Record<BoostPlacement, number>,
  /** Promoted spots per day in each placement. */
  spotsPerDay: { top: 2, middle: 3, bottom: 5 } satisfies Record<BoostPlacement, number>,
  maxDays: 7,
  /** How far ahead a boost can start, counting today. */
  startWithinDays: 14,
  /** Percent off by number of days (index = days). */
  discountPercent: [0, 0, 5, 10, 12, 15, 18, 20],
};

export const PLACEMENT_INFO: Record<BoostPlacement, { label: string; where: string }> = {
  top: { label: "Top", where: "Above today's launches, and on product pages" },
  middle: { label: "Middle", where: "Inside today's list, after the first five" },
  bottom: { label: "Bottom", where: "At the end of today's list and on its category page" },
};

export function isBoostPlacement(value: unknown): value is BoostPlacement {
  return BOOST_PLACEMENTS.includes(value as BoostPlacement);
}

/** Price of a boost: the daily rate times the days, less the multi-day discount. */
export function boostPrice(placement: BoostPlacement, days: number) {
  const subtotalCents = BOOST.perDayCents[placement] * days;
  const discountPercent = BOOST.discountPercent[days] ?? 0;
  const discountCents = Math.round((subtotalCents * discountPercent) / 100);
  return { subtotalCents, discountPercent, discountCents, totalCents: subtotalCents - discountCents };
}

export function formatMoney(cents: number, currency = CURRENCY) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
