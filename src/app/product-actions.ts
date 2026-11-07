"use server";

import { refresh } from "next/cache";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { startOfUtcDay } from "@/lib/dates";
import { isUpcoming } from "@/lib/launches";
import { REPORT_REASONS } from "@/lib/product-page";

export type ReviewState = { status: "idle" | "saved" } | { status: "error"; error: string };

/** Adds the signed-in user's review of a launched product, or updates the one they left. */
export async function saveReview(
  productId: string,
  _previous: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", error: "Sign in to leave a review." };

  const rating = Number(formData.get("rating"));
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { status: "error", error: "Choose a rating from 1 to 5 stars." };
  }
  const raw = formData.get("body");
  const body = typeof raw === "string" ? raw.trim() : "";
  if (body.length > 1000) return { status: "error", error: "Keep reviews to 1,000 characters." };

  const product =
    typeof productId === "string" && productId.length <= 64
      ? await db.product.findUnique({ where: { id: productId }, select: { id: true, makerId: true, launchDate: true } })
      : null;
  if (!product) return { status: "error", error: "That product couldn't be found." };
  if (product.makerId === user.id) return { status: "error", error: "You can't review your own product." };
  if (isUpcoming(product.launchDate, startOfUtcDay(new Date()))) {
    return { status: "error", error: "Reviews open on launch day." };
  }

  await db.review.upsert({
    where: { productId_userId: { productId: product.id, userId: user.id } },
    create: { productId: product.id, userId: user.id, rating, body },
    update: { rating, body },
  });
  refresh();
  return { status: "saved" };
}

export type ReportState = { status: "idle" | "sent" } | { status: "error"; error: string };

/** Records a report about a product. Signed-out visitors can report too. */
export async function reportProduct(
  productId: string,
  _previous: ReportState,
  formData: FormData,
): Promise<ReportState> {
  const reason = formData.get("reason");
  if (typeof reason !== "string" || !Object.hasOwn(REPORT_REASONS, reason)) {
    return { status: "error", error: "Choose what's wrong with this product." };
  }
  const raw = formData.get("details");
  const details = typeof raw === "string" ? raw.trim() : "";
  if (details.length > 500) return { status: "error", error: "Keep details to 500 characters." };

  const product =
    typeof productId === "string" && productId.length <= 64
      ? await db.product.findUnique({ where: { id: productId }, select: { id: true } })
      : null;
  if (!product) return { status: "error", error: "That product couldn't be found." };

  const user = await getCurrentUser();
  await db.report.create({ data: { productId: product.id, userId: user?.id ?? null, reason, details } });
  return { status: "sent" };
}

export type FollowResult = { ok: true; following: boolean } | { ok: false; error: string };

/** Follows a maker, or unfollows them if already following. */
export async function toggleFollow(makerId: string): Promise<FollowResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to follow makers." };
  if (typeof makerId !== "string" || makerId.length > 64) return { ok: false, error: "That maker couldn't be found." };
  if (makerId === user.id) return { ok: false, error: "You can't follow yourself." };

  const maker = await db.user.findUnique({ where: { id: makerId }, select: { id: true } });
  if (!maker) return { ok: false, error: "That maker couldn't be found." };

  const key = { followerId_makerId: { followerId: user.id, makerId } };
  const existing = await db.follow.findUnique({ where: key, select: { makerId: true } });
  try {
    if (existing) await db.follow.delete({ where: key });
    else await db.follow.create({ data: { followerId: user.id, makerId } });
  } catch (error) {
    // A double-click can race: the follow already exists or is already gone.
    const raced =
      error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2002" || error.code === "P2025");
    if (!raced) throw error;
  }
  refresh();
  return { ok: true, following: !existing };
}

/** Marks every notification read, when the bell is opened. */
export async function markNotificationsSeen(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await db.user.update({ where: { id: user.id }, data: { notificationsSeenAt: new Date() } });
  refresh();
}
