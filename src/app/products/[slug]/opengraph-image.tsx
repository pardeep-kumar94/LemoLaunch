import { ImageResponse } from "next/og";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { OG_COLORS, OG_SIZE, ogFonts, Wordmark } from "@/lib/og";
import { primaryTopic } from "@/lib/product-page";

export const alt = "Product launch on LemoLaunch";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await connection();
  const [fonts, product] = await Promise.all([
    ogFonts(),
    /^[a-z0-9-]{1,80}$/.test(slug)
      ? db.product.findUnique({
          where: { slug },
          select: {
            name: true,
            tagline: true,
            maker: true,
            accent: true,
            primaryTopicSlug: true,
            topics: { select: { slug: true, name: true } },
            _count: { select: { votes: true } },
          },
        })
      : null,
  ]);
  const name = product?.name ?? "LemoLaunch";
  const tagline = product?.tagline ?? "Discover new products every day";
  const category = product ? primaryTopic(product) : undefined;

  const chip = { display: "flex", alignItems: "center", gap: 10, background: OG_COLORS.card, border: `1.5px solid ${OG_COLORS.border}`, borderRadius: 14, padding: "10px 20px" } as const;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: OG_COLORS.paper, padding: 64, fontFamily: "Geist" }}>
        <Wordmark size={46} />
        <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 184,
              height: 184,
              borderRadius: 44,
              background: product?.accent ?? OG_COLORS.ink,
              color: "#fff",
              fontFamily: "Bricolage",
              fontSize: 100,
              fontWeight: 700,
              boxShadow: "0 24px 48px -24px rgba(60, 40, 10, 0.45)",
            }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
            <div style={{ display: "flex", fontFamily: "Bricolage", fontSize: 92, fontWeight: 700, lineHeight: 1, letterSpacing: -3, color: OG_COLORS.ink }}>
              {name.length > 22 ? `${name.slice(0, 21)}…` : name}
            </div>
            <div style={{ display: "flex", fontSize: 36, lineHeight: 1.25, color: OG_COLORS.muted }}>
              {tagline.length > 90 ? `${tagline.slice(0, 89)}…` : tagline}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 28, fontWeight: 600, color: OG_COLORS.ink }}>
          {product && (
            <div style={{ ...chip, background: OG_COLORS.lemon, borderColor: OG_COLORS.lemonDeep }}>
              <svg width="22" height="22" viewBox="0 0 24 24">
                <path d="m18 15-6-6-6 6" fill="none" stroke={OG_COLORS.ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {product._count.votes} upvotes
            </div>
          )}
          {category && <div style={chip}>{category.name}</div>}
          {product && <div style={{ display: "flex", padding: "10px 4px", color: OG_COLORS.muted, fontWeight: 400 }}>by {product.maker}</div>}
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
