"use client";

import { useActionState } from "react";
import { subscribeToDigest, type SubscribeState } from "@/app/actions";

const initialState: SubscribeState = { status: "idle" };

export function DigestForm() {
  const [state, formAction, pending] = useActionState(subscribeToDigest, initialState);

  if (state.status === "subscribed") {
    return (
      <p role="status" className="mt-4 text-sm">
        <span className="font-semibold">{state.email}</span> is on the list. The first digest goes
        out when daily emails start.
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-2" noValidate>
      <label htmlFor="digest-email" className="sr-only">
        Email address
      </label>
      <input
        id="digest-email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.status === "error" ? state.email : ""}
        placeholder="you@example.com"
        aria-invalid={state.status === "error"}
        aria-describedby={state.status === "error" ? "digest-error" : undefined}
        className="h-11 rounded-xl border-2 border-on-signal bg-white px-3 text-on-signal placeholder:text-on-signal/50 focus:outline-none"
      />
      {state.status === "error" && (
        <p id="digest-error" className="text-sm font-semibold">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="press h-11 rounded-xl border-2 border-on-signal bg-on-signal font-bold text-signal shadow-[4px_4px_0_0_var(--pop)] disabled:opacity-60"
      >
        {pending ? "Subscribing…" : "Subscribe"}
      </button>
    </form>
  );
}
