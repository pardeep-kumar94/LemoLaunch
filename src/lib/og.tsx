import { readFile } from "node:fs/promises";
import path from "node:path";

// Shared pieces for the 1200x630 social share images (Open Graph / X cards), in the site's
// Daily Edition look: warm ink on paper with lemon accents.

export const OG_SIZE = { width: 1200, height: 630 };

export const OG_COLORS = {
  paper: "#fbf9f3",
  card: "#ffffff",
  ink: "#2c2318",
  muted: "#75695a",
  border: "#e6e0d3",
  lemon: "#f5d63d",
  lemonSoft: "#f8e98f",
  lemonDeep: "#d8b31c",
  leaf: "#4f8a4a",
};

type OgFont = { name: string; data: Buffer; weight: 400 | 600 | 700; style: "normal" };
let fonts: Promise<OgFont[]> | null = null;
/** Bricolage Grotesque for headlines and Geist for text, bundled as TTF because Satori can't read WOFF2. */
export function ogFonts() {
  fonts ??= Promise.all(
    (
      [
        ["Bricolage", 700, "Bricolage-Bold.ttf"],
        ["Geist", 400, "Geist-Regular.ttf"],
        ["Geist", 600, "Geist-SemiBold.ttf"],
      ] as const
    ).map(async ([name, weight, file]) => ({
      name,
      data: await readFile(path.join(process.cwd(), "src", "assets", "fonts", file)),
      weight,
      style: "normal" as const,
    })),
  );
  return fonts;
}

/** The lemon mark, drawn inline (same paths as the site's LemonMark). */
export function LemonMark({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <path
        d="M5.5 18.5c-1.2-.4-1.6-1.6-.9-2.5.3-.4.7-.6 1.1-.7C6.6 9.8 11 6 16.4 6c2.6 0 5 .9 6.8 2.4.5-.3 1.2-.4 1.8-.1 1 .5 1.2 1.7.5 2.5-.2.2-.5.4-.8.5.6 1.4.9 2.9.9 4.5 0 6-4.9 10.2-10.6 10.2-4.3 0-8-2.4-9.5-5.6-.1-.6.1-1.4 0-1.9z"
        fill={OG_COLORS.lemon}
        stroke={OG_COLORS.ink}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M11 14.5c1.2-2.6 3.6-4.1 6.3-4.1" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M21.5 6.8c.6-2.6 2.8-4.2 5.7-4-.5 2.7-2.8 4.4-5.7 4z" fill={OG_COLORS.leaf} stroke={OG_COLORS.ink} strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

export function Wordmark({ size = 48 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.28 }}>
      <LemonMark size={size} />
      <div style={{ display: "flex", fontFamily: "Bricolage", fontSize: size * 0.7, fontWeight: 700, letterSpacing: -1, color: OG_COLORS.ink }}>
        LemoLaunch
      </div>
    </div>
  );
}

/** The day's 100 launch seats, `filled` of them lemon. */
export function Seats({ filled, cell = 26, gap = 6 }: { filled: number; cell?: number; gap?: number }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap, width: cell * 10 + gap * 9 }}>
      {Array.from({ length: 100 }, (_, i) => (
        <div
          key={i}
          style={{
            width: cell,
            height: cell,
            borderRadius: 6,
            background: i < filled ? OG_COLORS.lemonSoft : "transparent",
            border: `1.5px solid ${i < filled ? OG_COLORS.lemonDeep : OG_COLORS.border}`,
          }}
        />
      ))}
    </div>
  );
}
