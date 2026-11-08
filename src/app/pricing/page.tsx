import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { ArrowRight, Check, Scale, Zap } from "lucide-react";
import { PageBand, SubmitCallout } from "@/components/sections";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BOOST, BOOST_PLACEMENTS, boostPrice, FAST_TRACK, formatMoney, PLACEMENT_INFO } from "@/lib/pricing";
import { DAILY_LAUNCH_LIMIT } from "@/lib/publish";
import { cn } from "@/lib/utils";

export const metadata: Metadata = pageMetadata({
  title: "Pricing: launch free, Fast Track or Boost",
  description: `Launch your product on LemoLaunch for free, skip the queue with ${formatMoney(FAST_TRACK.priceCents)} Fast Track, or Boost it into a Promoted spot from ${formatMoney(BOOST.perDayCents.bottom)} a day. Paying never buys upvotes or rank.`,
  path: "/pricing",
});

const plans = [
  {
    name: "Free",
    price: "$0",
    unit: "forever",
    blurb: "Join the queue and take the next open seat.",
    perks: [
      "A product page with your logo, screenshots and an optional video",
      `Goes live at 00:00 UTC on the next day with a free seat (${DAILY_LAUNCH_LIMIT} a day)`,
      "Ranked by upvotes, with comments and reviews from the community",
      "A \"Launched on LemoLaunch\" badge for your site",
    ],
    cta: { label: "Submit for free", href: "/submit" },
    badge: null,
    highlight: false,
  },
  {
    name: "Fast Track",
    price: formatMoney(FAST_TRACK.priceCents),
    unit: "per launch",
    blurb: "Skip the queue and launch at the hour you pick.",
    perks: [
      "Everything in Free",
      `Pick a ${FAST_TRACK.slotHours}-hour slot, today or in the next ${FAST_TRACK.daysAhead - 1} days`,
      `Pinned to the top of the day for ${FAST_TRACK.pinnedHours} hours, with a Fast Track label`,
      "Doesn't wait for a free seat",
      "Cancel before it goes live for a full refund",
    ],
    cta: { label: "Fast Track a launch", href: "/submit" },
    badge: "Skip the queue",
    highlight: true,
  },
  {
    name: "Boost",
    price: formatMoney(BOOST.perDayCents.bottom),
    unit: "a day, from",
    blurb: "A Promoted spot on the homepage, for any launch you've listed.",
    perks: [
      `1 to ${BOOST.maxDays} days, with up to ${BOOST.discountPercent[BOOST.maxDays]}% off longer boosts`,
      "Top, Middle or Bottom of today's list",
      "Limited spots each day, so every one gets seen",
      "Shown with a clear Promoted label",
    ],
    cta: { label: "Boost from My products", href: "/profile" },
    badge: null,
    highlight: false,
  },
];

const faqs: [string, string][] = [
  [
    "Does paying help my product rank higher?",
    "No. Rankings come only from community upvotes, for every launch. Fast Track and Boost change when and where you're seen, always with a clear label, never your votes or position.",
  ],
  [
    "What happens if my Fast Track slot passes before I pay?",
    "Your launch takes the next free slot after your payment goes through, and keeps its 2 hours at the top.",
  ],
  [
    "Can I cancel?",
    "Yes, any launch can be cancelled before it goes live, from My products. Fast Track is refunded in full when you cancel.",
  ],
  [
    "When can I boost?",
    "Any time after you've listed a launch: open My products and choose Boost. A boost can start on launch day or any day in the next two weeks.",
  ],
  [
    "How do I pay?",
    "Securely through Dodo Payments, which handles cards and local payment methods and sends your receipt.",
  ],
];

export default function PricingPage() {
  return (
    <main>
      <PageBand
        title="Launch your way"
        description="Every product gets the same fair shot at the top. Fast Track picks your hour; Boost gets you seen for longer."
      />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8 sm:py-14">
        <div className="grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <section
              key={plan.name}
              aria-labelledby={`plan-${plan.name}`}
              className={cn(
                "flex flex-col rounded-2xl p-6 sm:p-8",
                plan.highlight
                  ? "bg-card shadow-lift ring-2 ring-primary"
                  : "bg-card shadow-paper ring-1 ring-border",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <h2 id={`plan-${plan.name}`} className="font-display text-2xl font-bold">
                  {plan.name}
                </h2>
                {plan.badge && (
                  <Badge variant="lemon">
                    <Zap aria-hidden />
                    {plan.badge}
                  </Badge>
                )}
              </div>
              <p className="mt-4 flex items-baseline gap-2">
                <span className="num text-5xl font-medium tracking-[-0.03em]">{plan.price}</span>
                <span className="text-muted-foreground">{plan.unit}</span>
              </p>
              <p className="mt-2 text-muted-foreground">{plan.blurb}</p>
              <ul className="mt-6 grid flex-1 content-start gap-2.5 border-t border-dashed border-input pt-6">
                {plan.perks.map((perk) => (
                  <li key={perk} className="flex gap-2.5">
                    <span
                      aria-hidden
                      className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground"
                    >
                      <Check className="size-3.5" strokeWidth={2.5} />
                    </span>
                    {perk}
                  </li>
                ))}
              </ul>
              <Button asChild size="lg" variant={plan.highlight ? "default" : "outline"} className="mt-8 w-full">
                <Link href={plan.cta.href}>
                  {plan.cta.label}
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            </section>
          ))}
        </div>

        <div className="mt-5 flex gap-4 rounded-2xl bg-accent p-5 ring-1 ring-[color-mix(in_oklab,var(--lemon-deep)_40%,var(--border))] sm:p-6">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-card text-accent-foreground ring-1 ring-border">
            <Scale className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-semibold">Paying never buys rank</h2>
            <p className="mt-1 text-sm text-accent-foreground">
              Paid launches change when and where you&apos;re seen, always with a clear label. Your position in the
              ranking comes only from upvotes.
            </p>
          </div>
        </div>

        <section aria-labelledby="boost-heading" className="mt-16">
          <h2 id="boost-heading" className="font-display text-[26px] font-bold">
            Boost prices
          </h2>
          <p className="mt-1 text-muted-foreground">Total for the whole boost. Longer boosts cost less per day.</p>
          <div className="mt-5 overflow-x-auto rounded-2xl bg-card shadow-paper ring-1 ring-border">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Placement</th>
                  {Array.from({ length: BOOST.maxDays }, (_, i) => (
                    <th key={i} className="px-3 py-3 text-right font-medium">
                      {i + 1} {i === 0 ? "day" : "days"}
                      {BOOST.discountPercent[i + 1] > 0 && (
                        <span className="num block text-[11px] font-normal">−{BOOST.discountPercent[i + 1]}%</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BOOST_PLACEMENTS.map((p) => (
                  <tr key={p} className="border-b border-border last:border-0">
                    <th scope="row" className="px-5 py-3.5 text-left font-normal">
                      <span className="block font-semibold">{PLACEMENT_INFO[p].label}</span>
                      <span className="text-[12.5px] text-muted-foreground">
                        {PLACEMENT_INFO[p].where} · {BOOST.spotsPerDay[p]} spots a day
                      </span>
                    </th>
                    {Array.from({ length: BOOST.maxDays }, (_, i) => (
                      <td key={i} className="num px-3 py-3.5 text-right">
                        {formatMoney(boostPrice(p, i + 1).totalCents)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="faq-heading" className="mt-16">
          <h2 id="faq-heading" className="font-display text-[26px] font-bold">
            Questions
          </h2>
          <dl className="mt-5 grid gap-x-10 md:grid-cols-2">
            {faqs.map(([q, a]) => (
              <div key={q} className="border-t border-border py-5">
                <dt className="font-semibold">{q}</dt>
                <dd className="mt-1.5 text-muted-foreground">{a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
      <SubmitCallout />
    </main>
  );
}
