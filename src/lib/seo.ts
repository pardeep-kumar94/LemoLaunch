import type { Metadata } from "next";

// Shared SEO values: the canonical origin, default copy, and a helper for per-page metadata.

export const SITE_NAME = "LemoLaunch";

/** Canonical origin for metadata, sitemaps and structured data. */
export const SITE_ORIGIN = (
  process.env.SITE_URL ||
  (process.env.NODE_ENV === "production" ? "https://www.lemolaunch.com" : "http://localhost:3000")
).replace(/\/+$/, "");

export const DEFAULT_TITLE = "LemoLaunch: launch your product and discover new startups daily";

export const DEFAULT_DESCRIPTION =
  "LemoLaunch is a daily launch platform for indie makers and small teams. Launch your startup, SaaS or app for free, get upvotes and feedback, and discover the best new products every day at 00:00 UTC.";

export function absoluteUrl(path = "/"): string {
  return `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Page metadata with a canonical URL and matching Open Graph / X card fields. `title` is the
 * page's own title; the layout's template adds " | LemoLaunch".
 */
export function pageMetadata({
  title,
  description,
  path,
  noindex = false,
}: {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: path, siteName: SITE_NAME, type: "website" },
    twitter: { card: "summary_large_image", title: `${title} | ${SITE_NAME}`, description },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

/** Escapes JSON-LD so product text can never close the surrounding <script> tag. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
