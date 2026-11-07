import { db } from "@/lib/db";
import { isSameUtcDay } from "@/lib/dates";
import { isUpcoming } from "@/lib/launches";

export type MyProduct = {
  key: string;
  kind: "submission" | "product";
  id: string;
  slug: string | null;
  name: string;
  tagline: string;
  logoUrl: string | null;
  accent: string;
  /** Null for an unpaid Launch Pass that hasn't picked up its day yet. */
  launchDate: Date | null;
  status: "awaiting_payment" | "scheduled" | "live" | "launched";
  plan: "free" | "pass";
  /** Paid, refunded or refund_failed, for Launch Pass submissions. */
  paymentStatus: string;
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
      // Published submissions show up as their product instead.
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
        status: true,
        plan: true,
        paymentStatus: true,
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
        featuredUntil: true,
        submission: { select: { paymentStatus: true } },
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
        status: "awaiting_payment",
        plan: s.plan === "pass" ? "pass" : "free",
        paymentStatus: s.paymentStatus,
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
        plan: p.featuredUntil ? "pass" : "free",
        paymentStatus: p.submission?.paymentStatus ?? "none",
        reviewNote: null,
        status: isUpcoming(p.launchDate, today)
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
