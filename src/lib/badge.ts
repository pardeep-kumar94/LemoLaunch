import { readFile } from "node:fs/promises";
import path from "node:path";
import { BADGE_HEIGHT, BADGE_WIDTH, type BadgeTheme } from "@/lib/badge-snippets";

// Draws the "Launched on LaunchPad" badge as an SVG. The logo is embedded as a data URI
// because an SVG shown through <img> can't load other files.

const THEMES: Record<
  BadgeTheme,
  { bg: string; border: string; shadow: string; muted: string; ink: string; divider: string; arrow: string; logo: string }
> = {
  light: {
    bg: "#ffffff",
    border: "#3b1d0e",
    shadow: "#ff7a45",
    muted: "#7a6152",
    ink: "#3b1d0e",
    divider: "#f0e2d4",
    arrow: "#ff7a45",
    logo: "badge-logo.png",
  },
  yellow: {
    bg: "#ffd60a",
    border: "#3b1d0e",
    shadow: "#3b1d0e",
    muted: "#5e3a24",
    ink: "#3b1d0e",
    divider: "#e0b800",
    arrow: "#3b1d0e",
    logo: "badge-logo-on-yellow.png",
  },
  dark: {
    bg: "#2a1c14",
    border: "#5c4536",
    shadow: "#ff7a45",
    muted: "#c9b3a2",
    ink: "#fbf1e8",
    divider: "#47342a",
    arrow: "#ffd60a",
    logo: "badge-logo-dark.png",
  },
};

const logos = new Map<string, Promise<string>>();
function logoDataUri(file: string) {
  let uri = logos.get(file);
  if (!uri) {
    uri = readFile(path.join(process.cwd(), "public", "brand", file)).then(
      (data) => `data:image/png;base64,${data.toString("base64")}`,
    );
    logos.set(file, uri);
  }
  return uri;
}

const FONT = "Lexend, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Launched products show their upvotes; upcoming ones show their launch day. */
export type BadgeStatus = { kind: "launched"; votes: number } | { kind: "upcoming"; day: string };

export async function renderBadge(theme: BadgeTheme, status: BadgeStatus): Promise<string> {
  const t = THEMES[theme];
  const logo = await logoDataUri(t.logo);
  const right =
    status.kind === "launched"
      ? `<path d="M203.5 22.5 L210 14 L216.5 22.5 Z" fill="${t.arrow}" stroke="${t.arrow}" stroke-width="2" stroke-linejoin="round"/>
  <text x="210" y="42" text-anchor="middle" font-size="16" font-weight="700" fill="${t.ink}">${compact(status.votes)}</text>`
      : `<text x="210" y="32" text-anchor="middle" font-size="15" font-weight="700" fill="${t.ink}">${status.day}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${BADGE_WIDTH}" height="${BADGE_HEIGHT}" viewBox="0 0 ${BADGE_WIDTH} ${BADGE_HEIGHT}" font-family="${FONT}">
  <title>${status.kind === "launched" ? "Launched on LaunchPad" : "Launching on LaunchPad"}</title>
  <rect x="5" y="5" width="244" height="50" rx="12" fill="${t.shadow}"/>
  <rect x="1" y="1" width="244" height="50" rx="12" fill="${t.bg}" stroke="${t.border}" stroke-width="2"/>
  <text x="14" y="18" font-size="11" font-weight="600" fill="${t.muted}">${status.kind === "launched" ? "Launched on" : "Launching on"}</text>
  <image href="${logo}" x="12" y="22" width="141" height="27"/>
  <line x1="172" y1="12" x2="172" y2="40" stroke="${t.divider}" stroke-width="2" stroke-linecap="round"/>
  ${right}
</svg>`;
}

function compact(votes: number) {
  return votes < 10_000 ? String(votes) : `${Math.floor(votes / 1000)}k`;
}
