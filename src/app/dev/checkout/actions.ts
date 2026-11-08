"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { paymentMode, simulatePayment } from "@/lib/payments";

/** Local development only: pretend a Fast Track payment succeeded. */
export async function completeSimulatedPayment(submissionId: string) {
  if (paymentMode() !== "simulated") redirect("/");
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/profile");
  const submission = await db.submission.findFirst({
    where: { id: submissionId, userId: user.id, paymentStatus: "awaiting" },
    select: { id: true },
  });
  if (submission) await simulatePayment({ submissionId: submission.id });
  redirect(`/submit/payment?submission=${submissionId}`);
}

/** Local development only: pretend a boost payment succeeded. */
export async function completeSimulatedBoostPayment(boostId: string) {
  if (paymentMode() !== "simulated") redirect("/");
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/profile");
  const boost = await db.boost.findFirst({
    where: { id: boostId, userId: user.id, paymentStatus: "awaiting" },
    select: { id: true },
  });
  if (boost) await simulatePayment({ boostId: boost.id });
  redirect(`/boost/payment?boost=${boostId}`);
}
