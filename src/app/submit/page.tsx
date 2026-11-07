import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { VerifiedBadge } from "@/components/badges";
import { PageBand } from "@/components/sections";
import { SubmitForm } from "@/components/submit-form";
import { addUtcDays, startOfUtcDay, toDayParam } from "@/lib/dates";
import { getCurrentUser } from "@/lib/auth";
import { getTopics } from "@/lib/launches";
import { formatPrice, paymentMode } from "@/lib/payments";

export const metadata: Metadata = { title: "Submit a launch | LemoLaunch" };

export default function SubmitPage() {
  return (
    <main>
      <PageBand
        title="Submit a launch"
        description="Add your product, pick a plan and it's scheduled straight away."
      />
      <div className="mx-auto grid max-w-6xl gap-14 px-4 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <Suspense fallback={<div aria-busy="true" className="h-[560px] rounded-2xl bg-line motion-safe:animate-pulse" />}>
          <Form />
        </Suspense>
        <aside className="flex flex-col gap-8">
          <section aria-labelledby="how-heading">
            <h2 id="how-heading" className="font-display text-xl font-extrabold">
              How launch day works
            </h2>
            <ol className="mt-4 flex flex-col gap-4">
              {[
                ["Submit", "Add the basics, your logo and screenshots, plus a short video if you have one."],
                ["Scheduled", "Free launches take the next open day. With a Launch Pass, you pick the day."],
                ["Go live", "Your launch appears at 00:00 UTC on its launch day."],
                ["Climb", "Visitors upvote through the day; the top three get medals."],
              ].map(([title, body], i) => (
                <li key={title} className="flex gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-signal font-display text-sm font-bold text-on-signal">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block font-semibold">{title}</span>
                    <span className="text-sm text-mist">{body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
          <section aria-labelledby="verified-heading" className="border-t-2 border-line pt-8">
            <h2 id="verified-heading" className="flex items-center gap-2 font-display text-xl font-extrabold">
              <VerifiedBadge className="size-5" />
              Verified makers
            </h2>
            <p className="mt-2 text-sm text-mist">
              Launches from makers who confirm they own the product show this seal next to
              their name.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}

async function Form() {
  const user = await getCurrentUser();
  if (!user) return <SignInRequired />;

  await connection();
  const tomorrow = addUtcDays(startOfUtcDay(new Date()), 1);
  const topics = await getTopics();
  return (
    <div>
      <p className="mb-6 text-sm text-mist">
        Submitting as <span className="font-semibold text-ink">{user.name}</span> ({user.email}). We&apos;ll
        use this email to contact you about the launch.
      </p>
      <SubmitForm
        topics={topics}
        minLaunchDate={toDayParam(tomorrow)}
        passAvailable={paymentMode() !== "off"}
        passPrice={formatPrice()}
      />
    </div>
  );
}

function SignInRequired() {
  return (
    <div className="self-start rounded-[22px] border-2 border-ink bg-paper p-8 shadow-[6px_6px_0_0_var(--pop)]">
      <h2 className="font-display text-2xl font-extrabold">Sign in to submit a launch</h2>
      <p className="mt-2 max-w-md text-mist">
        Launches are tied to a maker account, so we can reach you about your submission and
        you can reply to comments on launch day.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/signin?next=/submit"
          className="press inline-flex h-12 items-center rounded-xl border-2 border-on-signal bg-signal px-6 font-bold text-on-signal shadow-[4px_4px_0_0_var(--pop)]"
        >
          Sign in
        </Link>
        <Link
          href="/signup?next=/submit"
          className="inline-flex h-12 items-center rounded-xl border-2 border-ink bg-paper px-6 font-bold"
        >
          Create an account
        </Link>
      </div>
    </div>
  );
}
