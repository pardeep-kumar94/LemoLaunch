import { connection } from "next/server";
import { renderBadge } from "@/lib/badge";
import { isBadgeTheme } from "@/lib/badge-snippets";
import { startOfUtcDay } from "@/lib/dates";
import { db } from "@/lib/db";
import { isUpcoming } from "@/lib/launches";

/** The embeddable "Launched on LemoLaunch" badge: /badge/<product-slug>.svg?theme=light|yellow|dark */
export async function GET(request: Request, { params }: RouteContext<"/badge/[file]">) {
  const slug = (await params).file.match(/^([a-z0-9-]{1,80})\.svg$/)?.[1];
  if (!slug) return new Response("Not found", { status: 404 });

  await connection();
  const product = await db.product.findUnique({
    where: { slug },
    select: { launchDate: true, _count: { select: { votes: true } } },
  });
  if (!product) return new Response("Not found", { status: 404 });

  const theme = new URL(request.url).searchParams.get("theme");
  const svg = await renderBadge(
    isBadgeTheme(theme) ? theme : "light",
    isUpcoming(product.launchDate, startOfUtcDay(new Date()))
      ? {
          kind: "upcoming",
          day: product.launchDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }),
        }
      : { kind: "launched", votes: product._count.votes },
  );

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // Short so upvote counts stay fresh on makers' sites.
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline'",
    },
  });
}
