"use server";

import { refresh } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatLaunchDay } from "@/lib/dates";
import { getCurrentUser } from "@/lib/auth";
import { isProductUpcoming } from "@/lib/launches";
import { checkPlatformLink, isPlatform, sortPlatforms } from "@/lib/platforms";
import { publishSubmission } from "@/lib/publish";
import { isPricingModel, MAX_FEATURE_LENGTH, MAX_FEATURES, MAX_TRIAL_DAYS } from "@/lib/product-page";
import { toEmbedUrl, verifyUpload } from "@/lib/uploads";
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
  if (isProductUpcoming(product)) {
    return { ok: false, error: "Voting opens when it goes live." };
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
  | "description"
  | "platforms"
  | "websiteUrl"
  | "appStoreUrl"
  | "playStoreUrl"
  | "tagline"
  | "topicSlug"
  | "pricingModel"
  | "freeTrialDays"
  | "features"
  | "logo"
  | "gallery"
  | "video";

export type SubmitLaunchState =
  | { status: "idle" }
  | { status: "submitted"; name: string; slug: string; launchDay: string }
  | { status: "error"; errors: Partial<Record<SubmitField | "form", string>> };

const MAX_SCREENSHOTS = 4;

/** Publishes a launch: it joins the queue and takes the next day with a free seat. */
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
  // Files were uploaded straight to storage by the browser; the form carries their URLs.
  const urls = (key: string) =>
    formData.getAll(key).filter((v): v is string => typeof v === "string" && v.length > 0 && v.length < 500);

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

  const pricingModel = text("pricingModel");
  if (!isPricingModel(pricingModel)) errors.pricingModel = "Choose how your product is priced.";
  const trialText = text("freeTrialDays");
  let freeTrialDays: number | null = null;
  if (trialText && pricingModel !== "free") {
    const days = Number(trialText);
    if (!Number.isInteger(days) || days < 1 || days > MAX_TRIAL_DAYS) {
      errors.freeTrialDays = `Enter a trial length from 1 to ${MAX_TRIAL_DAYS} days, or leave it empty.`;
    } else freeTrialDays = days;
  }
  const features = formData
    .getAll("features")
    .map((f) => (typeof f === "string" ? f.trim() : ""))
    .filter(Boolean);
  if (features.length > MAX_FEATURES) errors.features = `List up to ${MAX_FEATURES} features.`;
  else if (features.some((f) => f.length > MAX_FEATURE_LENGTH)) {
    errors.features = `Keep each feature to ${MAX_FEATURE_LENGTH} characters.`;
  }

  const description = text("description");
  if (description.length < 20 || description.length > 600) {
    errors.description = "Describe your product in 20 to 600 characters.";
  }

  const [logoUrl] = urls("logoUrl");
  if (!logoUrl) errors.logo = "Add your product's logo.";
  else {
    const logo = await verifyUpload(logoUrl, "image");
    if (!logo.ok) errors.logo = logo.error;
  }

  const galleryUrls = urls("galleryUrls");
  if (galleryUrls.length === 0) errors.gallery = "Add at least one screenshot.";
  else if (galleryUrls.length > MAX_SCREENSHOTS) {
    errors.gallery = `Add up to ${MAX_SCREENSHOTS} screenshots.`;
  } else {
    const checked = await Promise.all(galleryUrls.map((url) => verifyUpload(url, "image")));
    const bad = checked.find((r) => !r.ok);
    if (bad && !bad.ok) errors.gallery = bad.error;
  }

  // The video is optional and always a link; files are never uploaded for it.
  let videoUrl = "";
  const videoLink = text("videoLink");
  if (videoLink && !toEmbedUrl(videoLink)) errors.video = "Paste a YouTube, Vimeo or Loom link to your video.";
  else videoUrl = videoLink;

  if (Object.keys(errors).length > 0 || !topic || !logoUrl) {
    return { status: "error", errors };
  }

  const submission = await db.submission.create({
    select: { id: true },
    data: {
      userId: user.id,
      email: user.email,
      name,
      description,
      plan: "free",
      status: "pending",
      platforms,
      websiteUrl: links.websiteUrl ?? null,
      appStoreUrl: links.appStoreUrl ?? null,
      playStoreUrl: links.playStoreUrl ?? null,
      tagline,
      topicSlug: topic.slug,
      pricingModel: isPricingModel(pricingModel) ? pricingModel : null,
      freeTrialDays,
      features,
      logoUrl,
      galleryUrls,
      videoUrl,
    },
  });

  const published = await publishSubmission(submission.id);
  if (!published) {
    return { status: "error", errors: { form: "Your launch was saved but couldn't be scheduled. Try again from My products." } };
  }
  const { weekday, day } = formatLaunchDay(published.launchDate);
  return {
    status: "submitted",
    name,
    slug: published.slug,
    launchDay: `${weekday}, ${day}`,
  };
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
