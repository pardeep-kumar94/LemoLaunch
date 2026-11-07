// Where a product runs. Stored as plain strings on Product.platforms and Submission.platforms.

export const PLATFORMS = ["web", "ios", "android"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const platformLabels: Record<Platform, { short: string; long: string; linkLabel: string }> = {
  web: { short: "Web", long: "Website", linkLabel: "Website link" },
  ios: { short: "iOS", long: "iPhone and iPad app", linkLabel: "App Store link" },
  android: { short: "Android", long: "Android app", linkLabel: "Google Play link" },
};

export function isPlatform(value: unknown): value is Platform {
  return typeof value === "string" && (PLATFORMS as readonly string[]).includes(value);
}

/** Keeps known platforms in a stable order: web, iOS, Android. */
export function sortPlatforms(values: readonly string[]): Platform[] {
  return PLATFORMS.filter((p) => values.includes(p));
}

function parseUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

/** Checks a link matches its platform: any website, an App Store page, or a Google Play listing. */
export function checkPlatformLink(platform: Platform, value: string): string | null {
  const url = parseUrl(value);
  if (platform === "web") {
    return url ? null : "Enter the full website address, starting with https://";
  }
  if (platform === "ios") {
    return url && url.hostname === "apps.apple.com" && /\/id\d+/.test(url.pathname)
      ? null
      : "Paste the App Store link, like https://apps.apple.com/app/your-app/id123456789";
  }
  return url && url.hostname === "play.google.com" && url.searchParams.get("id")
    ? null
    : "Paste the Google Play link, like https://play.google.com/store/apps/details?id=com.example.app";
}
