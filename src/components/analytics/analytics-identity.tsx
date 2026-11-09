"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { identifyFirebaseUser, track } from "@/lib/analytics";

/** Accounts created this recently count as a sign-up rather than a sign-in. */
const NEW_ACCOUNT_MS = 10 * 60 * 1000;

/**
 * Ties analytics to the signed-in account. Rendered by the header, which already reads the
 * session, so pages stay cacheable. Signing in identifies the visitor; signing out resets them.
 */
export function AnalyticsIdentity({
  user,
}: {
  user: { id: string; name: string; email: string; createdAt: string } | null;
}) {
  const id = user?.id ?? null;
  const name = user?.name;
  const email = user?.email;
  const createdAt = user?.createdAt;

  useEffect(() => {
    identifyFirebaseUser(id);
  }, [id]);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    try {
      const identified = posthog.get_property("$user_state") === "identified";
      if (id && posthog.get_distinct_id() !== id) {
        posthog.identify(id, { name, email, created_at: createdAt });
        const isNew = createdAt && Date.now() - new Date(createdAt).getTime() < NEW_ACCOUNT_MS;
        track(isNew ? "signed_up" : "signed_in");
      } else if (!id && identified) {
        track("signed_out");
        posthog.reset();
      }
    } catch {
      // Analytics must never break the site.
    }
  }, [id, name, email, createdAt]);

  return null;
}
