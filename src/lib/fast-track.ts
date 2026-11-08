import { db } from "@/lib/db";
import { addUtcDays, startOfUtcDay } from "@/lib/dates";
import { FAST_TRACK } from "@/lib/pricing";

// Fast Track slots: every day has 24 / slotHours slots starting at 00:00 UTC, and each slot
// holds one Fast Track launch. A slot is taken by a published launch, or held for a while by
// someone who is paying for it.

/** How long an unpaid checkout holds its slot. */
const HOLD_MINUTES = 30;

export type FastTrackSlot = { start: Date; status: "open" | "taken" | "past" };
export type FastTrackDay = { day: Date; slots: FastTrackSlot[] };

/** Every slot start on a UTC day. */
export function slotStarts(day: Date): Date[] {
  const count = Math.floor(24 / FAST_TRACK.slotHours);
  return Array.from({ length: count }, (_, i) => new Date(day.getTime() + i * FAST_TRACK.slotHours * 3_600_000));
}

/** True if `date` is exactly the start of a slot. */
export function isSlotStart(date: Date): boolean {
  const ms = date.getTime() - startOfUtcDay(date).getTime();
  return ms % (FAST_TRACK.slotHours * 3_600_000) === 0;
}

/** Slot starts already taken or held between `from` and `to`, as epoch milliseconds. */
async function takenStarts(from: Date, to: Date, ignoreSubmissionId?: string): Promise<Set<number>> {
  const holdSince = new Date(Date.now() - HOLD_MINUTES * 60_000);
  const [products, holds] = await Promise.all([
    db.product.findMany({ where: { launchAt: { gte: from, lt: to } }, select: { launchAt: true } }),
    db.submission.findMany({
      where: {
        plan: "fast",
        launchAt: { gte: from, lt: to },
        OR: [
          { status: "pending" },
          { status: "awaiting_payment", paymentStatus: "awaiting", createdAt: { gte: holdSince } },
        ],
        ...(ignoreSubmissionId ? { id: { not: ignoreSubmissionId } } : {}),
      },
      select: { launchAt: true },
    }),
  ]);
  return new Set([...products, ...holds].flatMap((r) => (r.launchAt ? [r.launchAt.getTime()] : [])));
}

/** Slots for today and the next days, marked open, taken or past. */
export async function getFastTrackDays(now: Date): Promise<FastTrackDay[]> {
  const today = startOfUtcDay(now);
  const end = addUtcDays(today, FAST_TRACK.daysAhead);
  const taken = await takenStarts(today, end);
  return Array.from({ length: FAST_TRACK.daysAhead }, (_, i) => {
    const day = addUtcDays(today, i);
    return {
      day,
      slots: slotStarts(day).map((start) => ({
        start,
        status: start.getTime() <= now.getTime() ? "past" : taken.has(start.getTime()) ? "taken" : "open",
      })),
    };
  });
}

/** Whether a maker can book the slot starting at `start` right now. */
export async function isSlotOpen(start: Date, now: Date, ignoreSubmissionId?: string): Promise<boolean> {
  if (!isSlotStart(start) || start.getTime() <= now.getTime()) return false;
  if (start.getTime() >= addUtcDays(startOfUtcDay(now), FAST_TRACK.daysAhead).getTime()) return false;
  const taken = await takenStarts(start, new Date(start.getTime() + 1), ignoreSubmissionId);
  return !taken.has(start.getTime());
}

/** The first slot from `from` onwards with no published Fast Track launch (for late payments). */
export async function nextFreeSlot(from: Date): Promise<Date> {
  const products = await db.product.findMany({
    where: { launchAt: { gte: startOfUtcDay(from) } },
    select: { launchAt: true },
  });
  const taken = new Set(products.flatMap((p) => (p.launchAt ? [p.launchAt.getTime()] : [])));
  let day = startOfUtcDay(from);
  for (;;) {
    for (const start of slotStarts(day)) {
      if (start.getTime() >= from.getTime() && !taken.has(start.getTime())) return start;
    }
    day = addUtcDays(day, 1);
  }
}

/** "14:00" in UTC. */
export function formatSlotTime(date: Date): string {
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
}
