"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { startBoost, type BoostState } from "@/app/boost/actions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { track } from "@/lib/analytics";
import { BOOST, BOOST_PLACEMENTS, boostPrice, formatMoney, PLACEMENT_INFO, type BoostPlacement } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const initialState: BoostState = { status: "idle" };

/** Where a placement sits in today's list, for the little preview. */
const previewRow: Record<BoostPlacement, number> = { top: 0, middle: 4, bottom: 7 };

export function BoostForm({
  productId,
  productName,
  startOptions,
  spotsToday,
  available,
}: {
  productId: string;
  productName: string;
  /** Days the boost can start on: `YYYY-MM-DD` and a label. */
  startOptions: { value: string; label: string }[];
  spotsToday: Record<BoostPlacement, number>;
  /** False when payments aren't configured. */
  available: boolean;
}) {
  const [state, formAction, pending] = useActionState(startBoost.bind(null, productId), initialState);
  const [placement, setPlacement] = useState<BoostPlacement>("middle");
  const [days, setDays] = useState(3);
  const [start, setStart] = useState(startOptions[0]?.value ?? "");
  const price = boostPrice(placement, days);

  return (
    <form
      action={formAction}
      onSubmit={() => track("boost_checkout_started", { placement, days, amount_cents: price.totalCents })}
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start"
    >
      <input type="hidden" name="placement" value={placement} />
      <input type="hidden" name="days" value={days} />
      <input type="hidden" name="startDate" value={start} />

      <div className="grid gap-8">
        <fieldset className="grid gap-3">
          <legend className="mb-3 font-display text-xl font-bold">Where it shows</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {BOOST_PLACEMENTS.map((p) => {
              const checked = p === placement;
              return (
                <label
                  key={p}
                  className={cn(
                    "relative flex cursor-pointer flex-col gap-2 rounded-2xl bg-card p-4 ring-1 transition-[box-shadow] has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                    checked ? "shadow-lift ring-2 ring-primary" : "shadow-paper ring-border hover:ring-input",
                  )}
                >
                  <input type="radio" name="placement-choice" value={p} checked={checked} onChange={() => setPlacement(p)} className="sr-only" />
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-display text-lg font-bold">{PLACEMENT_INFO[p].label}</span>
                    <span className="num text-sm">
                      {formatMoney(BOOST.perDayCents[p])}
                      <span className="text-muted-foreground">/day</span>
                    </span>
                  </span>
                  <span className="text-sm text-muted-foreground">{PLACEMENT_INFO[p].where}</span>
                  <span className="num mt-auto text-xs text-muted-foreground">
                    {spotsToday[p]} of {BOOST.spotsPerDay[p]} spots left today
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <div className="flex items-baseline justify-between">
              <label id="days-label" className="font-display text-xl font-bold">
                How long
              </label>
              <span className="num">
                {days} {days === 1 ? "day" : "days"}
              </span>
            </div>
            <Slider
              aria-labelledby="days-label"
              className="mt-5"
              min={1}
              max={BOOST.maxDays}
              step={1}
              value={[days]}
              onValueChange={([value]) => setDays(value)}
            />
            <div className="num mt-2.5 flex justify-between text-[11.5px] text-muted-foreground">
              {Array.from({ length: BOOST.maxDays }, (_, i) => (
                <span key={i}>{i + 1}</span>
              ))}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Longer boosts cost less per day: up to {BOOST.discountPercent[BOOST.maxDays]}% off at {BOOST.maxDays} days.
            </p>
          </div>
          <div>
            <label id="start-label" className="font-display text-xl font-bold">
              Starts
            </label>
            <Select value={start} onValueChange={setStart}>
              <SelectTrigger aria-labelledby="start-label" className="mt-4 h-10 w-full bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {startOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-3 text-sm text-muted-foreground">Boosts run from 00:00 to 23:59 UTC each day.</p>
          </div>
        </div>
      </div>

      <aside className="grid gap-4 lg:sticky lg:top-24">
        <div className="rounded-2xl bg-card p-5 shadow-paper ring-1 ring-border sm:p-6">
          <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-4">
            <dl className="grid content-start gap-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">
                  {days} × {formatMoney(BOOST.perDayCents[placement])}
                </dt>
                <dd className="num whitespace-nowrap">{formatMoney(price.subtotalCents)}</dd>
              </div>
              {price.discountCents > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{days}-day saving ({price.discountPercent}%)</dt>
                  <dd className="num whitespace-nowrap">−{formatMoney(price.discountCents)}</dd>
                </div>
              )}
              <div className="mt-1 flex justify-between gap-3 border-t border-border pt-3 font-semibold">
                <dt>Total</dt>
                <dd className="num text-lg">{formatMoney(price.totalCents)}</dd>
              </div>
            </dl>
            <div aria-hidden className="rounded-xl bg-background p-2.5 ring-1 ring-border">
              <p className="mb-1.5 text-[10.5px] text-muted-foreground">Today&apos;s list</p>
              {Array.from({ length: 8 }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "mt-1 block h-3 rounded-[4px]",
                    i === previewRow[placement] ? "bg-lemon shadow-[inset_0_0_0_1px_var(--lemon-deep)]" : "bg-muted",
                  )}
                />
              ))}
            </div>
          </div>
          <Button type="submit" size="lg" disabled={!available || pending || !start} className="mt-5 w-full">
            {pending ? "Opening checkout…" : available ? `Boost for ${formatMoney(price.totalCents)}` : "Boosts coming soon"}
            {!pending && available && <ArrowRight data-icon="inline-end" />}
          </Button>
          {state.status === "error" && (
            <p role="alert" className="mt-3 text-sm font-medium text-destructive">
              {state.error}
            </p>
          )}
        </div>
        <div className="rounded-2xl bg-accent p-5 text-sm ring-1 ring-[color-mix(in_oklab,var(--lemon-deep)_40%,var(--border))]">
          <p className="flex items-center gap-2 font-semibold">
            <Check className="size-4 text-leaf" strokeWidth={2.5} aria-hidden />
            Paying never buys rank
          </p>
          <p className="mt-1.5 text-accent-foreground">
            {productName} shows with a Promoted label in its boosted spot. Its place in the upvote ranking doesn&apos;t
            change.
          </p>
        </div>
      </aside>
    </form>
  );
}
