"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { siteOrigin } from "@/lib/origin";
import { formatLaunchDay, parseDayParam, startOfUtcDay } from "@/lib/dates";
import { getCurrentUser } from "@/lib/auth";
import { isUpcoming } from "@/lib/launches";
import { createLaunchPassCheckout, paymentMode } from "@/lib/payments";
import { checkPlatformLink, isPlatform, sortPlatforms } from "@/lib/platforms";
import { publishSubmission } from "@/lib/publish";
import { checkUpload, storeUpload, toEmbedUrl } from "@/lib/uploads";
import { ensureVisitorId } from "@/lib/visitor";

export type VoteResult = { ok: true } | { ok: false; error: string };

/** Adds the visitor's upvote to a launched product, or removes it if already there. */
export async function toggleVote(productId: string): Promise<VoteResult> {
  if (typeof productId !== "string" || productId.length > 64) {
    return { ok: false, error: "That product couldn't be found." };
  }

  const product = await db.product.findUnique({
    where: { id: productId },
    select: { launchDate: true },
  });
  if (!product) return { ok: false, error: "That product couldn't be found." };
  if (isUpcoming(product.launchDate, startOfUtcDay(new Date()))) {
    return { ok: false, error: "Voting opens on launch day." };
  }

  const visitorId = await ensureVisitorId();
  const key = { productId_visitorId: { productId, visitorId } };

  const existing = await db.vote.findUnique({ where: key, select: { id: true } });
  try {
    if (existing) {
      await db.vote.delete({ where: { id: existing.id } });
    } else {
      await db.vote.create({ data: { productId, visitorId } });
    }
  } catch (error) {
    // A double-click can race: the vote already exists or is already gone.
    const raced =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2025");
    if (!raced) throw error;
  }

  refresh();
  return { ok: true };
}

export type SubscribeState =
  | { status: "idle" }
  | { status: "subscribed"; email: string }
  | { status: "error"; error: string; email: string };

/** Adds an email to the daily digest list. Signing up twice is treated as success. */
export async function subscribeToDigest(
  _previous: SubscribeState,
  formData: FormData,
): Promise<SubscribeState> {
  const raw = formData.get("email");
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";

  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", error: "Enter an email address like name@example.com.", email };
  }

  await db.subscriber.upsert({ where: { email }, create: { email }, update: {} });
  return { status: "subscribed", email };
}

export type SubmitField =
  | "name"
  | "plan"
  | "description"
  | "platforms"
  | "websiteUrl"
  | "appStoreUrl"
  | "playStoreUrl"
  | "tagline"
  | "topicSlug"
  | "launchDate"
  | "logo"
  | "gallery"
  | "video";

export type SubmitLaunchState =
  | { status: "idle" }
  | { status: "submitted"; name: string; slug: string; launchDay: string }
  | { status: "error"; errors: Partial<Record<SubmitField | "form", string>> };

const MAX_SCREENSHOTS = 4;

/** Publishes a launch. Free launches are scheduled straight away; a Launch Pass goes to checkout first. */
export async function submitLaunch(
  _previous: SubmitLaunchState,
  formData: FormData,
): Promise<SubmitLaunchState> {
  const user = await getCurrentUser();
  if (!user) {
    return { status: "error", errors: { form: "Your session has ended. Sign in again to submit." } };
  }

  const text = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
  };
  const files = (key: string) =>
    formData.getAll(key).filter((f): f is File => f instanceof File && f.size > 0);

  const errors: Partial<Record<SubmitField, string>> = {};
  const name = text("name");
  const tagline = text("tagline");

  if (!name || name.length > 60) errors.name = "Enter your product's name (60 characters or fewer).";

  // Each chosen platform needs its own link: a website, an App Store page or a Google Play listing.
  const platforms = sortPlatforms(formData.getAll("platforms").filter(isPlatform));
  if (platforms.length === 0) errors.platforms = "Choose at least one: website, iPhone app or Android app.";
  const linkField = { web: "websiteUrl", ios: "appStoreUrl", android: "playStoreUrl" } as const;
  const links: Partial<Record<(typeof linkField)[keyof typeof linkField], string>> = {};
  for (const platform of platforms) {
    const field = linkField[platform];
    const value = text(field);
    const problem = checkPlatformLink(platform, value);
    if (problem) errors[field] = problem;
    else links[field] = value;
  }
  if (!tagline || tagline.length > 80) {
    errors.tagline = "Describe it in one line of 80 characters or fewer.";
  }
  const topicSlug = text("topicSlug");
  const topic = topicSlug
    ? await db.topic.findUnique({ where: { slug: topicSlug }, select: { slug: true } })
    : null;
  if (!topic) errors.topicSlug = "Choose the category that fits best.";

  const description = text("description");
  if (description.length < 20 || description.length > 600) {
    errors.description = "Describe your product in 20 to 600 characters.";
  }

  // Launch Pass makers pick their day; free launches take the next open day.
  const plan = text("plan") === "pass" ? "pass" : "free";
  if (plan === "pass" && paymentMode() === "off") {
    errors.plan = "The Launch Pass isn't available right now. Choose the free launch instead.";
  }
  const launchDate = plan === "pass" ? parseDayParam(text("launchDate")) : null;
  if (plan === "pass" && (!launchDate || launchDate.getTime() <= startOfUtcDay(new Date()).getTime())) {
    errors.launchDate = "Pick a launch day from tomorrow onwards.";
  }

  // Check every file before saving any, so a bad file doesn't leave the others orphaned.
  const [logoFile] = files("logo");
  const logo = logoFile ? await checkUpload(logoFile, "image") : null;
  if (!logo) errors.logo = "Add your product's logo.";
  else if (!logo.ok) errors.logo = logo.error;

  const screenshotFiles = files("gallery");
  const screenshots = await Promise.all(screenshotFiles.map((f) => checkUpload(f, "image")));
  if (screenshotFiles.length === 0) errors.gallery = "Add at least one screenshot.";
  else if (screenshotFiles.length > MAX_SCREENSHOTS) {
    errors.gallery = `Add up to ${MAX_SCREENSHOTS} screenshots.`;
  } else {
    const bad = screenshots.find((r) => !r.ok);
    if (bad && !bad.ok) errors.gallery = bad.error;
  }

  const videoMode = text("videoMode") === "link" ? "link" : "file";
  let videoLink: string | null = null;
  let videoUpload: Awaited<ReturnType<typeof checkUpload>> | null = null;
  // The video is optional: check it only when one was given.
  if (videoMode === "link") {
    const link = text("videoLink");
    if (link && !toEmbedUrl(link)) errors.video = "Paste a YouTube, Vimeo or Loom link to your video.";
    else if (link) videoLink = link;
  } else {
    const [videoFile] = files("videoFile");
    if (videoFile) {
      videoUpload = await checkUpload(videoFile, "video");
      if (!videoUpload.ok) errors.video = videoUpload.error;
    }
  }

  if (Object.keys(errors).length > 0 || !topic || !logo?.ok) {
    return { status: "error", errors };
  }

  const logoUrl = await storeUpload(logo.upload);
  const galleryUrls = await Promise.all(
    screenshots.map((r) => (r.ok ? storeUpload(r.upload) : Promise.reject(new Error("unchecked")))),
  );
  const videoUrl = videoLink ?? (videoUpload?.ok ? await storeUpload(videoUpload.upload) : "");

  const submission = await db.submission.create({
    select: { id: true },
    data: {
      userId: user.id,
      email: user.email,
      name,
      description,
      plan,
      status: plan === "pass" ? "awaiting_payment" : "pending",
      paymentStatus: plan === "pass" ? "awaiting" : "none",
      platforms,
      websiteUrl: links.websiteUrl ?? null,
      appStoreUrl: links.appStoreUrl ?? null,
      playStoreUrl: links.playStoreUrl ?? null,
      tagline,
      topicSlug: topic.slug,
      launchDate,
      logoUrl,
      galleryUrls,
      videoUrl,
    },
  });

  if (plan === "pass") {
    // Saved first, so an abandoned checkout can be resumed from the profile page.
    const checkoutUrl = await createLaunchPassCheckout({
      submissionId: submission.id,
      customer: { email: user.email, name: user.name },
      origin: await siteOrigin(),
    });
    redirect(checkoutUrl);
  }
  const published = await publishSubmission(submission.id);
  if (!published) {
    return { status: "error", errors: { form: "Your launch was saved but couldn't be scheduled. Try again from My products." } };
  }
  const { weekday, day } = formatLaunchDay(published.launchDate);
  return { status: "submitted", name, slug: published.slug, launchDay: `${weekday}, ${day}` };
}

/** Restarts checkout for one of the signed-in user's unpaid Launch Pass submissions. */
export async function resumeCheckout(submissionId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/profile");
  const submission = await db.submission.findFirst({
    where: { id: submissionId, userId: user.id, paymentStatus: "awaiting" },
    select: { id: true },
  });
  if (!submission) redirect("/profile");
  const checkoutUrl = await createLaunchPassCheckout({
    submissionId: submission.id,
    customer: { email: user.email, name: user.name },
    origin: await siteOrigin(),
  });
  redirect(checkoutUrl);
}

export type CommentState = { status: "idle" | "posted" } | { status: "error"; error: string };

/** Adds a comment from the signed-in user to a product. */
export async function addComment(
  productId: string,
  _previous: CommentState,
  formData: FormData,
): Promise<CommentState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", error: "Sign in to join the conversation." };

  const raw = formData.get("body");
  const body = typeof raw === "string" ? raw.trim() : "";
  if (!body) return { status: "error", error: "Write something before posting." };
  if (body.length > 1000) return { status: "error", error: "Keep comments to 1,000 characters." };

  const product =
    typeof productId === "string"
      ? await db.product.findUnique({ where: { id: productId }, select: { id: true } })
      : null;
  if (!product) return { status: "error", error: "That product couldn't be found." };

  await db.comment.create({ data: { productId: product.id, userId: user.id, body } });
  refresh();
  return { status: "posted" };
}
