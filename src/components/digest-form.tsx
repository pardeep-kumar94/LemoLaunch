"use client";

import { useActionState, useEffect } from "react";
import { subscribeToDigest, type SubscribeState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { track } from "@/lib/analytics";

const initialState: SubscribeState = { status: "idle" };

export function DigestForm() {
  const [state, formAction, pending] = useActionState(subscribeToDigest, initialState);

  useEffect(() => {
    if (state.status === "subscribed") track("digest_subscribed");
  }, [state]);

  if (state.status === "subscribed") {
    return (
      <p role="status" className="mt-4 text-sm">
        <span className="font-semibold">{state.email}</span> is on the list. The first digest goes
        out when daily emails start.
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-4" noValidate>
      <div className="flex gap-2">
        <label htmlFor="digest-email" className="sr-only">
          Email address
        </label>
        <Input
          id="digest-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.status === "error" ? state.email : ""}
          placeholder="you@example.com"
          aria-invalid={state.status === "error"}
          aria-describedby={state.status === "error" ? "digest-error" : undefined}
          className="h-9 bg-card"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Subscribing…" : "Subscribe"}
        </Button>
      </div>
      {state.status === "error" && (
        <p id="digest-error" className="mt-2 text-sm font-medium text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
