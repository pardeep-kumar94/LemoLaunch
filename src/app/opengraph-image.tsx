import { ImageResponse } from "next/og";
import { OG_COLORS, OG_SIZE, ogFonts, Seats, Wordmark } from "@/lib/og";

export const alt = "LemoLaunch: launch your product and discover new startups daily";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const fonts = await ogFonts();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", gap: 64, background: OG_COLORS.paper, padding: 72, fontFamily: "Geist" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", flex: 1 }}>
          <Wordmark size={52} />
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div style={{ display: "flex", fontFamily: "Bricolage", fontSize: 76, fontWeight: 700, lineHeight: 0.98, letterSpacing: -3, color: OG_COLORS.ink }}>
              The best new products, every day.
            </div>
            <div style={{ display: "flex", fontSize: 28, lineHeight: 1.35, color: OG_COLORS.muted }}>
              100 launches a day, ranked by the community. Launch yours free.
            </div>
          </div>
        </div>
        <div style={{ display: "flex", padding: 28, background: OG_COLORS.card, border: `1.5px solid ${OG_COLORS.border}`, borderRadius: 28 }}>
          <Seats filled={87} />
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
