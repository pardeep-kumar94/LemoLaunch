import { randomUUID } from "node:crypto";
import DodoPayments from "dodopayments";
import { db } from "@/lib/db";
import { CURRENCY, FAST_TRACK } from "@/lib/pricing";
import { publishSubmission } from "@/lib/publish";

// Fast Track and Boost payments through Dodo Payments.
//
// Set DODO_PAYMENTS_API_KEY, DODO_PRODUCT_ID (a one-time product with "pay what you want" turned
// on; each checkout sets its own amount), DODO_PAYMENTS_WEBHOOK_KEY and DODO_PAYMENTS_ENVIRONMENT
// ("test_mode" or "live_mode"). Without them, local development uses a simulated checkout and
// production shows paid options as unavailable.

export type PaymentMode = "dodo" | "simulated" | "off";

export function paymentMode(): PaymentMode {
  if (process.env.DODO_PAYMENTS_API_KEY && process.env.DODO_PRODUCT_ID) return "dodo";
  if (process.env.NODE_ENV === "development") return "simulated";
  return "off";
}

let client: DodoPayments | null = null;
function dodo(): DodoPayments {
  client ??= new DodoPayments({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY,
    webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY ?? null,
    environment: process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode" ? "live_mode" : "test_mode",
  });
  return client;
}

type Customer = { email: string; name: string };

/** Opens a Dodo checkout for `amountCents` and returns its URL and session id. */
async function openCheckout({
  amountCents,
  customer,
  returnUrl,
  metadata,
}: {
  amountCents: number;
  customer: Customer;
  returnUrl: string;
  metadata: Record<string, string>;
}) {
  const session = await dodo().checkoutSessions.create({
    product_cart: [{ product_id: process.env.DODO_PRODUCT_ID!, quantity: 1, amount: amountCents }],
    customer: { email: customer.email, name: customer.name },
    return_url: returnUrl,
    metadata,
  });
  if (!session.checkout_url) throw new Error("Dodo didn't return a checkout link.");
  return { url: session.checkout_url, sessionId: session.session_id };
}

/** Starts the Fast Track checkout for a submission and returns the URL to send the maker to. */
export async function createFastTrackCheckout({
  submissionId,
  customer,
  origin,
}: {
  submissionId: string;
  customer: Customer;
  origin: string;
}): Promise<string> {
  const mode = paymentMode();
  if (mode === "off") throw new Error("Payments aren't configured.");
  if (mode === "simulated") {
    await db.submission.update({ where: { id: submissionId }, data: { checkoutSessionId: `sim_session_${randomUUID()}` } });
    return `/dev/checkout?submission=${submissionId}`;
  }
  const { url, sessionId } = await openCheckout({
    amountCents: FAST_TRACK.priceCents,
    customer,
    returnUrl: `${origin}/submit/payment?submission=${submissionId}`,
    metadata: { kind: "fast_track", submission_id: submissionId },
  });
  await db.submission.update({ where: { id: submissionId }, data: { checkoutSessionId: sessionId } });
  return url;
}

/** Starts the checkout for a boost and returns the URL to send the maker to. */
export async function createBoostCheckout({
  boostId,
  amountCents,
  customer,
  origin,
}: {
  boostId: string;
  amountCents: number;
  customer: Customer;
  origin: string;
}): Promise<string> {
  const mode = paymentMode();
  if (mode === "off") throw new Error("Payments aren't configured.");
  if (mode === "simulated") {
    await db.boost.update({ where: { id: boostId }, data: { checkoutSessionId: `sim_session_${randomUUID()}` } });
    return `/dev/checkout?boost=${boostId}`;
  }
  const { url, sessionId } = await openCheckout({
    amountCents,
    customer,
    returnUrl: `${origin}/boost/payment?boost=${boostId}`,
    metadata: { kind: "boost", boost_id: boostId },
  });
  await db.boost.update({ where: { id: boostId }, data: { checkoutSessionId: sessionId } });
  return url;
}

type Payment = { paymentId: string; amountCents?: number; currency?: string };

/** Records a successful Fast Track payment and publishes the launch. Safe to call more than once. */
export async function markSubmissionPaid(submissionId: string, payment: Payment) {
  await db.submission.updateMany({
    where: { id: submissionId, paymentStatus: "awaiting" },
    data: {
      status: "pending",
      paymentStatus: "paid",
      paymentId: payment.paymentId,
      amountCents: payment.amountCents ?? FAST_TRACK.priceCents,
      currency: payment.currency ?? CURRENCY,
      paidAt: new Date(),
    },
  });
  await publishSubmission(submissionId);
}

/** Records a successful boost payment, which switches the boost on. Safe to call more than once. */
export async function markBoostPaid(boostId: string, payment: Payment) {
  await db.boost.updateMany({
    where: { id: boostId, paymentStatus: "awaiting" },
    data: {
      paymentStatus: "paid",
      paymentId: payment.paymentId,
      ...(payment.currency ? { currency: payment.currency } : {}),
      paidAt: new Date(),
    },
  });
}

/** Asks Dodo whether a checkout was paid, for when the webhook hasn't arrived yet. */
async function paidCheckout(checkoutSessionId: string | null): Promise<Payment | null> {
  if (!checkoutSessionId || paymentMode() !== "dodo" || checkoutSessionId.startsWith("sim_")) return null;
  const session = await dodo().checkoutSessions.retrieve(checkoutSessionId);
  if (session.payment_status !== "succeeded" || !session.payment_id) return null;
  const payment = await dodo().payments.retrieve(session.payment_id);
  return { paymentId: payment.payment_id, amountCents: payment.total_amount, currency: payment.currency };
}

export async function syncCheckout(submissionId: string) {
  const submission = await db.submission.findUnique({
    where: { id: submissionId },
    select: { paymentStatus: true, checkoutSessionId: true },
  });
  if (submission?.paymentStatus !== "awaiting") return;
  const paid = await paidCheckout(submission.checkoutSessionId);
  if (paid) await markSubmissionPaid(submissionId, paid);
}

export async function syncBoostCheckout(boostId: string) {
  const boost = await db.boost.findUnique({ where: { id: boostId }, select: { paymentStatus: true, checkoutSessionId: true } });
  if (boost?.paymentStatus !== "awaiting") return;
  const paid = await paidCheckout(boost.checkoutSessionId);
  if (paid) await markBoostPaid(boostId, paid);
}

/** Refunds a paid Fast Track submission in full. Returns false if the refund couldn't be started. */
export async function refundSubmission(submissionId: string, reason: string): Promise<boolean> {
  const submission = await db.submission.findUnique({
    where: { id: submissionId },
    select: { paymentStatus: true, paymentId: true },
  });
  if (submission?.paymentStatus !== "paid" || !submission.paymentId) return true;

  try {
    if (!submission.paymentId.startsWith("sim_")) {
      await dodo().refunds.create({ payment_id: submission.paymentId, reason });
    }
    await db.submission.update({ where: { id: submissionId }, data: { paymentStatus: "refunded" } });
    return true;
  } catch (error) {
    console.error("Refund failed", submissionId, error);
    await db.submission.update({ where: { id: submissionId }, data: { paymentStatus: "refund_failed" } });
    return false;
  }
}

/** Verifies a Dodo webhook's signature and returns the event. Throws if it isn't genuine. */
export function verifyWebhook(body: string, headers: Headers) {
  return dodo().webhooks.unwrap(body, { headers: Object.fromEntries(headers.entries()) });
}

/** A simulated payment for local development only. */
export async function simulatePayment(target: { submissionId: string } | { boostId: string }) {
  if (paymentMode() !== "simulated") throw new Error("Simulated payments are only for local development.");
  const payment = { paymentId: `sim_pay_${randomUUID()}` };
  if ("submissionId" in target) await markSubmissionPaid(target.submissionId, payment);
  else await markBoostPaid(target.boostId, payment);
}
