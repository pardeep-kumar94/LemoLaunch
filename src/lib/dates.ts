// Launch days are UTC calendar days, matching the `@db.Date` launchDate column.

export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function isSameUtcDay(a: Date, b: Date): boolean {
  return startOfUtcDay(a).getTime() === startOfUtcDay(b).getTime();
}

export function formatLaunchDay(date: Date): { weekday: string; day: string } {
  return {
    weekday: date.toLocaleDateString("en-GB", {
      weekday: "long",
      timeZone: "UTC",
    }),
    day: date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    }),
  };
}

/** `YYYY-MM-DD`, the format used in `?day=` links. */
export function toDayParam(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Parses a `?day=` value into a UTC day, or null if it isn't a real date. */
export function parseDayParam(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || toDayParam(date) !== value ? null : date;
}
