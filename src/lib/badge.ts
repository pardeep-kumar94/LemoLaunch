import { BADGE_HEIGHT, BADGE_WIDTH, type BadgeTheme } from "@/lib/badge-snippets";
import { WORDMARK_PATH } from "@/lib/badge-wordmark";

// Draws the "Launched on LemoLaunch" badge as an SVG, in the site's Daily Edition look: the lemon
// mark and the wordmark are vector paths, so the badge needs no images or web fonts.

const THEMES: Record<
  BadgeTheme,
  { bg: string; border: string; ink: string; muted: string; divider: string; arrow: string; shadow: string }
> = {
  light: { bg: "#ffffff", border: "#e6e0d3", ink: "#2c2318", muted: "#75695a", divider: "#ece6da", arrow: "#c9a316", shadow: "0.10" },
  yellow: { bg: "#f5d63d", border: "#d8b31c", ink: "#2c2318", muted: "#5c4a17", divider: "#e2c22b", arrow: "#2c2318", shadow: "0.14" },
  dark: { bg: "#221c15", border: "#3a3127", ink: "#f4efe6", muted: "#b9ad9b", divider: "#3a3127", arrow: "#f5d63d", shadow: "0.35" },
};

const LEMON = `<path d="M5.5 18.5c-1.2-.4-1.6-1.6-.9-2.5.3-.4.7-.6 1.1-.7C6.6 9.8 11 6 16.4 6c2.6 0 5 .9 6.8 2.4.5-.3 1.2-.4 1.8-.1 1 .5 1.2 1.7.5 2.5-.2.2-.5.4-.8.5.6 1.4.9 2.9.9 4.5 0 6-4.9 10.2-10.6 10.2-4.3 0-8-2.4-9.5-5.6-.1-.6.1-1.4 0-1.9z" fill="#f5d63d" stroke="#2c2318" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M11 14.5c1.2-2.6 3.6-4.1 6.3-4.1" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" opacity=".85"/>
    <path d="M21.5 6.8c.6-2.6 2.8-4.2 5.7-4-.5 2.7-2.8 4.4-5.7 4z" fill="#4f8a4a" stroke="#2c2318" stroke-width="1.4" stroke-linejoin="round"/>`;

const FONT = "'Geist', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Launched products show their upvotes; upcoming ones show their launch day. */
export type BadgeStatus = { kind: "launched"; votes: number } | { kind: "upcoming"; day: string };

export async function renderBadge(theme: BadgeTheme, status: BadgeStatus): Promise<string> {
  const t = THEMES[theme];
  const launched = status.kind === "launched";
  const right = launched
    ? `<path d="M206 22.5 L212 16.5 L218 22.5" fill="none" stroke="${t.arrow}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="212" y="39" text-anchor="middle" font-size="15" font-weight="700" fill="${t.ink}" style="font-variant-numeric:tabular-nums">${compact(status.votes)}</text>`
    : `<text x="212" y="31" text-anchor="middle" font-size="14" font-weight="700" fill="${t.ink}">${status.day}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${BADGE_WIDTH}" height="${BADGE_HEIGHT}" viewBox="0 0 ${BADGE_WIDTH} ${BADGE_HEIGHT}" font-family="${FONT}">
  <title>${launched ? "Launched on LemoLaunch" : "Launching on LemoLaunch"}</title>
  <defs><filter id="s" x="-10%" y="-20%" width="120%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="1.6" flood-color="#3c280a" flood-opacity="${t.shadow}"/></filter></defs>
  <rect x="1.5" y="1.5" width="247" height="50" rx="12" fill="${t.bg}" stroke="${t.border}" filter="url(#s)"/>
  <g transform="translate(11 12) scale(0.875)">${LEMON}</g>
  <text x="47" y="21" font-size="10.5" font-weight="500" fill="${t.muted}">${launched ? "Launched on" : "Launching on"}</text>
  <path transform="translate(47 39.5)" fill="${t.ink}" d="${WORDMARK_PATH}"/>
  <line x1="176" y1="13" x2="176" y2="40" stroke="${t.divider}" stroke-width="1.5" stroke-linecap="round"/>
  ${right}
</svg>`;
}

function compact(votes: number) {
  return votes < 10_000 ? String(votes) : `${Math.floor(votes / 1000)}k`;
}
