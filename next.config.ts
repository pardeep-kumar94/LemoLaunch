import type { NextConfig } from "next";

// PostHog is reached through /ingest on our own domain so ad blockers don't drop events.
const posthogHost = (process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com").replace(/\/+$/, "");
const posthogAssets = posthogHost.replace("://eu.i.", "://eu-assets.i.").replace("://us.i.", "://us-assets.i.");

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // No serverActions.bodySizeLimit: uploads go straight from the browser to storage, so
  // forms only carry text and file URLs, well under the 1 MB default.
  partialPrefetching: true,
  // PostHog's API paths end in slashes; don't redirect them away.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: "/ingest/static/:path*", destination: `${posthogAssets}/static/:path*` },
      { source: "/ingest/array/:path*", destination: `${posthogAssets}/array/:path*` },
      { source: "/ingest/:path*", destination: `${posthogHost}/:path*` },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
