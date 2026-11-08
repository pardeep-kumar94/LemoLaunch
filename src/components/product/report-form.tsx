"use client";

import { useActionState, useEffect } from "react";
import { Flag } from "lucide-react";
import { reportProduct, type ReportState } from "@/app/product-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { REPORT_REASONS } from "@/lib/product-page";
import { track } from "@/lib/analytics";

/** "Report this product" link that opens a short inline form. */
export function ReportForm({ productId }: { productId: string }) {
  const [state, formAction, pending] = useActionState<ReportState, FormData>(reportProduct.bind(null, productId), {
    status: "idle",
  });

  useEffect(() => {
    if (state.status === "sent") track("report_sent", { product_id: productId });
  }, [state, productId]);

  if (state.status === "sent") {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Thanks. We&apos;ll take a look at this product.
      </p>
    );
  }

  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md text-[13px] text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
        <Flag className="size-3.5" aria-hidden />
        Report this product
      </summary>
      <form action={formAction} className="mt-3 grid gap-3 rounded-2xl bg-card p-4 shadow-paper ring-1 ring-border">
        <fieldset>
          <legend className="text-sm font-semibold">What&apos;s wrong?</legend>
          <div className="mt-2 grid gap-1.5">
            {Object.entries(REPORT_REASONS).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm">
                <input type="radio" name="reason" value={value} required className="size-4 accent-[var(--primary)]" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Details (optional)</span>
          <Textarea name="details" rows={2} maxLength={500} className="min-h-16 resize-y" />
        </label>
        {state.status === "error" && <p className="text-sm font-medium text-destructive">{state.error}</p>}
        <Button type="submit" variant="outline" size="sm" disabled={pending} className="justify-self-start">
          {pending ? "Sending…" : "Send report"}
        </Button>
      </form>
    </details>
  );
}
