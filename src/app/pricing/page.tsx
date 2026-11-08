import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { ArrowRight, Check, Scale, Zap } from "lucide-react";
import { PageBand, SubmitCallout } from "@/components/sections";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice, LAUNCH_PASS } from "@/lib/payments";
import { DAILY_LAUNCH_LIMIT } from "@/lib/publish";
import { cn } from "@/lib/utils";

export const metadata: Metadata = pageMetadata({
  title: "Pricing: launch free or get a Launch Pass",
  description: `Launch your product on LemoLaunch for free, or pick your own launch day and get a featured spot with a ${formatPrice()} Launch Pass. Paying never buys upvotes or rank.`,
  path: "/pricing",
});

const plans = [
  {
    name: "Free launch",
    price: "$0",
    unit: "forever",
    blurb: "Everything you need to put a product in front of the community.",
    perks: [
      "A product page with your logo, screenshots and an optional video",
      "Ranked by upvotes on launch day",
      "Comments and reviews from the community",
      `Takes the next open seat: up to ${DAILY_LAUNCH_LIMIT} launches go live each day`,
    ],
    cta: "Submit for free",
    highlight: false,
  },
  {
    name: "Launch Pass",
    price: formatPrice(),
    unit: "per launch",
    blurb: "One payment per launch, for when the date matters.",
    perks: [
      "Everything in the free launch",
      "Pick your own launch day",
      "Featured card on launch day",
      `${LAUNCH_PASS.featuredDays} days in the homepage's Featured launches panel`,
      "Cancel before launch for a full refund",
    ],
    cta: "Get a Launch Pass",
    highlight: true,
  },
];

const faqs: [string, string][] = [
  [
    "Does paying help my product rank higher?",
    "No. Rankings come only from community upvotes, for every launch. A Launch Pass buys your choice of date and a clearly labeled featured spot, never votes or position.",
  ],
  [
    "Can I cancel a launch?",
    "Yes, any time before it goes live, from My products. A Launch Pass is refunded in full when you cancel.",
  ],
  [
    "How do I pay?",
    "Securely through Dodo Payments, which handles cards and local payment methods and sends your receipt.",
  ],
  [
    "Can I upgrade a free submission?",
    "Submit it again with a Launch Pass and withdraw the free one. Upgrading in place is coming later.",
  ],
];

export default function PricingPage() {
  return (
    <main>
      <PageBand
        title="Launch your way"
        description="Every product gets the same fair shot at the top. A Launch Pass lets you choose the day."
      />
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-8 sm:py-14">
        <div className="grid gap-5 md:grid-cols-2">
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
                {plan.highlight && (
                  <Badge variant="lemon">
                    <Zap aria-hidden />
                    Pick your day
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
                <Link href="/submit">
                  {plan.cta}
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
