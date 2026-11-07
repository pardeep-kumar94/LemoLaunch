import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { resumeCheckout } from "@/app/actions";
import { PageBand } from "@/components/sections";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatLaunchDay } from "@/lib/dates";
import { formatPrice, LAUNCH_PASS, syncCheckout } from "@/lib/payments";

export const metadata: Metadata = { title: "Launch Pass payment | LemoLaunch", robots: { index: false } };

export default function PaymentReturnPage({ searchParams }: PageProps<"/submit/payment">) {
  return (
    <main>
      <Suspense fallback={<PageBand title="Checking your payment" />}>
        <PaymentResult searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/** Where Dodo sends makers back after checkout. Confirms the payment directly with Dodo. */
async function PaymentResult({ searchParams }: { searchParams: PageProps<"/submit/payment">["searchParams"] }) {
  const { submission: id } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/profile");
  if (typeof id !== "string") redirect("/profile");

  await syncCheckout(id).catch((error) => console.error("Couldn't check payment", error));
  const submission = await db.submission.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      name: true,
      paymentStatus: true,
      amountCents: true,
      currency: true,
      launchDate: true,
      product: { select: { slug: true } },
    },
  });
  if (!submission) redirect("/profile");

  const paid = submission.paymentStatus === "paid";
  const launchDay = submission.launchDate
    ? `${formatLaunchDay(submission.launchDate).weekday}, ${formatLaunchDay(submission.launchDate).day}`
    : "your launch day";
  return (
    <>
      <PageBand
        title={paid ? "You're launching!" : "Payment not finished"}
        description={
          paid
            ? `Thanks! ${formatPrice(submission.amountCents ?? undefined, submission.currency ?? undefined)} received for ${submission.name}'s Launch Pass.`
            : `We haven't received the Launch Pass payment for ${submission.name} yet.`
        }
      />
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-[22px] border-2 border-ink bg-paper p-6 shadow-[6px_6px_0_0_var(--pop)] sm:p-8">
          {paid ? (
            <>
              <h2 className="font-display text-2xl font-extrabold">What happens next</h2>
              <ol className="mt-4 grid gap-3">
                {[
                  `It's scheduled: it goes live at 00:00 UTC on ${launchDay}.`,
                  "You can cancel any time before launch for a full refund.",
                  `It's featured for ${LAUNCH_PASS.featuredDays} days, starting on launch day.`,
                ].map((step, i) => (
                  <li key={step} className="flex gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-signal font-display text-sm font-bold text-on-signal">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <div className="mt-7 flex flex-wrap gap-3">
                {submission.product && (
                  <Link
                    href={`/products/${submission.product.slug}`}
                    className="press inline-flex h-12 items-center rounded-xl border-2 border-on-signal bg-signal px-6 font-bold text-on-signal shadow-[4px_4px_0_0_var(--pop)]"
                  >
                    See your launch page
                  </Link>
                )}
                {submission.product && (
                  <Link
                    href={`/products/${submission.product.slug}#badge`}
                    className="inline-flex h-12 items-center rounded-xl border-2 border-line px-6 font-semibold"
                  >
                    Get badge
                  </Link>
                )}
                <Link href="/profile" className="inline-flex h-12 items-center rounded-xl border-2 border-line px-6 font-semibold">
                  My products
                </Link>
              </div>
            </>
          ) : (
            <>
              <p>
                If you just paid, it can take a minute to confirm. Otherwise your submission is saved, and you
                can finish paying whenever you&apos;re ready.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <form action={resumeCheckout.bind(null, submission.id)}>
                  <button
                    type="submit"
                    className="press h-12 rounded-xl border-2 border-on-signal bg-signal px-6 font-bold text-on-signal shadow-[4px_4px_0_0_var(--pop)]"
                  >
                    Complete payment
                  </button>
                </form>
                <Link href="/profile" className="inline-flex h-12 items-center rounded-xl border-2 border-line px-6 font-semibold">
                  Go to My products
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
