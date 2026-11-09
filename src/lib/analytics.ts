import posthog from "posthog-js";
import { firebaseAnalytics, firebaseEnabled } from "@/lib/firebase";

// One place to record product moments. Does nothing when analytics isn't configured.

type Props = Record<string, string | number | boolean | null | undefined>;

export function track(event: string, properties?: Props) {
  try {
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) posthog.capture(event, properties);
    if (firebaseEnabled) {
      void firebaseAnalytics().then(async (analytics) => {
        if (!analytics) return;
        const { logEvent } = await import("firebase/analytics");
        // GA4 drops empty parameters anyway; leave them out.
        const params = Object.fromEntries(Object.entries(properties ?? {}).filter(([, v]) => v != null));
        logEvent(analytics, event, params);
      });
    }
  } catch {
    // Analytics must never break the site.
  }
}

/** Links Firebase Analytics to an account id, or clears it on sign-out. */
export function identifyFirebaseUser(userId: string | null) {
  if (!firebaseEnabled) return;
  void firebaseAnalytics().then(async (analytics) => {
    if (!analytics) return;
    const { setUserId } = await import("firebase/analytics");
    setUserId(analytics, userId);
  });
}

/** Sends a Firebase page view for the current address, for navigations GA4 can't see itself. */
export function trackFirebasePageView() {
  if (!firebaseEnabled) return;
  void firebaseAnalytics().then(async (analytics) => {
    if (!analytics) return;
    const { logEvent } = await import("firebase/analytics");
    logEvent(analytics, "page_view", {
      page_location: window.location.href,
      page_path: window.location.pathname + window.location.search,
      page_title: document.title,
    });
  });
}
