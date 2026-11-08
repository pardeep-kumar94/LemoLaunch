"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { boostSpotsLeft } from "@/lib/boost";
import { db } from "@/lib/db";
import { addUtcDays, formatLaunchDay, parseDayParam, startOfUtcDay } from "@/lib/dates";
import { siteOrigin } from "@/lib/origin";
import { createBoostCheckout, paymentMode } from "@/lib/payments";
import { BOOST, boostPrice, isBoostPlacement, PLACEMENT_INFO } from "@/lib/pricing";

export type BoostState = { status: "idle" } | { status: "error"; error: string };

/** Saves a boost for one of the maker's products and sends them to checkout. */
export async function startBoost(productId: string, _previous: BoostState, formData: FormData): Promise<BoostState> {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/profile");
  if (paymentMode() === "off") return { status: "error", error: "Boosts aren't available right now." };

  const product = await db.product.findFirst({
    where: { id: productId, makerId: user.id },
    select: { id: true, launchDate: true },
  });
  if (!product) return { status: "error", error: "That launch couldn't be found." };

  const placement = formData.get("placement");
  const days = Number(formData.get("days"));
  const start = parseDayParam(formData.get("startDate"));
  if (!isBoostPlacement(placement)) return { status: "error", error: "Choose where the boost shows." };
  if (!Number.isInteger(days) || days < 1 || days > BOOST.maxDays) {
    return { status: "error", error: `Choose 1 to ${BOOST.maxDays} days.` };
  }
  const today = startOfUtcDay(new Date());
  const earliest = product.launchDate > today ? product.launchDate : today;
  if (!start || start < earliest || start >= addUtcDays(today, BOOST.startWithinDays)) {
    return { status: "error", error: "Pick a start day from your launch day onwards, within the next two weeks." };
  }

  const left = await boostSpotsLeft(placement, start, days);
  const full = [...left.entries()].find(([, n]) => n === 0);
  if (full) {
    const day = formatLaunchDay(new Date(`${full[0]}T00:00:00Z`));
    return {
      status: "error",
      error: `${PLACEMENT_INFO[placement].label} spots are sold out on ${day.weekday}, ${day.day}. Try another placement or start day.`,
    };
  }

  const { totalCents } = boostPrice(placement, days);
  const boost = await db.boost.create({
    data: {
      productId: product.id,
      userId: user.id,
      placement,
      startDate: start,
      endDate: addUtcDays(start, days - 1),
      days,
      amountCents: totalCents,
    },
    select: { id: true },
  });
  const checkoutUrl = await createBoostCheckout({
    boostId: boost.id,
    amountCents: totalCents,
    customer: { email: user.email, name: user.name },
    origin: await siteOrigin(),
  });
  redirect(checkoutUrl);
}
