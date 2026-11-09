"use client";

import { useState, useTransition } from "react";
import { cancelLaunch, publishSavedLaunch, withdrawSubmission } from "@/app/profile/actions";
import { Button } from "@/components/ui/button";

/** Two-step cancel: the first click asks, the second removes the launch. */
export function WithdrawButton({
  kind,
  id,
  name,
  label = "Withdraw",
}: {
  /** An unpublished submission, or a scheduled product that hasn't gone live yet. */
  kind: "submission" | "product";
  id: string;
  name: string;
  label?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(true)} className="text-muted-foreground hover:text-destructive">
        {label}
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`${label} ${name}?`}>
      <span className="text-sm font-medium">
        {label} {name}? Its files are deleted.
      </span>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = kind === "product" ? await cancelLaunch(id) : await withdrawSubmission(id);
            if (result.status === "error") setError(result.message ?? "Couldn't withdraw it.");
          })
        }
      >
        {pending ? "Working…" : `Yes, ${label.toLowerCase()}`}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(false)}>
        Keep it
      </Button>
      {error && <span role="alert" className="text-sm font-medium text-destructive">{error}</span>}
    </div>
  );
}

/** Puts a launch saved before launches went free into the queue. */
export function PublishSavedButton({ id }: { id: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <>
      <Button
        type="button"
        variant="lemon"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await publishSavedLaunch(id);
            if (result.status === "error") setError(result.message ?? "Couldn't schedule it.");
          })
        }
      >
        {pending ? "Scheduling…" : "Publish for free"}
      </Button>
      {error && <span role="alert" className="text-sm font-medium text-destructive">{error}</span>}
    </>
  );
}
