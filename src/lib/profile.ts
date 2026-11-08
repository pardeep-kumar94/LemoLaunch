import { db } from "@/lib/db";
import { isSameUtcDay } from "@/lib/dates";
import { isProductUpcoming } from "@/lib/launches";
import type { BoostPlacement } from "@/lib/pricing";

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
  /** Fast Track: the exact go-live time. */
  launchAt: Date | null;
  status: "awaiting_payment" | "scheduled" | "live" | "launched";
  /** "pass" is the retired Launch Pass, on older launches. */
  plan: "free" | "fast" | "pass";
  /** Paid, refunded or refund_failed, for paid submissions. */
  paymentStatus: string;
  /** Paid boosts that are running or still to come. */
  boosts: { placement: BoostPlacement; startDate: Date; endDate: Date }[];
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
        launchAt: true,
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
        launchAt: true,
        galleryUrls: true,
        videoUrl: true,
        platforms: true,
        createdAt: true,
        featuredUntil: true,
        submission: { select: { paymentStatus: true, plan: true } },
        boosts: {
          where: { paymentStatus: "paid", endDate: { gte: today } },
          orderBy: { startDate: "asc" },
          select: { placement: true, startDate: true, endDate: true },
        },
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
        launchAt: s.launchAt,
        status: "awaiting_payment",
        plan: s.plan === "fast" ? "fast" : s.plan === "pass" ? "pass" : "free",
        boosts: [],
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
        launchAt: p.launchAt,
        plan: p.submission?.plan === "fast" ? "fast" : p.featuredUntil ? "pass" : "free",
        boosts: p.boosts.map((b) => ({ ...b, placement: b.placement as BoostPlacement })),
        paymentStatus: p.submission?.paymentStatus ?? "none",
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
