import type { Analytics } from "firebase/analytics";

// Firebase Analytics (Google Analytics 4 underneath). Loads in the browser only when the
// NEXT_PUBLIC_FIREBASE_* variables are set, and only after the page is interactive, so it never
// weighs on the first load. Page views, including App Router navigations, are recorded by GA4's
// enhanced measurement.

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const firebaseEnabled = Boolean(config.apiKey && config.appId && config.measurementId);

let analytics: Promise<Analytics | null> | null = null;

/** The Analytics instance, set up on first use. Null when not configured or not supported. */
export function firebaseAnalytics(): Promise<Analytics | null> {
  if (!firebaseEnabled || typeof window === "undefined") return Promise.resolve(null);
  analytics ??= (async () => {
    try {
      const [{ getApps, initializeApp }, { getAnalytics, isSupported }] = await Promise.all([
        import("firebase/app"),
        import("firebase/analytics"),
      ]);
      if (!(await isSupported())) return null;
      return getAnalytics(getApps()[0] ?? initializeApp(config));
    } catch {
      return null;
    }
  })();
  return analytics;
}
