"use server";

import { refresh } from "next/cache";
import { Prisma } from "@prisma/client";
import { currentSessionId, getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { startOfUtcDay } from "@/lib/dates";
import { refundSubmission } from "@/lib/payments";
import { checkUpload, deleteUpload, storeUpload } from "@/lib/uploads";

export type FormState = {
  status: "idle" | "saved" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

const signedOut: FormState = { status: "error", message: "Your session has ended. Sign in again." };

const text = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

/** Saves name, headline, website and profile photo. */
export async function updateProfile(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return signedOut;

  const name = text(formData, "name");
  const headline = text(formData, "headline");
  const websiteUrl = text(formData, "websiteUrl");
  const removeAvatar = formData.get("removeAvatar") === "on";
  const avatarFile = formData.get("avatar");

  const fieldErrors: Record<string, string> = {};
  if (!name || name.length > 60) fieldErrors.name = "Enter your name (60 characters or fewer).";
  if (headline.length > 120) fieldErrors.headline = "Keep your headline to 120 characters.";
  if (websiteUrl) {
    try {
      const url = new URL(websiteUrl);
      if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
    } catch {
      fieldErrors.websiteUrl = "Enter the full address, starting with https://";
    }
  }

  let avatar: Awaited<ReturnType<typeof checkUpload>> | null = null;
  if (!removeAvatar && avatarFile instanceof File && avatarFile.size > 0) {
    avatar = await checkUpload(avatarFile, "image");
    if (!avatar.ok) fieldErrors.avatar = avatar.error;
  }
  if (Object.keys(fieldErrors).length > 0) return { status: "error", fieldErrors };

  let avatarUrl = user.avatarUrl;
  if (avatar?.ok) avatarUrl = await storeUpload(avatar.upload);
  else if (removeAvatar) avatarUrl = null;

  await db.user.update({
    where: { id: user.id },
    data: { name, headline: headline || null, websiteUrl: websiteUrl || null, avatarUrl },
  });
  if (avatarUrl !== user.avatarUrl) await deleteUpload(user.avatarUrl);

  refresh();
  return { status: "saved", message: "Profile saved." };
}

/** Changes the sign-in email after confirming the current password. */
export async function changeEmail(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return signedOut;

  const email = text(formData, "email").toLowerCase();
  const password = formData.get("currentPassword");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { status: "error", fieldErrors: { email: "Enter an email address like name@example.com." } };
  }
  if (email === user.email) {
    return { status: "error", fieldErrors: { email: "That's already your email address." } };
  }

  const account = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!account || typeof password !== "string" || !(await verifyPassword(password, account.passwordHash))) {
    return { status: "error", fieldErrors: { currentPassword: "That password isn't right." } };
  }

  try {
    await db.user.update({ where: { id: user.id }, data: { email } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { status: "error", fieldErrors: { email: "Another account already uses this email." } };
    }
    throw error;
  }

  refresh();
  return { status: "saved", message: `Your email is now ${email}.` };
}

/** Changes the password and signs out every other browser. */
export async function changePassword(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return signedOut;

  const current = formData.get("currentPassword");
  const next = formData.get("newPassword");
  const confirm = formData.get("confirmPassword");
  if (typeof next !== "string" || next.length < 8 || next.length > 200) {
    return { status: "error", fieldErrors: { newPassword: "Use at least 8 characters." } };
  }
  if (next !== confirm) {
    return { status: "error", fieldErrors: { confirmPassword: "The two passwords don't match." } };
  }

  const account = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!account || typeof current !== "string" || !(await verifyPassword(current, account.passwordHash))) {
    return { status: "error", fieldErrors: { currentPassword: "That password isn't right." } };
  }

  const keep = await currentSessionId();
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } }),
    db.session.deleteMany({ where: { userId: user.id, NOT: { id: keep ?? "" } } }),
  ]);
  return { status: "saved", message: "Password changed. You've been signed out everywhere else." };
}

/** Deletes one of the signed-in user's unpaid Launch Pass submissions. */
export async function withdrawSubmission(submissionId: string): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return signedOut;
  if (typeof submissionId !== "string") return { status: "error", message: "That launch couldn't be found." };

  const submission = await db.submission.findFirst({
    where: { id: submissionId, userId: user.id, status: "awaiting_payment" },
    select: { id: true, logoUrl: true, galleryUrls: true, videoUrl: true },
  });
  if (!submission) return { status: "error", message: "That launch couldn't be found." };

  await db.submission.delete({ where: { id: submission.id } });
  await deleteFiles([submission.logoUrl, submission.videoUrl, ...submission.galleryUrls]);
  refresh();
  return { status: "saved", message: "Deleted." };
}

/** Cancels one of the signed-in user's launches before it goes live, refunding a Launch Pass. */
export async function cancelLaunch(productId: string): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return signedOut;
  if (typeof productId !== "string") return { status: "error", message: "That launch couldn't be found." };

  const product = await db.product.findFirst({
    where: { id: productId, makerId: user.id, launchDate: { gt: startOfUtcDay(new Date()) } },
    select: {
      id: true,
      logoUrl: true,
      galleryUrls: true,
      videoUrl: true,
      submission: { select: { id: true, paymentStatus: true } },
    },
  });
  if (!product) return { status: "error", message: "Only launches that haven't gone live yet can be cancelled." };

  if (product.submission?.paymentStatus === "paid") {
    const refunded = await refundSubmission(product.submission.id, "Launch cancelled by the maker");
    if (!refunded) {
      return { status: "error", message: "We couldn't start your refund, so the launch is still scheduled. Try again shortly." };
    }
  }

  await db.$transaction([
    ...(product.submission ? [db.submission.delete({ where: { id: product.submission.id } })] : []),
    db.product.delete({ where: { id: product.id } }),
  ]);
  await deleteFiles([product.logoUrl, product.videoUrl, ...product.galleryUrls]);
  refresh();
  return { status: "saved", message: "Launch cancelled." };
}

async function deleteFiles(urls: (string | null)[]) {
  await Promise.all(urls.map((url) => deleteUpload(url)));
}
