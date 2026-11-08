import posthog from "posthog-js";

// One place to record product moments. Does nothing when analytics isn't configured.

type Props = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function track(event: string, properties?: Props) {
  try {
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) posthog.capture(event, properties);
    window.gtag?.("event", event, properties);
  } catch {
    // Analytics must never break the site.
  }
}
