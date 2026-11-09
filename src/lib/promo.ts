/** The launch promotion: every listing is free until the end of this UTC day. */
export const LAUNCH_PROMO = {
  /** Bump this to show the popup again to visitors who closed an earlier one. */
  id: "launch-free-2026-11",
  endsAt: new Date("2026-11-24T00:00:00Z"),
  /** Shown as the last free day. */
  lastDayLabel: "Monday, 23 November",
};

export function isPromoActive(now = new Date()): boolean {
  return now.getTime() < LAUNCH_PROMO.endsAt.getTime();
}

/** Whole days left after today; 0 on the last day. */
export function promoDaysLeft(now = new Date()): number {
  return Math.max(0, Math.floor((LAUNCH_PROMO.endsAt.getTime() - now.getTime()) / 86_400_000));
}
