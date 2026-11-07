import type { Metadata } from "next";
import Link from "next/link";
import { CheckIcon } from "@/components/icons";
import { PageBand, SubmitCallout } from "@/components/sections";
import { formatPrice, LAUNCH_PASS } from "@/lib/payments";

export const metadata: Metadata = {
  title: "Pricing | LaunchPad",
  description: "Launch for free, or pick your own launch day and get a featured spot with a Launch Pass.",
};

const plans = [
  {
    name: "Free launch",
    price: "Free",
    blurb: "Everything you need to put a product on the pad.",
    perks: [
      "A product page with your logo, screenshots and an optional video",
      "Ranked by upvotes on launch day",
      "Comments from the community",
      "Published right away",
      "Scheduled on the next open launch day",
    ],
    cta: "Submit for free",
  },
  {
    name: "Launch Pass",
    price: formatPrice(),
    blurb: "One payment per launch. For when the date matters.",
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
    "No. Rankings come only from community upvotes, for every launch. A Launch Pass buys speed, your choice of date and a clearly labeled featured spot, never votes or position.",
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
        description="Every product gets the same fair shot at the top. A Launch Pass gets you there faster, on your schedule."
      />
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-8">
        <div className="grid gap-8 md:grid-cols-2">
          {plans.map((plan) => (
            <section
              key={plan.name}
              aria-labelledby={`plan-${plan.name}`}
              className={`flex flex-col rounded-[24px] p-7 sm:p-8 ${
                plan.highlight
                  ? "medal-card medal-gold"
                  : "border-2 border-ink bg-paper shadow-[6px_6px_0_0_var(--ink)]"
              }`}
            >
              {plan.highlight && (
                <span className="medal-chip medal-chip-gold mb-4 w-fit rounded-lg px-2.5 py-0.5 text-sm font-bold">
                  Most popular with makers
                </span>
              )}
              <h2 id={`plan-${plan.name}`} className="font-display text-2xl font-extrabold">
                {plan.name}
              </h2>
              <p className="mt-1 font-display text-5xl font-extrabold tracking-tight">
                {plan.price}
                {plan.highlight && <span className="ml-2 text-base font-semibold opacity-70">per launch</span>}
              </p>
              <p className="mt-2 opacity-80">{plan.blurb}</p>
              <ul className="mt-6 grid flex-1 gap-2.5">
                {plan.perks.map((perk) => (
                  <li key={perk} className="flex gap-2.5">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-on-signal text-signal">
                      <CheckIcon className="size-3" />
                    </span>
                    {perk}
                  </li>
                ))}
              </ul>
              <Link
                href="/submit"
                className={`press mt-8 inline-flex h-13 items-center justify-center rounded-2xl border-2 border-on-signal py-3 text-lg font-bold shadow-[4px_4px_0_0_var(--pop)] ${
                  plan.highlight ? "bg-on-signal text-signal" : "bg-signal text-on-signal"
                }`}
              >
                {plan.cta}
              </Link>
            </section>
          ))}
        </div>

        <section aria-labelledby="faq-heading" className="mt-20">
          <h2 id="faq-heading" className="font-display text-3xl font-extrabold">
            Questions
          </h2>
          <dl className="mt-6 grid gap-4 md:grid-cols-2">
            {faqs.map(([q, a]) => (
              <div key={q} className="rounded-[18px] border-2 border-line bg-paper p-5">
                <dt className="font-display text-lg font-extrabold">{q}</dt>
                <dd className="mt-1.5 text-mist">{a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
      <SubmitCallout />
    </main>
  );
}
