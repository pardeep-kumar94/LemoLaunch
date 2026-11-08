// Browser-side image compression, run before anything is uploaded. Large images are scaled
// down to the size they are ever shown at, then re-encoded as high-quality WebP. The original
// is kept whenever compressing would not make it smaller, so a file never gets worse for nothing.

/** Largest original a maker may pick, before compression. */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_IMAGE_LABEL = "2 MB";

export type ImagePurpose = "logo" | "screenshot" | "avatar";

/** Longest side, in pixels, each kind of image is stored at (about twice its largest display size). */
const MAX_SIDE: Record<ImagePurpose, number> = {
  logo: 512,
  avatar: 512,
  screenshot: 2400,
};

/** WebP quality: visually indistinguishable from the original at normal viewing sizes. */
const QUALITY = 0.86;

export async function compressImage(file: File, purpose: ImagePurpose): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file; // Not decodable here; the server's checks decide.
  }

  const scale = Math.min(1, MAX_SIDE[purpose] / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await encode(canvas, file.type);
  if (!blob) return file;
  const resized = scale < 1;
  // Unchanged dimensions and no saving: the original is already as good as it gets.
  if (!resized && blob.size >= file.size) return file;

  const ext = blob.type === "image/webp" ? "webp" : blob.type === "image/jpeg" ? "jpg" : "png";
  const name = `${file.name.replace(/\.[^.]+$/, "") || "image"}.${ext}`;
  return new File([blob], name, { type: blob.type, lastModified: Date.now() });
}

/** WebP where the browser can write it; otherwise the original format (PNG keeps transparency). */
async function encode(canvas: HTMLCanvasElement, originalType: string): Promise<Blob | null> {
  const webp = await toBlob(canvas, "image/webp", QUALITY);
  if (webp?.type === "image/webp") return webp;
  // Older Safari can't encode WebP and silently returns PNG instead.
  return originalType === "image/jpeg" ? toBlob(canvas, "image/jpeg", QUALITY) : toBlob(canvas, "image/png");
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}
