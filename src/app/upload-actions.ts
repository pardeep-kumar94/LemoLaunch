"use server";

import { getCurrentUser } from "@/lib/auth";
import { checkUploadRequest, createUploadTarget, type UploadRequest, type UploadTarget } from "@/lib/uploads";

export type UploadTargetsResult =
  | { ok: true; targets: UploadTarget[] }
  | { ok: false; error: string; index?: number };

/** Most files one form sends: a logo, four screenshots and a video. */
const MAX_FILES = 6;

/** Signed upload links for files the signed-in user is about to upload. */
export async function requestUploadTargets(requests: UploadRequest[]): Promise<UploadTargetsResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has ended. Sign in again to upload." };
  if (!Array.isArray(requests) || requests.length === 0 || requests.length > MAX_FILES) {
    return { ok: false, error: "Choose your files again." };
  }

  for (const [index, request] of requests.entries()) {
    const valid =
      request &&
      (request.kind === "image" || request.kind === "video") &&
      typeof request.type === "string" &&
      typeof request.size === "number";
    if (!valid) return { ok: false, error: "Choose your files again.", index };
    const checked = checkUploadRequest(request);
    if (!checked.ok) return { ok: false, error: checked.error, index };
  }

  const targets = await Promise.all(requests.map((r) => createUploadTarget(r)));
  return { ok: true, targets };
}
