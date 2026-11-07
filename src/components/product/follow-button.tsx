"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { toggleFollow } from "@/app/product-actions";

const base = "flex h-10 w-full items-center justify-center rounded-xl border-2 text-sm font-bold transition-colors";

/** Follow / Following toggle for a maker. Signed-out visitors go to sign in and come back. */
export function FollowButton({
  makerId,
  makerName,
  following,
  signInHref,
}: {
  makerId: string;
  makerName: string;
  following: boolean;
  /** Set when the visitor is signed out. */
  signInHref: string | null;
}) {
  const [optimistic, setOptimistic] = useOptimistic(following, (state) => !state);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (signInHref) {
    return (
      <Link href={signInHref} className={`${base} border-ink bg-paper hover:bg-signal-wash`}>
        Follow
      </Link>
    );
  }

  function handleClick() {
    setError(null);
    startTransition(async () => {
      setOptimistic(null);
      const result = await toggleFollow(makerId);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="grid gap-1">
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={optimistic}
        aria-label={`${optimistic ? "Unfollow" : "Follow"} ${makerName}`}
        className={`${base} ${
          optimistic ? "border-line bg-signal-wash text-ink hover:border-ink" : "border-on-signal bg-signal text-on-signal"
        }`}
      >
        {optimistic ? "Following" : "Follow"}
      </button>
      {error && (
        <p role="status" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
