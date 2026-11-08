import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { TrackView } from "@/components/analytics/track-view";
import { PageBand } from "@/components/sections";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatLaunchDay } from "@/lib/dates";
import { syncBoostCheckout } from "@/lib/payments";
import { formatMoney, PLACEMENT_INFO, isBoostPlacement } from "@/lib/pricing";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Boost payment",
  description: "Your boost payment on LemoLaunch.",
  path: "/boost/payment",
  noindex: true,
});

export default function BoostPaymentPage({ searchParams }: PageProps<"/boost/payment">) {
  return (
    <main>
      <Suspense fallback={<PageBand title="Checking your payment" />}>
        <Result searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/** Where Dodo sends makers back after paying for a boost. Confirms the payment directly with Dodo. */
async function Result({ searchParams }: { searchParams: PageProps<"/boost/payment">["searchParams"] }) {
  const { boost: id } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/profile");
  if (typeof id !== "string") redirect("/profile");

  await syncBoostCheckout(id).catch((error) => console.error("Couldn't check boost payment", error));
  const boost = await db.boost.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      placement: true,
      days: true,
      startDate: true,
      endDate: true,
      amountCents: true,
      currency: true,
      paymentStatus: true,
      product: { select: { name: true, slug: true } },
    },
  });
  if (!boost) redirect("/profile");

  const paid = boost.paymentStatus === "paid";
  const placement = isBoostPlacement(boost.placement) ? PLACEMENT_INFO[boost.placement] : null;
  const from = formatLaunchDay(boost.startDate);
  const to = formatLaunchDay(boost.endDate);
  return (
    <>
      <TrackView event={paid ? "boost_paid" : "boost_payment_unfinished"} properties={{ boost_id: boost.id, placement: boost.placement, days: boost.days }} />
      <PageBand
        title={paid ? "Boost is on" : "Payment not finished"}
        description={
          paid
            ? `Thanks! ${formatMoney(boost.amountCents, boost.currency)} received for ${boost.product.name}'s ${boost.days}-day boost.`
            : `We haven't received the payment for ${boost.product.name}'s boost yet.`
        }
      />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-12">
        <div className="max-w-2xl rounded-2xl bg-card p-6 shadow-paper ring-1 ring-border sm:p-8">
          {paid ? (
            <>
              <span className="grid size-11 place-items-center rounded-xl bg-lemon text-on-lemon">
                <Check className="size-5" strokeWidth={2.5} aria-hidden />
              </span>
              <p className="mt-5 text-[17px]">
                {boost.product.name} shows in a <span className="font-medium">{placement?.label ?? boost.placement}</span> Promoted
                spot ({placement?.where.toLowerCase()}) from {from.weekday}, {from.day} to {to.weekday}, {to.day}.
              </p>
              <div className="mt-7 flex flex-wrap gap-2.5">
                <Button asChild size="lg">
                  <Link href="/">
                    See today&apos;s launches
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="ghost">
                  <Link href="/profile">My products</Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-[17px]">
                If you just paid, it can take a minute to confirm. Otherwise nothing was charged, and the spot is held for
                30 minutes if you want to try again.
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <Button asChild size="lg">
                  <Link href={`/boost/${boost.product.slug}`}>Try again</Link>
                </Button>
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
