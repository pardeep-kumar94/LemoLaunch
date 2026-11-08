import { cn } from "@/lib/utils";

/**
 * A day's launch seats as a grid: every launch day has a fixed number of seats (100), and each
 * square is one. Filled seats are launches; `highlight` marks one seat, e.g. where yours will be.
 */
export function SeatGrid({
  total,
  filled,
  highlight,
  columns,
  animate = false,
  tone = "launched",
  className,
}: {
  total: number;
  filled: number;
  /** Zero-based index of a seat to ring, such as the maker's own. */
  highlight?: number;
  /** Fixed column count; leave out to use the grid-cols-* classes in className. */
  columns?: number;
  /** Seats settle in one by one on load (the homepage's one moment). */
  animate?: boolean;
  /** "launched" fills seats in lemon; "queued" fills them in a neutral gray. */
  tone?: "launched" | "queued";
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={`${filled} of ${total} seats taken`}
      className={cn("grid gap-1", !columns && "grid-cols-10", className)}
      style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
    >
      {Array.from({ length: total }, (_, i) => {
        const isHighlight = i === highlight;
        const isFilled = i < filled;
        return (
          <span
            key={i}
            className={cn(
              "aspect-square rounded-[min(5px,22%)]",
              isHighlight
                ? "bg-primary shadow-[0_0_0_2px_var(--card),0_0_0_4px_var(--lemon-deep)]"
                : isFilled
                  ? tone === "launched"
                    ? "bg-lemon-soft shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--lemon-deep)_45%,var(--card))]"
                    : "bg-[color-mix(in_oklab,var(--foreground)_14%,var(--muted))]"
                  : "shadow-[inset_0_0_0_1px_var(--input)]",
              animate && isFilled && !isHighlight && "seat-in",
            )}
            style={animate ? ({ "--seat": i } as React.CSSProperties) : undefined}
          />
        );
      })}
    </div>
  );
}
