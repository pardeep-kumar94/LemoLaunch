import { StarIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

/** A row of five stars filled to the nearest whole star. Decorative; callers say the rating in text. */
export function Stars({ rating, className = "size-4" }: { rating: number; className?: string }) {
  const filled = Math.round(rating);
  return (
    <span aria-hidden="true" className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} className={cn(className, n <= filled ? "text-lemon-deep" : "text-input")} filled={n <= filled} />
      ))}
    </span>
  );
}
