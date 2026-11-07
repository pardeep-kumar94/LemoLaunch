import { db } from "@/lib/db";
import { startOfUtcDay } from "@/lib/dates";

// In-app notifications, worked out on read: one for each product by a maker you follow
// that went live after you followed them. Nothing is stored, so no job runs at 00:00 UTC.

export type LaunchNotification = {
  productSlug: string;
  productName: string;
  logoUrl: string | null;
  accent: string;
  maker: string;
  launchDate: Date;
  unread: boolean;
};

const LIMIT = 20;

export async function getNotifications(user: {
  id: string;
  notificationsSeenAt: Date | null;
}): Promise<{ items: LaunchNotification[]; unreadCount: number }> {
  const follows = await db.follow.findMany({
    where: { followerId: user.id },
    select: { makerId: true, createdAt: true },
  });
  if (follows.length === 0) return { items: [], unreadCount: 0 };

  const today = startOfUtcDay(new Date());
  const launchedSinceFollowing = follows.map((f) => ({
    makerId: f.makerId,
    launchDate: { gte: f.createdAt, lte: today },
  }));
  const seenAt = user.notificationsSeenAt;

  const [rows, unreadCount] = await Promise.all([
    db.product.findMany({
      where: { OR: launchedSinceFollowing },
      orderBy: [{ launchDate: "desc" }, { createdAt: "desc" }],
      take: LIMIT,
      select: { slug: true, name: true, logoUrl: true, accent: true, maker: true, launchDate: true },
    }),
    db.product.count({
      where: { OR: launchedSinceFollowing, ...(seenAt ? { launchDate: { gt: seenAt } } : {}) },
    }),
  ]);

  return {
    items: rows.map((r) => ({
      productSlug: r.slug,
      productName: r.name,
      logoUrl: r.logoUrl,
      accent: r.accent,
      maker: r.maker,
      launchDate: r.launchDate,
      unread: !seenAt || r.launchDate.getTime() > seenAt.getTime(),
    })),
    unreadCount,
  };
}
