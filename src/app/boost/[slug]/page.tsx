import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { ChevronLeft } from "lucide-react";
import { BoostForm } from "@/components/boost-form";
import { LogoTile } from "@/components/logo-tile";
import { getCurrentUser } from "@/lib/auth";
import { boostSpotsToday } from "@/lib/boost";
import { db } from "@/lib/db";
import { addUtcDays, formatLaunchDay, startOfUtcDay, toDayParam } from "@/lib/dates";
import { paymentMode } from "@/lib/payments";
import { BOOST } from "@/lib/pricing";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Boost your launch",
  description: "Show your launch in a Promoted spot on the LemoLaunch homepage.",
  path: "/boost",
  noindex: true,
});

export default function BoostPage({ params }: PageProps<"/boost/[slug]">) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
      <Suspense fallback={<div aria-busy="true" className="h-[520px] rounded-2xl bg-muted motion-safe:animate-pulse" />}>
        <Boost params={params} />
      </Suspense>
    </main>
  );
}

async function Boost({ params }: { params: PageProps<"/boost/[slug]">["params"] }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) notFound();
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(`/boost/${slug}`)}`);

  await connection();
  const product = await db.product.findUnique({
    where: { slug },
    select: { id: true, name: true, tagline: true, accent: true, logoUrl: true, launchDate: true, makerId: true },
  });
  if (!product || product.makerId !== user.id) notFound();

  const today = startOfUtcDay(new Date());
  const earliest = product.launchDate > today ? product.launchDate : today;
  const startOptions = Array.from({ length: BOOST.startWithinDays }, (_, i) => addUtcDays(today, i))
    .filter((day) => day >= earliest)
    .map((day) => {
      const names = formatLaunchDay(day);
      const label = day.getTime() === today.getTime() ? `Today, ${names.day}` : `${names.weekday}, ${names.day}`;
      return { value: toDayParam(day), label };
    });
  const spotsToday = await boostSpotsToday(today);

  return (
    <>
      <Link href="/profile" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" aria-hidden />
        My products
      </Link>
      <div className="mt-6 flex flex-wrap items-center gap-5">
        <LogoTile name={product.name} accent={product.accent} src={product.logoUrl} size="podium" />
        <div className="min-w-0">
          <h1 className="font-display text-4xl leading-none font-bold sm:text-5xl">Boost {product.name}</h1>
          <p className="mt-2 text-[17px] text-muted-foreground">
            Show it in a Promoted spot on the homepage for 1 to {BOOST.maxDays} days.
          </p>
        </div>
      </div>
      <div className="mt-10">
        {startOptions.length > 0 ? (
          <BoostForm
            productId={product.id}
            productName={product.name}
            startOptions={startOptions}
            spotsToday={spotsToday}
            available={paymentMode() !== "off"}
          />
        ) : (
          <p className="text-muted-foreground">This launch is too far away to boost yet. Come back closer to launch day.</p>
        )}
      </div>
    </>
  );
}
