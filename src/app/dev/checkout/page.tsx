import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice, paymentMode } from "@/lib/payments";
import { completeSimulatedPayment } from "./actions";

export const metadata: Metadata = { title: "Simulated checkout | LaunchPad", robots: { index: false } };

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
  const { submission: id } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/profile");
  const submission =
    typeof id === "string"
      ? await db.submission.findFirst({
          where: { id, userId: user.id, paymentStatus: "awaiting" },
          select: { id: true, name: true },
        })
      : null;
  if (!submission) redirect("/profile");

  return (
    <div className="rounded-[22px] border-2 border-dashed border-ink bg-paper p-8">
      <p className="inline-block rounded-md bg-pop px-2 py-0.5 text-xs font-bold text-on-signal">
        Development only: no real payment
      </p>
      <h1 className="mt-4 font-display text-3xl font-extrabold">Simulated checkout</h1>
      <p className="mt-2 text-mist">
        Dodo Payments keys aren&apos;t set, so this page stands in for Dodo&apos;s checkout. Add your keys to
        <code className="mx-1 rounded bg-concrete px-1">.env</code>to use the real checkout.
      </p>
      <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-y-2 border-line py-4">
        <dt className="text-mist">Item</dt>
        <dd className="font-semibold">Launch Pass for {submission.name}</dd>
        <dt className="text-mist">Total</dt>
        <dd className="font-semibold">{formatPrice()}</dd>
      </dl>
      <div className="mt-6 flex flex-wrap gap-3">
        <form action={completeSimulatedPayment.bind(null, submission.id)}>
          <button
            type="submit"
            className="press h-12 rounded-xl border-2 border-on-signal bg-signal px-6 font-bold text-on-signal shadow-[4px_4px_0_0_var(--pop)]"
          >
            Pay {formatPrice()} (simulated)
          </button>
        </form>
        <Link href="/profile" className="inline-flex h-12 items-center rounded-xl border-2 border-line px-6 font-semibold">
          Cancel
        </Link>
      </div>
    </div>
  );
}
