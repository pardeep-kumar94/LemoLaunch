import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

// Uploaded media lives on local disk under ./uploads and is served by
// app/uploads/[...path]/route.ts. Swap this module for S3 or similar before going live.

export const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

type Kind = "image" | "video";

export const LIMITS: Record<Kind, number> = {
  image: 5 * 1024 * 1024,
  video: 50 * 1024 * 1024,
};

/** Detects the real file type from its first bytes rather than trusting the browser. */
function sniff(bytes: Uint8Array): { ext: string; kind: Kind } | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") return { ext: "png", kind: "image" };
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { ext: "jpg", kind: "image" };
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { ext: "webp", kind: "image" };
  if (ascii(4, 8) === "ftyp") return { ext: "mp4", kind: "video" };
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return { ext: "webm", kind: "video" };
  }
  return null;
}

export type CheckedUpload = { bytes: Uint8Array; ext: string };

/** Checks one file's size and real type without saving it. */
export async function checkUpload(
  file: File,
  kind: Kind,
): Promise<{ ok: true; upload: CheckedUpload } | { ok: false; error: string }> {
  const label = kind === "image" ? "Images" : "Videos";
  if (file.size === 0) return { ok: false, error: "That file is empty." };
  if (file.size > LIMITS[kind]) {
    return { ok: false, error: `${label} can be up to ${LIMITS[kind] / 1024 / 1024} MB.` };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniff(bytes);
  if (!type || type.kind !== kind) {
    return {
      ok: false,
      error: kind === "image" ? "Use a PNG, JPG or WebP image." : "Use an MP4 or WebM video.",
    };
  }
  return { ok: true, upload: { bytes, ext: type.ext } };
}

/** Saves a checked file and returns its public /uploads URL. */
export async function storeUpload({ bytes, ext }: CheckedUpload): Promise<string> {
  const month = new Date().toISOString().slice(0, 7);
  const name = `${randomUUID()}.${ext}`;
  await mkdir(path.join(UPLOAD_ROOT, month), { recursive: true });
  await writeFile(path.join(UPLOAD_ROOT, month, name), bytes);
  return `/uploads/${month}/${name}`;
}

/** Deletes a file we stored, given its /uploads URL. Anything else is ignored. */
export async function deleteUpload(url: string | null | undefined) {
  if (!url?.startsWith("/uploads/")) return;
  const segments = url.slice("/uploads/".length).split("/");
  if (!segments.every((s) => /^[\w.-]+$/.test(s) && s !== "." && s !== "..")) return;
  const filePath = path.join(UPLOAD_ROOT, ...segments);
  if (filePath.startsWith(UPLOAD_ROOT + path.sep)) await rm(filePath, { force: true });
}

/** Turns a YouTube, Vimeo or Loom link into its embed URL, or null if it isn't one. */
export function toEmbedUrl(link: string): string | null {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "");
  const id = (value: string | null | undefined) =>
    value && /^[\w-]{6,64}$/.test(value) ? value : null;

  if (host === "youtube.com" || host === "m.youtube.com") {
    const v = id(url.searchParams.get("v")) ?? id(url.pathname.match(/^\/(?:shorts|embed)\/([\w-]+)/)?.[1]);
    return v ? `https://www.youtube-nocookie.com/embed/${v}` : null;
  }
  if (host === "youtu.be") {
    const v = id(url.pathname.slice(1));
    return v ? `https://www.youtube-nocookie.com/embed/${v}` : null;
  }
  if (host === "vimeo.com") {
    const v = url.pathname.match(/^\/(\d{6,12})/)?.[1];
    return v ? `https://player.vimeo.com/video/${v}` : null;
  }
  if (host === "loom.com") {
    const v = id(url.pathname.match(/^\/(?:share|embed)\/([\w-]+)/)?.[1]);
    return v ? `https://www.loom.com/embed/${v}` : null;
  }
  return null;
}
