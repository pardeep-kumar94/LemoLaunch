"use client";

import { useOptimistic, useState, useTransition } from "react";
import { ChevronUp } from "lucide-react";
import { toggleVote } from "@/app/actions";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const sizes = {
  md: "size-[58px] rounded-xl text-sm",
  lg: "size-16 rounded-[14px] text-[15px]",
  sm: "h-[50px] w-12 rounded-[11px] text-[13px]",
};

/** The upvote square. Lemon once you've voted; the count updates before the server answers. */
export function UpvoteButton({
  productId,
  productName,
  voteCount,
  hasVoted,
  size = "md",
}: {
  productId: string;
  productName: string;
  voteCount: number;
  hasVoted: boolean;
  size?: keyof typeof sizes;
  /** Ignored; kept so older call sites still compile. */
  tone?: string;
}) {
  const [optimistic, setOptimistic] = useOptimistic(
    { voteCount, hasVoted },
    (state) => ({
      hasVoted: !state.hasVoted,
      voteCount: state.voteCount + (state.hasVoted ? -1 : 1),
    }),
  );
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      setOptimistic(null);
      const wasVoted = optimistic.hasVoted;
      const result = await toggleVote(productId);
      if (!result.ok) setError(result.error);
      else track(wasVoted ? "upvote_removed" : "upvoted", { product_id: productId, product_name: productName });
    });
  }

  return (
    <div className="relative z-10 flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={optimistic.hasVoted}
        aria-label={`${optimistic.hasVoted ? "Remove upvote from" : "Upvote"} ${productName}, ${optimistic.voteCount} votes`}
        className={cn(
          "num grid place-items-center content-center gap-0.5 border font-semibold transition-[background-color,border-color,box-shadow,transform] duration-200 active:translate-y-px",
          sizes[size],
          optimistic.hasVoted
            ? "border-[color-mix(in_oklab,var(--lemon-deep)_80%,black_6%)] bg-lemon text-on-lemon shadow-[0_6px_16px_-10px_var(--lemon-deep)]"
            : "border-border bg-card text-foreground shadow-xs hover:border-lemon-deep hover:bg-accent",
        )}
      >
        <ChevronUp className="size-4" strokeWidth={2.5} aria-hidden />
        {optimistic.voteCount}
      </button>
      {error && (
        <p role="status" className="max-w-28 text-center text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
