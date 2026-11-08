"use client";

import { useActionState, useEffect, useState } from "react";
import { saveReview, type ReviewState } from "@/app/product-actions";
import { StarIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const ratingWords = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

/** Star rating plus optional text. Pre-filled when the user already reviewed this product. */
export function ReviewForm({
  productId,
  existing,
}: {
  productId: string;
  existing: { rating: number; body: string } | null;
}) {
  const [state, formAction, pending] = useActionState<ReviewState, FormData>(saveReview.bind(null, productId), {
    status: "idle",
  });
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const shown = hover || rating;

  useEffect(() => {
    if (state.status === "saved") track("review_posted", { product_id: productId, rating, updated: Boolean(existing) });
    // Only when a save result arrives, not on every star hover.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="grid gap-3 rounded-2xl bg-card p-5 shadow-paper ring-1 ring-border">
      <fieldset>
        <legend className="font-semibold">{existing ? "Update your review" : "Rate this product"}</legend>
        <div className="mt-2 flex items-center gap-3" onMouseLeave={() => setHover(0)}>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="cursor-pointer" onMouseEnter={() => setHover(n)}>
                <input
                  type="radio"
                  name="rating"
                  value={n}
                  checked={rating === n}
                  onChange={() => setRating(n)}
                  className="peer sr-only"
                  required
                />
                <span className="sr-only">
                  {n} {n === 1 ? "star" : "stars"}
                </span>
                <StarIcon
                  filled={n <= shown}
                  className={cn(
                    "size-7 rounded-md transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
                    n <= shown ? "text-lemon-deep" : "text-input",
                  )}
                />
              </label>
            ))}
          </div>
          <span className="text-sm text-muted-foreground" aria-hidden="true">
            {ratingWords[shown]}
          </span>
        </div>
      </fieldset>
      <label htmlFor="review-body" className="sr-only">
        Your review (optional)
      </label>
      <Textarea
        id="review-body"
        name="body"
        rows={3}
        maxLength={1000}
        defaultValue={existing?.body ?? ""}
        placeholder="What did you like, and what could be better? (optional)"
        className="min-h-20 resize-y"
      />
      {state.status === "error" && <p className="text-sm font-medium text-destructive">{state.error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : existing ? "Update review" : "Post review"}
        </Button>
        {state.status === "saved" && (
          <p role="status" className="text-sm text-muted-foreground">
            Thanks, your review is saved.
          </p>
        )}
      </div>
    </form>
  );
}
