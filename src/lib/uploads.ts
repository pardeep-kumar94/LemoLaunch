import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, open, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Uploaded media: logos, screenshots, videos and profile photos. Browsers upload straight to
// storage with a short-lived signed link, so files never pass through a Server Action.
//
// With the R2_* variables set, files go to a Cloudflare R2 bucket and are served from
// R2_PUBLIC_URL. Without them, files go to ./uploads on local disk through
// app/api/uploads/route.ts and are served by app/uploads/[...path]/route.ts.

export const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

export type UploadKind = "image" | "video";

export const LIMITS: Record<UploadKind, number> = {
  image: 5 * 1024 * 1024,
  video: 50 * 1024 * 1024,
};

/** The browser-reported types we accept, and the extension each is stored under. */
const ACCEPTED: Record<string, { ext: string; kind: UploadKind }> = {
  "image/png": { ext: "png", kind: "image" },
  "image/jpeg": { ext: "jpg", kind: "image" },
  "image/webp": { ext: "webp", kind: "image" },
  "video/mp4": { ext: "mp4", kind: "video" },
  "video/webm": { ext: "webm", kind: "video" },
};

export const CONTENT_TYPES: Record<string, string> = Object.fromEntries(
  Object.entries(ACCEPTED).map(([type, { ext }]) => [ext, type]),
);

/** uploads/2026-11/<uuid>.png — the only shape of key we ever create or accept. */
const KEY_PATTERN = /^uploads\/\d{4}-\d{2}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp|mp4|webm)$/;
const CACHE_CONTROL = "public, max-age=31536000, immutable";
const SIGNED_URL_SECONDS = 600;

type R2Config = { accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string; publicUrl: string };

function r2Config(): R2Config | null {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_URL) return null;
  return {
    accountId: R2_ACCOUNT_ID,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    bucket: R2_BUCKET,
    publicUrl: R2_PUBLIC_URL.replace(/\/+$/, ""),
  };
}

let client: S3Client | null = null;
function r2Client(config: R2Config): S3Client {
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    forcePathStyle: true,
    // Otherwise the SDK signs a checksum of an empty body into upload links, and every
    // browser upload of real bytes fails the check.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return client;
}

/** True when uploads go to R2 rather than local disk. */
export function usesR2(): boolean {
  return r2Config() !== null;
}

/** Detects the real file type from its first bytes rather than trusting the browser. */
function sniff(bytes: Uint8Array): { ext: string; kind: UploadKind } | null {
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

function typeError(kind: UploadKind): string {
  return kind === "image" ? "Use a PNG, JPG or WebP image." : "Use an MP4 or WebM video.";
}

function sizeError(kind: UploadKind): string {
  return `${kind === "image" ? "Images" : "Videos"} can be up to ${LIMITS[kind] / 1024 / 1024} MB.`;
}

export type UploadRequest = { kind: UploadKind; type: string; size: number };
export type UploadTarget = { uploadUrl: string; publicUrl: string; headers: Record<string, string> };

/** Checks what the browser says it will upload, before anything is signed. */
export function checkUploadRequest(request: UploadRequest): { ok: true } | { ok: false; error: string } {
  const accepted = ACCEPTED[request.type];
  if (!accepted || accepted.kind !== request.kind) return { ok: false, error: typeError(request.kind) };
  if (!Number.isInteger(request.size) || request.size <= 0) return { ok: false, error: "That file is empty." };
  if (request.size > LIMITS[request.kind]) return { ok: false, error: sizeError(request.kind) };
  return { ok: true };
}

/** A signed upload link for one checked file, and the URL it will be served from. */
export async function createUploadTarget(request: UploadRequest): Promise<UploadTarget> {
  const { ext } = ACCEPTED[request.type];
  const key = `uploads/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${ext}`;
  const config = r2Config();

  if (config) {
    // Content type, exact length and caching are part of the signature, so the browser
    // can't upload something bigger or of another type with this link.
    const command = new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      ContentType: request.type,
      ContentLength: request.size,
      CacheControl: CACHE_CONTROL,
    });
    const uploadUrl = await getSignedUrl(r2Client(config), command, {
      expiresIn: SIGNED_URL_SECONDS,
      signableHeaders: new Set(["content-type", "content-length", "cache-control"]),
    });
    return {
      uploadUrl,
      publicUrl: `${config.publicUrl}/${key}`,
      headers: { "Content-Type": request.type, "Cache-Control": CACHE_CONTROL },
    };
  }

  const expires = Math.floor(Date.now() / 1000) + SIGNED_URL_SECONDS;
  const params = new URLSearchParams({
    key,
    type: request.type,
    size: String(request.size),
    expires: String(expires),
    sig: localSignature(key, request.type, request.size, expires),
  });
  return { uploadUrl: `/api/uploads?${params}`, publicUrl: `/${key}`, headers: { "Content-Type": request.type } };
}

/** The storage key behind one of our upload URLs, or null for anything else. */
function keyFromUrl(url: string): string | null {
  const config = r2Config();
  let key: string | null = null;
  if (config && url.startsWith(`${config.publicUrl}/`)) key = url.slice(config.publicUrl.length + 1);
  else if (url.startsWith("/uploads/")) key = url.slice(1);
  return key && KEY_PATTERN.test(key) ? key : null;
}

/** True for a file stored by us (local /uploads path or the R2 bucket), as opposed to a video link. */
export function isStoredUpload(url: string): boolean {
  if (url.startsWith("/uploads/")) return true;
  const config = r2Config();
  return Boolean(config && url.startsWith(`${config.publicUrl}/uploads/`));
}

/**
 * Confirms a submitted URL is a file the browser uploaded to our storage, of the right kind,
 * within the size limit, and with contents that really are that type.
 */
export async function verifyUpload(url: string, kind: UploadKind): Promise<{ ok: true } | { ok: false; error: string }> {
  const config = r2Config();
  const key = keyFromUrl(url);
  // In R2 mode, new uploads must be in the bucket; local /uploads paths are only for local mode.
  if (!key || (config && !url.startsWith(`${config.publicUrl}/`))) {
    return { ok: false, error: "That upload couldn't be found. Choose the file again." };
  }

  const head = config ? await readR2Head(config, key) : await readLocalHead(key);
  if (!head) return { ok: false, error: "That upload couldn't be found. Choose the file again." };
  if (head.size > LIMITS[kind]) return { ok: false, error: sizeError(kind) };
  const type = sniff(head.bytes);
  if (!type || type.kind !== kind || type.ext !== key.split(".").pop()) return { ok: false, error: typeError(kind) };
  return { ok: true };
}

async function readR2Head(config: R2Config, key: string): Promise<{ bytes: Uint8Array; size: number } | null> {
  try {
    const result = await r2Client(config).send(
      new GetObjectCommand({ Bucket: config.bucket, Key: key, Range: "bytes=0-15" }),
    );
    const size = Number(result.ContentRange?.split("/")[1] ?? result.ContentLength);
    const bytes = await result.Body?.transformToByteArray();
    return bytes && Number.isFinite(size) ? { bytes, size } : null;
  } catch {
    return null;
  }
}

async function readLocalHead(key: string): Promise<{ bytes: Uint8Array; size: number } | null> {
  const filePath = localPath(key);
  const info = await stat(filePath).catch(() => null);
  if (!info?.isFile()) return null;
  const file = await open(filePath, "r");
  try {
    const bytes = new Uint8Array(16);
    await file.read(bytes, 0, 16, 0);
    return { bytes, size: info.size };
  } finally {
    await file.close();
  }
}

/** Deletes a file we stored, given its URL. Anything else (seed logos, other sites) is ignored. */
export async function deleteUpload(url: string | null | undefined) {
  if (!url) return;
  const key = keyFromUrl(url);
  if (!key) return;
  const config = r2Config();
  if (config && url.startsWith(`${config.publicUrl}/`)) {
    await r2Client(config).send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key })).catch(() => {});
  } else {
    await rm(localPath(key), { force: true });
  }
}

// Local disk mode --------------------------------------------------------------------------

function localPath(key: string): string {
  // KEY_PATTERN has already ruled out "..", so this stays inside UPLOAD_ROOT.
  return path.join(UPLOAD_ROOT, ...key.split("/").slice(1));
}

function localSecret(): string {
  return process.env.UPLOAD_SIGNING_SECRET || `lemolaunch-local-uploads:${process.env.DATABASE_URL ?? ""}`;
}

function localSignature(key: string, type: string, size: number, expires: number): string {
  return createHmac("sha256", localSecret()).update(`${key}|${type}|${size}|${expires}`).digest("base64url");
}

/** Checks a local upload link made by createUploadTarget. */
export function checkLocalUploadLink(params: URLSearchParams): { key: string; type: string; size: number } | null {
  const key = params.get("key") ?? "";
  const type = params.get("type") ?? "";
  const size = Number(params.get("size"));
  const expires = Number(params.get("expires"));
  const sig = params.get("sig") ?? "";
  if (!KEY_PATTERN.test(key) || !ACCEPTED[type] || !Number.isInteger(size) || !Number.isInteger(expires)) return null;
  if (expires < Date.now() / 1000) return null;
  const expected = Buffer.from(localSignature(key, type, size, expires));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return { key, type, size };
}

/** Writes an uploaded file to local disk after checking its real type. */
export async function writeLocalUpload(key: string, type: string, bytes: Uint8Array): Promise<boolean> {
  const accepted = ACCEPTED[type];
  const sniffed = sniff(bytes);
  if (!accepted || !sniffed || sniffed.ext !== accepted.ext || bytes.length > LIMITS[accepted.kind]) return false;
  const filePath = localPath(key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, bytes, { flag: "wx" });
  return true;
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
