import { StarIcon } from "@/components/icons";

/** A row of five stars filled to the nearest whole star. Decorative; callers say the rating in text. */
export function Stars({ rating, className = "size-4" }: { rating: number; className?: string }) {
  const filled = Math.round(rating);
  return (
    <span aria-hidden="true" className="inline-flex gap-0.5 text-pop">
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} className={`${className} ${n > filled ? "text-line" : ""}`} filled={n <= filled} />
      ))}
    </span>
  );
}
