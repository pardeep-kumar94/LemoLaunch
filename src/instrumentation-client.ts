import posthog from "posthog-js";

// Product analytics. Runs before the app becomes interactive. With no NEXT_PUBLIC_POSTHOG_KEY,
// nothing loads and nothing is sent.

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

if (key) {
  try {
    posthog.init(key, {
      // Sent through our own /ingest route (next.config.ts rewrites) so ad blockers don't drop it.
      api_host: "/ingest",
      ui_host: host.replace(".i.posthog.com", ".posthog.com"),
      defaults: "2026-08-30",
      capture_pageview: "history_change",
      capture_pageleave: true,
      autocapture: true,
      enable_heatmaps: true,
      capture_performance: { web_vitals: true },
      // Anonymous visitors get profiles too, so every journey is visible before sign-up.
      person_profiles: "always",
      session_recording: {
        maskAllInputs: true,
      },
    });
  } catch {
    // Analytics must never break the site.
  }

  // Outbound links rendered on the server carry data-track-outbound; one listener covers them all.
  document.addEventListener(
    "click",
    (event) => {
      const link = (event.target as Element | null)?.closest?.("a[data-track-outbound]");
      if (!(link instanceof HTMLAnchorElement)) return;
      posthog.capture("outbound_link_clicked", {
        link_type: link.dataset.trackOutbound,
        product_slug: link.dataset.productSlug,
        url: link.href,
      });
    },
    { capture: true },
  );
}
