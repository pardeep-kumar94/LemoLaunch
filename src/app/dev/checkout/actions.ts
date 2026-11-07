"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { paymentMode, simulatePayment } from "@/lib/payments";

/** Local development only: pretend the Launch Pass payment succeeded. */
export async function completeSimulatedPayment(submissionId: string) {
  if (paymentMode() !== "simulated") redirect("/");
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/profile");
  const submission = await db.submission.findFirst({
    where: { id: submissionId, userId: user.id, paymentStatus: "awaiting" },
    select: { id: true },
  });
  if (submission) await simulatePayment(submission.id);
  redirect(`/submit/payment?submission=${submissionId}`);
}
