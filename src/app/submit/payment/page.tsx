import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { redirect } from "next/navigation";
import { resumeCheckout } from "@/app/actions";
import { PageBand } from "@/components/sections";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatLaunchDay } from "@/lib/dates";
import { formatPrice, LAUNCH_PASS, syncCheckout } from "@/lib/payments";
import { TrackView } from "@/components/analytics/track-view";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = pageMetadata({
  title: "Launch Pass payment",
  description: "Your Launch Pass payment on LemoLaunch.",
  path: "/submit/payment",
  noindex: true,
});

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
      <TrackView event={paid ? "launch_pass_paid" : "launch_pass_payment_unfinished"} properties={{ submission_id: submission.id }} />
      <PageBand
        title={paid ? "You're launching!" : "Payment not finished"}
        description={
          paid
            ? `Thanks! ${formatPrice(submission.amountCents ?? undefined, submission.currency ?? undefined)} received for ${submission.name}'s Launch Pass.`
            : `We haven't received the Launch Pass payment for ${submission.name} yet.`
        }
      />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-12">
        <div className="max-w-2xl rounded-2xl bg-card p-6 shadow-paper ring-1 ring-border sm:p-8">
          {paid ? (
            <>
              <span className="grid size-11 place-items-center rounded-xl bg-lemon text-on-lemon">
                <Check className="size-5" strokeWidth={2.5} aria-hidden />
              </span>
              <h2 className="mt-5 font-display text-2xl font-bold">What happens next</h2>
              <ol className="mt-4 grid gap-3">
                {[
                  `It's scheduled: it goes live at 00:00 UTC on ${launchDay}.`,
                  "You can cancel any time before launch for a full refund.",
                  `It's featured for ${LAUNCH_PASS.featuredDays} days, starting on launch day.`,
                ].map((step, i) => (
                  <li key={step} className="flex gap-3">
                    <span className="num grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <div className="mt-7 flex flex-wrap gap-2.5">
                {submission.product && (
                  <Button asChild size="lg">
                    <Link href={`/products/${submission.product.slug}`}>
                      See your launch page
                      <ArrowRight data-icon="inline-end" />
                    </Link>
                  </Button>
                )}
                {submission.product && (
                  <Button asChild size="lg" variant="outline">
                    <Link href={`/products/${submission.product.slug}#badge`}>Get badge</Link>
                  </Button>
                )}
                <Button asChild size="lg" variant="ghost">
                  <Link href="/profile">My products</Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-[17px]">
                If you just paid, it can take a minute to confirm. Otherwise your submission is saved, and you can
                finish paying whenever you&apos;re ready.
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <form action={resumeCheckout.bind(null, submission.id)}>
                  <Button type="submit" size="lg">
                    Complete payment
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                </form>
                <Button asChild size="lg" variant="outline">
                  <Link href="/profile">Go to My products</Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
