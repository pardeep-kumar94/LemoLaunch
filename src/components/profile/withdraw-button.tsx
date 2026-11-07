"use client";

import { useState, useTransition } from "react";
import { cancelLaunch, withdrawSubmission } from "@/app/profile/actions";

/** Two-step cancel: the first click asks, the second removes the launch. */
export function WithdrawButton({
  kind,
  id,
  name,
  label = "Withdraw",
  refundNote = false,
}: {
  /** An unpaid submission, or a scheduled product that hasn't gone live yet. */
  kind: "submission" | "product";
  id: string;
  name: string;
  label?: string;
  refundNote?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="h-10 rounded-xl border-2 border-line px-3.5 text-sm font-semibold text-mist transition-colors hover:border-danger hover:text-danger"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`${label} ${name}?`}>
      <span className="text-sm font-semibold">
        {label} {name}? Its files are deleted{refundNote ? " and your Launch Pass is refunded" : ""}.
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = kind === "product" ? await cancelLaunch(id) : await withdrawSubmission(id);
            if (result.status === "error") setError(result.message ?? "Couldn't withdraw it.");
          })
        }
        className="h-10 rounded-xl border-2 border-danger bg-danger px-3.5 text-sm font-bold text-white disabled:opacity-60"
      >
        {pending ? "Working…" : `Yes, ${label.toLowerCase()}`}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="h-10 rounded-xl border-2 border-line px-3.5 text-sm font-semibold"
      >
        Keep it
      </button>
      {error && <span role="alert" className="text-sm font-semibold text-danger">{error}</span>}
    </div>
  );
}
