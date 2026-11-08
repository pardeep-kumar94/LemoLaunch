"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Plus } from "lucide-react";
import { toggleFollow } from "@/app/product-actions";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";

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
  const firstName = makerName.split(" ")[0];

  if (signInHref) {
    return (
      <Button asChild variant="outline" className="w-full">
        <Link href={signInHref}>
          <Plus data-icon="inline-start" />
          Follow {firstName}
        </Link>
      </Button>
    );
  }

  function handleClick() {
    setError(null);
    startTransition(async () => {
      setOptimistic(null);
      const result = await toggleFollow(makerId);
      if (!result.ok) setError(result.error);
      else track(result.following ? "followed_maker" : "unfollowed_maker", { maker_id: makerId });
    });
  }

  return (
    <div className="grid gap-1">
      <Button
        type="button"
        variant={optimistic ? "secondary" : "outline"}
        onClick={handleClick}
        aria-pressed={optimistic}
        aria-label={`${optimistic ? "Unfollow" : "Follow"} ${makerName}`}
        className="w-full"
      >
        {optimistic ? <Check data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
        {optimistic ? "Following" : `Follow ${firstName}`}
      </Button>
      {error && (
        <p role="status" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
