import { checkLocalUploadLink, usesR2, writeLocalUpload } from "@/lib/uploads";

/**
 * Receives a browser upload in local disk mode (no R2 configured). The link was signed by
 * createUploadTarget, so it fixes the key, content type and exact size.
 */
export async function PUT(request: Request) {
  if (usesR2()) return new Response("Not found", { status: 404 });

  const link = checkLocalUploadLink(new URL(request.url).searchParams);
  if (!link) return new Response("This upload link is invalid or has expired.", { status: 403 });
  if (request.headers.get("content-type") !== link.type) {
    return new Response("The file type doesn't match the upload link.", { status: 400 });
  }
  const declared = Number(request.headers.get("content-length"));
  if (declared && declared !== link.size) return new Response("The file size doesn't match.", { status: 400 });

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length !== link.size) return new Response("The file size doesn't match.", { status: 400 });

  try {
    const saved = await writeLocalUpload(link.key, link.type, bytes);
    if (!saved) return new Response("That file isn't the type it claims to be.", { status: 400 });
  } catch {
    // "wx" refuses to overwrite: a link can only be used once.
    return new Response("This upload link has already been used.", { status: 409 });
  }
  return new Response(null, { status: 204 });
}
