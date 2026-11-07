"use client";

import { useActionState } from "react";
import { reportProduct, type ReportState } from "@/app/product-actions";
import { FlagIcon } from "@/components/icons";
import { REPORT_REASONS } from "@/lib/product-page";

/** "Report this product" link that opens a short inline form. */
export function ReportForm({ productId }: { productId: string }) {
  const [state, formAction, pending] = useActionState<ReportState, FormData>(reportProduct.bind(null, productId), {
    status: "idle",
  });

  if (state.status === "sent") {
    return (
      <p role="status" className="text-sm text-mist">
        Thanks. We&apos;ll take a look at this product.
      </p>
    );
  }

  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-sm text-mist underline decoration-line decoration-2 underline-offset-4 hover:text-ink [&::-webkit-details-marker]:hidden">
        <FlagIcon className="size-3.5" />
        Report this product
      </summary>
      <form action={formAction} className="mt-3 grid gap-3 rounded-2xl border-2 border-line bg-paper p-4">
        <fieldset>
          <legend className="text-sm font-bold">What&apos;s wrong?</legend>
          <div className="mt-2 grid gap-1.5">
            {Object.entries(REPORT_REASONS).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm">
                <input type="radio" name="reason" value={value} required className="accent-[var(--pop)]" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Details (optional)</span>
          <textarea
            name="details"
            rows={2}
            maxLength={500}
            className="w-full resize-y rounded-xl border-2 border-line bg-paper px-3 py-2 text-ink focus:border-ink focus:outline-none"
          />
        </label>
        {state.status === "error" && <p className="text-sm font-semibold text-danger">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="h-10 justify-self-start rounded-xl border-2 border-ink bg-paper px-4 text-sm font-bold hover:bg-signal-wash disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send report"}
        </button>
      </form>
    </details>
  );
}
