import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight } from "lucide-react";
import { VerifiedBadge } from "@/components/badges";
import { SubmitForm } from "@/components/submit-form";
import { Button } from "@/components/ui/button";
import { addUtcDays, formatLaunchDay, startOfUtcDay, toDayParam } from "@/lib/dates";
import { getCurrentUser } from "@/lib/auth";
import { getTopics } from "@/lib/launches";
import { formatPrice, paymentMode } from "@/lib/payments";
import { DAILY_LAUNCH_LIMIT, launchQueue } from "@/lib/publish";

export const metadata: Metadata = pageMetadata({
  title: "Submit your startup or product for free",
  description:
    "Launch your startup, SaaS, app or side project on LemoLaunch for free. Pick a category, add screenshots and get upvotes, feedback and a launch badge from the community.",
  path: "/submit",
});

export default function SubmitPage() {
  return (
    <main>
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 pt-10 pb-10 sm:px-8 sm:pt-14">
          <h1 className="font-display text-5xl leading-[0.95] font-bold sm:text-[64px]">Submit a launch</h1>
          <p className="mt-4 max-w-2xl text-[17px] text-muted-foreground">
            Add your product, then take a seat. Up to {DAILY_LAUNCH_LIMIT} products go live each day at 00:00 UTC,
            and the community decides the order.
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-12">
        <Suspense fallback={<div aria-busy="true" className="h-[640px] rounded-2xl bg-muted motion-safe:animate-pulse" />}>
          <Form />
        </Suspense>
      </div>
    </main>
  );
}

async function Form() {
  const user = await getCurrentUser();
  if (!user) return <SignInRequired />;

  await connection();
  const today = startOfUtcDay(new Date());
  const tomorrow = addUtcDays(today, 1);
  const [topics, queue] = await Promise.all([getTopics(), launchQueue(today)]);
  const { weekday, day } = formatLaunchDay(queue.day);
  // Zero-based: the new launch sits right after the launches already on its day.
  const seat = queue.onDay;
  return (
    <>
      <p className="mb-8 text-sm text-muted-foreground">
        Submitting as <span className="font-medium text-foreground">{user.name}</span> ({user.email}). We&apos;ll
        use this email to contact you about the launch.
      </p>
      <SubmitForm
        topics={topics}
        minLaunchDate={toDayParam(tomorrow)}
        passAvailable={paymentMode() !== "off"}
        passPrice={formatPrice()}
        queue={{ launchDay: `${weekday}, ${day}`, ahead: queue.ahead, seat, dailyLimit: DAILY_LAUNCH_LIMIT }}
        aside={<HowItWorks />}
      />
    </>
  );
}

function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="rounded-2xl bg-muted/60 p-5 sm:p-6">
      <h2 id="how-heading" className="font-display text-lg font-bold">
        How launch day works
      </h2>
      <ol className="mt-4 grid gap-4">
        {[
          ["Take a seat", `Only ${DAILY_LAUNCH_LIMIT} products launch each day. Free launches take the next day with room.`],
          ["Go live", "Your launch appears at 00:00 UTC on its launch day."],
          ["Climb", "Visitors upvote through the day, and the best make the weekly leaderboard."],
        ].map(([title, body], i) => (
          <li key={title} className="flex gap-3">
            <span className="num grid size-6 shrink-0 place-items-center rounded-full bg-card text-xs font-medium ring-1 ring-border">
              {i + 1}
            </span>
            <span>
              <span className="block font-medium">{title}</span>
              <span className="text-sm text-muted-foreground">{body}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-5 border-t border-border pt-4">
        <p className="flex items-center gap-1.5 font-medium">
          <VerifiedBadge />
          Verified makers
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Launches from makers who confirm they own the product show this seal next to their name.
        </p>
      </div>
    </section>
  );
}

function SignInRequired() {
  return (
    <div className="max-w-xl rounded-2xl bg-card p-6 shadow-paper ring-1 ring-border sm:p-8">
      <h2 className="font-display text-3xl font-bold">Sign in to take a seat</h2>
      <p className="mt-3 text-muted-foreground">
        Launches are tied to a maker account, so we can reach you about your submission and you can reply to
        comments on launch day.
      </p>
      <div className="mt-6 flex flex-wrap gap-2.5">
        <Button asChild size="lg">
          <Link href="/signin?next=/submit">
            Sign in
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/signup?next=/submit">Create an account</Link>
        </Button>
      </div>
    </div>
  );
}
