// One-off: copies files from ./uploads into the R2 bucket under the same key
// (uploads/2026-11/<file>) and rewrites database references from /uploads/... to the R2 URL.
//
//   npx tsx --tsconfig tsconfig.json scripts/migrate-uploads-to-r2.ts --dry-run
//   npx tsx --tsconfig tsconfig.json scripts/migrate-uploads-to-r2.ts
//
// Safe to re-run: files already in the bucket are skipped and rewritten references no longer
// start with /uploads/. Local files are left in place; delete ./uploads yourself afterwards.

import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";

const dryRun = process.argv.includes("--dry-run");
const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = process.env;
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_URL) {
  console.error("Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET and R2_PUBLIC_URL in .env first.");
  process.exit(1);
}
const publicUrl = R2_PUBLIC_URL.replace(/\/+$/, "");
const root = path.join(process.cwd(), "uploads");
const types: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  mp4: "video/mp4",
  webm: "video/webm",
};

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});
const db = new PrismaClient();

async function localKeys(): Promise<string[]> {
  const entries = await readdir(root, { recursive: true, withFileTypes: true }).catch(() => []);
  return entries
    .filter((e) => e.isFile() && types[path.extname(e.name).slice(1)])
    .map((e) => `uploads/${path.relative(root, path.join(e.parentPath, e.name)).split(path.sep).join("/")}`);
}

async function inBucket(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  // 1. Files.
  const keys = await localKeys();
  const available = new Set<string>();
  let uploaded = 0;
  for (const key of keys) {
    if (await inBucket(key)) {
      available.add(key);
      continue;
    }
    if (!dryRun) {
      await s3.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: key,
          Body: await readFile(path.join(root, ...key.split("/").slice(1))),
          ContentType: types[path.extname(key).slice(1)],
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
    }
    available.add(key);
    uploaded++;
  }
  console.log(`Files: ${keys.length} local, ${uploaded} ${dryRun ? "would be uploaded" : "uploaded"}, ${keys.length - uploaded} already in R2.`);

  // 2. Database references. Only files that are (or would be) in the bucket are rewritten.
  const move = (url: string | null): string | null => {
    if (!url?.startsWith("/uploads/")) return url;
    const key = url.slice(1);
    return available.has(key) ? `${publicUrl}/${key}` : url;
  };
  const moveAll = (list: string[]) => list.map((u) => move(u) as string);
  const changed = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b);
  const counts = { products: 0, submissions: 0, users: 0 };

  const products = await db.product.findMany({ select: { id: true, logoUrl: true, videoUrl: true, galleryUrls: true } });
  for (const p of products) {
    const next = { logoUrl: move(p.logoUrl), videoUrl: move(p.videoUrl), galleryUrls: moveAll(p.galleryUrls) };
    if (!changed(next, { logoUrl: p.logoUrl, videoUrl: p.videoUrl, galleryUrls: p.galleryUrls })) continue;
    counts.products++;
    if (!dryRun) await db.product.update({ where: { id: p.id }, data: next });
  }

  const submissions = await db.submission.findMany({ select: { id: true, logoUrl: true, videoUrl: true, galleryUrls: true } });
  for (const s of submissions) {
    const next = {
      logoUrl: move(s.logoUrl) as string,
      videoUrl: move(s.videoUrl) as string,
      galleryUrls: moveAll(s.galleryUrls),
    };
    if (!changed(next, { logoUrl: s.logoUrl, videoUrl: s.videoUrl, galleryUrls: s.galleryUrls })) continue;
    counts.submissions++;
    if (!dryRun) await db.submission.update({ where: { id: s.id }, data: next });
  }

  const users = await db.user.findMany({ where: { avatarUrl: { startsWith: "/uploads/" } }, select: { id: true, avatarUrl: true } });
  for (const u of users) {
    const next = move(u.avatarUrl);
    if (next === u.avatarUrl) continue;
    counts.users++;
    if (!dryRun) await db.user.update({ where: { id: u.id }, data: { avatarUrl: next } });
  }

  console.log(
    `Database: ${counts.products} products, ${counts.submissions} submissions, ${counts.users} users ${dryRun ? "would be updated" : "updated"}.`,
  );
  if (dryRun) console.log("Dry run: nothing was changed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
