// Embed codes for the "Launched on LemoLaunch" badge that makers add to their own sites.
// Shared by the badge route (server) and the badge picker (client), so no server-only imports.

export const BADGE_THEMES = ["light", "yellow", "dark"] as const;
export type BadgeTheme = (typeof BADGE_THEMES)[number];

export const BADGE_WIDTH = 250;
export const BADGE_HEIGHT = 56;

export function isBadgeTheme(value: unknown): value is BadgeTheme {
  return BADGE_THEMES.includes(value as BadgeTheme);
}

export function badgeUrls(origin: string, slug: string, theme: BadgeTheme) {
  return {
    page: `${origin}/products/${slug}`,
    image: `${origin}/badge/${slug}.svg?theme=${theme}`,
    script: `${origin}/embed.js`,
  };
}

export function badgeSnippets(origin: string, slug: string, theme: BadgeTheme) {
  const url = badgeUrls(origin, slug, theme);
  const alt = "Launched on LemoLaunch";
  return {
    html: `<a href="${url.page}" target="_blank" rel="noopener"><img src="${url.image}" alt="${alt}" width="${BADGE_WIDTH}" height="${BADGE_HEIGHT}" /></a>`,
    script: `<script src="${url.script}" data-product="${slug}" data-theme="${theme}" async></script>`,
    markdown: `[![${alt}](${url.image})](${url.page})`,
  };
}
