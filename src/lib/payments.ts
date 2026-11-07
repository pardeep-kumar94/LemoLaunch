import { randomUUID } from "node:crypto";
import DodoPayments from "dodopayments";
import { db } from "@/lib/db";
import { FEATURED_DAYS, publishSubmission } from "@/lib/publish";

// Launch Pass payments through Dodo Payments.
//
// Set DODO_PAYMENTS_API_KEY, DODO_LAUNCH_PASS_PRODUCT_ID (a one-time product priced at the
// Launch Pass price), DODO_PAYMENTS_WEBHOOK_KEY and DODO_PAYMENTS_ENVIRONMENT
// ("test_mode" or "live_mode"). Without them, local development uses a simulated checkout
// and production hides the Launch Pass.

export const LAUNCH_PASS = {
  /** Shown on the site. Keep it equal to the Dodo product's price. */
  priceCents: Number(process.env.LAUNCH_PASS_PRICE_CENTS ?? 1900),
  currency: (process.env.LAUNCH_PASS_CURRENCY ?? "USD").toUpperCase(),
  /** Days in the "Featured launches" panel, counting launch day. */
  featuredDays: FEATURED_DAYS,
};

export type PaymentMode = "dodo" | "simulated" | "off";

export function paymentMode(): PaymentMode {
  if (process.env.DODO_PAYMENTS_API_KEY && process.env.DODO_LAUNCH_PASS_PRODUCT_ID) return "dodo";
  if (process.env.NODE_ENV === "development") return "simulated";
  return "off";
}

export function formatPrice(cents = LAUNCH_PASS.priceCents, currency = LAUNCH_PASS.currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
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

/** Starts a Launch Pass checkout for a submission and returns the URL to send the maker to. */
export async function createLaunchPassCheckout({
  submissionId,
  customer,
  origin,
}: {
  submissionId: string;
  customer: { email: string; name: string };
  origin: string;
}): Promise<string> {
  const mode = paymentMode();
  if (mode === "off") throw new Error("Payments aren't configured.");

  if (mode === "simulated") {
    await db.submission.update({
      where: { id: submissionId },
      data: { checkoutSessionId: `sim_session_${randomUUID()}` },
    });
    return `/dev/checkout?submission=${submissionId}`;
  }

  const session = await dodo().checkoutSessions.create({
    product_cart: [{ product_id: process.env.DODO_LAUNCH_PASS_PRODUCT_ID!, quantity: 1 }],
    customer: { email: customer.email, name: customer.name },
    return_url: `${origin}/submit/payment?submission=${submissionId}`,
    metadata: { submission_id: submissionId },
  });
  if (!session.checkout_url) throw new Error("Dodo didn't return a checkout link.");
  await db.submission.update({
    where: { id: submissionId },
    data: { checkoutSessionId: session.session_id },
  });
  return session.checkout_url;
}

/** Records a successful payment and publishes the launch. Safe to call more than once. */
export async function markSubmissionPaid(
  submissionId: string,
  payment: { paymentId: string; amountCents?: number; currency?: string },
) {
  await db.submission.updateMany({
    where: { id: submissionId, paymentStatus: "awaiting" },
    data: {
      status: "pending",
      paymentStatus: "paid",
      paymentId: payment.paymentId,
      amountCents: payment.amountCents ?? LAUNCH_PASS.priceCents,
      currency: payment.currency ?? LAUNCH_PASS.currency,
      paidAt: new Date(),
    },
  });
  await publishSubmission(submissionId);
}

/** Asks Dodo whether a submission's checkout was paid, for when the webhook hasn't arrived yet. */
export async function syncCheckout(submissionId: string) {
  const submission = await db.submission.findUnique({
    where: { id: submissionId },
    select: { paymentStatus: true, checkoutSessionId: true },
  });
  if (!submission?.checkoutSessionId || submission.paymentStatus !== "awaiting") return;
  if (paymentMode() !== "dodo" || submission.checkoutSessionId.startsWith("sim_")) return;

  const session = await dodo().checkoutSessions.retrieve(submission.checkoutSessionId);
  if (session.payment_status === "succeeded" && session.payment_id) {
    const payment = await dodo().payments.retrieve(session.payment_id);
    await markSubmissionPaid(submissionId, {
      paymentId: payment.payment_id,
      amountCents: payment.total_amount,
      currency: payment.currency,
    });
  }
}

/** Refunds a paid submission in full. Returns false if the refund couldn't be started. */
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
export async function simulatePayment(submissionId: string) {
  if (paymentMode() !== "simulated") throw new Error("Simulated payments are only for local development.");
  await markSubmissionPaid(submissionId, { paymentId: `sim_pay_${randomUUID()}` });
}
