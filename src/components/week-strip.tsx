import Link from "next/link";
import { addUtcDays, formatLaunchDay, toDayParam } from "@/lib/dates";

/** The seven launch days ending today, each linking to that day's feed. */
export function WeekStrip({
  today,
  selected,
  counts,
  hrefForDay,
}: {
  today: Date;
  selected: Date | null;
  counts: Map<string, number>;
  hrefForDay: (day: Date) => string;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addUtcDays(today, i - 6));

  return (
    <nav aria-label="Launch days this week">
      <ol className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const key = toDayParam(day);
          const count = counts.get(key) ?? 0;
          const isSelected = selected !== null && key === toDayParam(selected);
          const isToday = key === toDayParam(today);
          const { weekday, day: dayLabel } = formatLaunchDay(day);
          const label = `${isToday ? "Today" : weekday}, ${dayLabel}: ${
            count === 0 ? "no launches" : `${count} ${count === 1 ? "launch" : "launches"}`
          }`;

          const body = (
            <>
              <span className="text-[11px] sm:text-xs">{isToday ? "Today" : weekday.slice(0, 3)}</span>
              <span className="font-display text-lg leading-none font-extrabold tabular-nums">
                {day.getUTCDate()}
              </span>
            </>
          );
          const base =
            "flex flex-col items-center gap-0.5 rounded-[10px] border-2 py-1.5";

          return (
            <li key={key}>
              {count === 0 ? (
                <span aria-label={label} className={`${base} border-line text-mist opacity-45`}>
                  {body}
                </span>
              ) : (
                <Link
                  href={hrefForDay(day)}
                  scroll={false}
                  aria-label={label}
                  aria-current={isSelected ? "date" : undefined}
                  className={`${base} transition-colors ${
                    isSelected
                      ? "border-on-signal bg-signal text-on-signal"
                      : "border-line text-mist hover:border-ink [&>span:last-child]:text-ink"
                  }`}
                >
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
