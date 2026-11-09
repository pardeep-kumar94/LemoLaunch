import { db } from "@/lib/db";
import { isSameUtcDay } from "@/lib/dates";
import { isProductUpcoming } from "@/lib/launches";

export type MyProduct = {
  key: string;
  kind: "submission" | "product";
  id: string;
  slug: string | null;
  name: string;
  tagline: string;
  logoUrl: string | null;
  accent: string;
  launchDate: Date | null;
  /** "saved": never published, from when launches could wait on a payment. */
  status: "saved" | "scheduled" | "live" | "launched";
  reviewNote: string | null;
  screenshots: number;
  hasVideo: boolean;
  platforms: string[];
  voteCount: number;
  commentCount: number;
  submittedAt: Date;
};

/** Everything a user has put on LemoLaunch: pending submissions and their own launches. */
export async function getMyProducts(userId: string, today: Date): Promise<MyProduct[]> {
  const [submissions, products] = await Promise.all([
    db.submission.findMany({
      // Published submissions show up as their product instead; these were left unpaid back when
      // paid launches existed.
      where: { userId, status: "awaiting_payment" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        tagline: true,
        logoUrl: true,
        launchDate: true,
        galleryUrls: true,
        videoUrl: true,
        platforms: true,
        createdAt: true,
        reviewNote: true,
      },
    }),
    db.product.findMany({
      where: { makerId: userId },
      orderBy: { launchDate: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
        tagline: true,
        logoUrl: true,
        accent: true,
        launchDate: true,
        galleryUrls: true,
        videoUrl: true,
        platforms: true,
        createdAt: true,
        _count: { select: { votes: true, comments: true } },
      },
    }),
  ]);

  return [
    ...submissions.map(
      (s): MyProduct => ({
        key: `s-${s.id}`,
        kind: "submission",
        id: s.id,
        slug: null,
        name: s.name,
        tagline: s.tagline,
        logoUrl: s.logoUrl,
        accent: "#7a6152",
        launchDate: s.launchDate,
        status: "saved",
        reviewNote: s.reviewNote,
        screenshots: s.galleryUrls.length,
        hasVideo: Boolean(s.videoUrl),
        platforms: s.platforms,
        voteCount: 0,
        commentCount: 0,
        submittedAt: s.createdAt,
      }),
    ),
    ...products.map(
      (p): MyProduct => ({
        key: `p-${p.id}`,
        kind: "product",
        id: p.id,
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        logoUrl: p.logoUrl,
        accent: p.accent,
        launchDate: p.launchDate,
        reviewNote: null,
        status: isProductUpcoming(p)
          ? "scheduled"
          : isSameUtcDay(p.launchDate, today)
            ? "live"
            : "launched",
        screenshots: p.galleryUrls.length,
        hasVideo: Boolean(p.videoUrl),
        platforms: p.platforms,
        voteCount: p._count.votes,
        commentCount: p._count.comments,
        submittedAt: p.createdAt,
      }),
    ),
  ];
}
