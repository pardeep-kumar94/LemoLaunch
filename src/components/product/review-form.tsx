"use client";

import { useActionState, useState } from "react";
import { saveReview, type ReviewState } from "@/app/product-actions";
import { StarIcon } from "@/components/icons";

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

  return (
    <form action={formAction} className="grid gap-3 rounded-[18px] border-2 border-ink bg-paper p-5">
      <fieldset>
        <legend className="font-bold">{existing ? "Update your review" : "Rate this product"}</legend>
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
                  className={`size-8 rounded-md transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink ${
                    n <= shown ? "text-pop" : "text-line"
                  }`}
                />
              </label>
            ))}
          </div>
          <span className="text-sm font-semibold text-mist" aria-hidden="true">
            {ratingWords[shown]}
          </span>
        </div>
      </fieldset>
      <label htmlFor="review-body" className="sr-only">
        Your review (optional)
      </label>
      <textarea
        id="review-body"
        name="body"
        rows={3}
        maxLength={1000}
        defaultValue={existing?.body ?? ""}
        placeholder="What did you like, and what could be better? (optional)"
        className="w-full resize-y rounded-xl border-2 border-line bg-paper px-3.5 py-3 text-ink placeholder:text-mist focus:border-ink focus:outline-none"
      />
      {state.status === "error" && <p className="text-sm font-semibold text-danger">{state.error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="press h-11 rounded-xl border-2 border-on-signal bg-signal px-5 font-bold text-on-signal shadow-[3px_3px_0_0_var(--pop)] disabled:opacity-60"
        >
          {pending ? "Saving…" : existing ? "Update review" : "Post review"}
        </button>
        {state.status === "saved" && (
          <p role="status" className="text-sm font-semibold text-mist">
            Thanks, your review is saved.
          </p>
        )}
      </div>
    </form>
  );
}
