import { requestUploadTargets } from "@/app/upload-actions";
import { compressImage, type ImagePurpose } from "@/lib/image-compress";

// Browser side of uploads: compress each image, ask the server for signed links, then send
// each file straight to storage. Files already uploaded in this page session are reused, so
// fixing another field and submitting again doesn't upload (and orphan) the same file twice.

export type UploadResult = { ok: true; urls: string[] } | { ok: false; error: string; index?: number };

const uploaded = new WeakMap<File, string>();

export async function uploadFiles(
  files: { file: File; purpose: ImagePurpose }[],
  onProgress?: (fraction: number) => void,
): Promise<UploadResult> {
  const waiting = files.map((f, index) => ({ ...f, index })).filter((f) => !uploaded.has(f.file));
  // `original` stays the cache key; `file` is what actually gets uploaded.
  const pending = await Promise.all(
    waiting.map(async (f) => ({ ...f, original: f.file, file: await compressImage(f.file, f.purpose) })),
  );
  if (pending.length > 0) {
    const result = await requestUploadTargets(
      pending.map(({ file }) => ({ kind: "image" as const, type: file.type, size: file.size })),
    );
    if (!result.ok) {
      return { ok: false, error: result.error, index: result.index === undefined ? undefined : pending[result.index].index };
    }

    const total = pending.reduce((sum, f) => sum + f.file.size, 0);
    const sent = new Array<number>(pending.length).fill(0);
    try {
      await Promise.all(
        pending.map((f, i) =>
          put(result.targets[i].uploadUrl, f.file, result.targets[i].headers, (loaded) => {
            sent[i] = loaded;
            onProgress?.(sent.reduce((a, b) => a + b, 0) / total);
          }).then(() => uploaded.set(f.original, result.targets[i].publicUrl)),
        ),
      );
    } catch {
      return { ok: false, error: "An upload failed. Check your connection and try again." };
    }
  }
  onProgress?.(1);
  return { ok: true, urls: files.map((f) => uploaded.get(f.file) as string) };
}

/** PUTs one file, reporting bytes sent. XMLHttpRequest because fetch has no upload progress. */
function put(url: string, file: File, headers: Record<string, string>, onProgress: (loaded: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (event) => onProgress(event.loaded);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(String(xhr.status))));
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(file);
  });
}
