"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toggleVote } from "@/app/actions";

// Hard offset shadow, pressed flat on click, like a physical launch button.
const toneClasses = {
  surface: {
    voted: "border-ink bg-pop text-on-signal shadow-[3px_3px_0_0_var(--ink)]",
    idle: "border-ink bg-paper text-ink shadow-[3px_3px_0_0_var(--ink)] hover:bg-pop-wash",
  },
  band: {
    voted: "border-on-signal bg-pop text-on-signal shadow-[4px_4px_0_0_var(--on-signal)]",
    idle: "border-on-signal bg-white text-on-signal shadow-[4px_4px_0_0_var(--on-signal)]",
  },
};

export function UpvoteButton({
  productId,
  productName,
  voteCount,
  hasVoted,
  tone = "surface",
}: {
  productId: string;
  productName: string;
  voteCount: number;
  hasVoted: boolean;
  /** "band" when the button sits on the yellow band. */
  tone?: "surface" | "band";
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
      const result = await toggleVote(productId);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={optimistic.hasVoted}
        aria-label={`${optimistic.hasVoted ? "Remove upvote from" : "Upvote"} ${productName}, ${optimistic.voteCount} votes`}
        className={`press flex h-16 w-[60px] flex-col items-center justify-center gap-1 rounded-[14px] border-2 font-display text-base font-extrabold tabular-nums ${toneClasses[tone][optimistic.hasVoted ? "voted" : "idle"]}`}
      >
        <svg viewBox="0 0 12 10" width="12" height="10" aria-hidden="true">
          <path d="M6 0 L12 10 H0 Z" fill="currentColor" />
        </svg>
        {optimistic.voteCount}
      </button>
      {error && (
        <p role="status" className="max-w-24 text-center text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
