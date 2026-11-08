import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { paymentMode } from "@/lib/payments";
import { FAST_TRACK, formatMoney } from "@/lib/pricing";
import { completeSimulatedBoostPayment, completeSimulatedPayment } from "./actions";

export const metadata: Metadata = pageMetadata({
  title: "Simulated checkout",
  description: "Local development checkout.",
  path: "/dev/checkout",
  noindex: true,
});

export default function SimulatedCheckoutPage({ searchParams }: PageProps<"/dev/checkout">) {
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <Suspense>
        <Checkout searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Checkout({ searchParams }: { searchParams: PageProps<"/dev/checkout">["searchParams"] }) {
  // Exists only in local development when no Dodo keys are set.
  if (paymentMode() !== "simulated") notFound();
  const { submission: submissionId, boost: boostId } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/profile");

  let item: { label: string; amountCents: number; pay: () => Promise<void> } | null = null;
  if (typeof submissionId === "string") {
    const submission = await db.submission.findFirst({
      where: { id: submissionId, userId: user.id, paymentStatus: "awaiting" },
      select: { id: true, name: true },
    });
    if (submission) {
      item = { label: `Fast Track for ${submission.name}`, amountCents: FAST_TRACK.priceCents, pay: completeSimulatedPayment.bind(null, submission.id) };
    }
  } else if (typeof boostId === "string") {
    const boost = await db.boost.findFirst({
      where: { id: boostId, userId: user.id, paymentStatus: "awaiting" },
      select: { id: true, days: true, placement: true, amountCents: true, product: { select: { name: true } } },
    });
    if (boost) {
      item = {
        label: `${boost.days}-day ${boost.placement} boost for ${boost.product.name}`,
        amountCents: boost.amountCents,
        pay: completeSimulatedBoostPayment.bind(null, boost.id),
      };
    }
  }
  if (!item) redirect("/profile");

  return (
    <div className="rounded-2xl border border-dashed border-input bg-card p-6 shadow-paper sm:p-8">
      <Badge variant="lemon">Development only: no real payment</Badge>
      <h1 className="mt-4 font-display text-3xl font-bold">Simulated checkout</h1>
      <p className="mt-2 text-muted-foreground">
        Dodo Payments keys aren&apos;t set, so this page stands in for Dodo&apos;s checkout. Add your keys to
        <code className="mx-1 rounded bg-muted px-1 font-mono text-[13px]">.env</code>to use the real checkout.
      </p>
      <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-y border-border py-4">
        <dt className="text-muted-foreground">Item</dt>
        <dd className="font-medium">{item.label}</dd>
        <dt className="text-muted-foreground">Total</dt>
        <dd className="num font-medium">{formatMoney(item.amountCents)}</dd>
      </dl>
      <div className="mt-6 flex flex-wrap gap-2.5">
        <form action={item.pay}>
          <Button type="submit" size="lg">
            Pay {formatMoney(item.amountCents)} (simulated)
          </Button>
        </form>
        <Button asChild size="lg" variant="outline">
          <Link href="/profile">Cancel</Link>
        </Button>
      </div>
    </div>
  );
}
