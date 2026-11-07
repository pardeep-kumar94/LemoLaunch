import { db } from "@/lib/db";
import { markSubmissionPaid, paymentMode, verifyWebhook } from "@/lib/payments";

/** Dodo Payments webhook. Point Dodo at https://<your-domain>/api/webhooks/dodo. */
export async function POST(request: Request) {
  if (paymentMode() !== "dodo" || !process.env.DODO_PAYMENTS_WEBHOOK_KEY) {
    return new Response("Payments aren't configured", { status: 404 });
  }

  const body = await request.text();
  let event: ReturnType<typeof verifyWebhook>;
  try {
    event = verifyWebhook(body, request.headers);
  } catch {
    return new Response("Invalid signature", { status: 401 });
  }

  if (event.type === "payment.succeeded") {
    const submissionId = event.data.metadata?.submission_id;
    if (typeof submissionId === "string") {
      await markSubmissionPaid(submissionId, {
        paymentId: event.data.payment_id,
        amountCents: event.data.total_amount,
        currency: event.data.currency,
      });
    }
  } else if (event.type === "refund.succeeded") {
    await db.submission.updateMany({
      where: { paymentId: event.data.payment_id },
      data: { paymentStatus: "refunded" },
    });
  }

  return new Response("ok");
}
