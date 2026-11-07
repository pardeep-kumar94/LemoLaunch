"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signIn, signUp, type AuthState } from "@/app/auth-actions";
import { CheckIcon, EyeIcon, LockIcon, MailIcon, UserIcon } from "@/components/icons";

const inputClass =
  "h-[52px] w-full rounded-[14px] border-2 border-line bg-paper pl-11 text-ink transition-colors placeholder:text-mist/70 focus:border-ink focus:outline-none aria-[invalid=true]:border-danger";

/** Rough guidance only; the server just requires 8+ characters. */
function passwordChecks(password: string) {
  return [
    { label: "8 or more characters", met: password.length >= 8 },
    { label: "Upper and lower case", met: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { label: "A number or symbol", met: /[\d\W_]/.test(password) },
  ];
}

const strengthLabels = ["Too short", "Okay", "Good", "Strong"];
const strengthColors = ["bg-danger", "bg-pop", "bg-signal", "bg-[#2f9e5b]"];

export function AuthForm({ mode, next }: { mode: "signin" | "signup"; next: string }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    mode === "signin" ? signIn : signUp,
    {},
  );
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const errors = state.fieldErrors ?? {};
  const checks = passwordChecks(password);
  const score = checks[0].met ? checks.filter((c) => c.met).length : 0;

  return (
    <form action={formAction} noValidate className="grid gap-5">
      <input type="hidden" name="next" value={next} />
      {state.error && (
        <p role="alert" className="rounded-[14px] border-2 border-danger/30 bg-pop-wash px-4 py-3 text-sm font-semibold">
          {state.error}
        </p>
      )}

      {mode === "signup" && (
        <Field id="name" label="Your name" error={errors.name} icon={<UserIcon />}>
          <input
            id="name"
            name="name"
            autoComplete="name"
            placeholder="Maya Lindqvist"
            defaultValue={state.values?.name}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "name-error" : undefined}
            className={`${inputClass} pr-3.5`}
          />
        </Field>
      )}

      <Field id="email" label="Email" error={errors.email} icon={<MailIcon />}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          defaultValue={state.values?.email}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          className={`${inputClass} pr-3.5`}
        />
      </Field>

      <Field id="password" label="Password" error={errors.password} icon={<LockIcon />}>
        <input
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "password-error" : mode === "signup" ? "password-strength" : undefined}
          className={`${inputClass} pr-12`}
        />
        <button
          type="button"
          onClick={() => setShowPassword((s) => !s)}
          aria-label={showPassword ? "Hide password" : "Show password"}
          aria-pressed={showPassword}
          className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-mist transition-colors hover:bg-signal-wash hover:text-ink"
        >
          <EyeIcon off={showPassword} />
        </button>
      </Field>

      {mode === "signup" && (
        <div id="password-strength" className="-mt-2 grid gap-2.5" aria-live="polite">
          <div className="flex items-center gap-3">
            <div className="grid flex-1 grid-cols-3 gap-1.5" aria-hidden="true">
              {[1, 2, 3].map((step) => (
                <span
                  key={step}
                  className={`h-1.5 rounded-full transition-colors ${
                    password && score >= step ? strengthColors[score] : "bg-line"
                  }`}
                />
              ))}
            </div>
            <span className="w-20 text-right text-xs font-semibold text-mist">
              {password ? strengthLabels[score] : "Strength"}
            </span>
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
            {checks.map((check) => (
              <li
                key={check.label}
                className={`flex items-center gap-1 transition-colors ${check.met ? "text-ink" : "text-mist"}`}
              >
                <span
                  className={`grid size-4 place-items-center rounded-full ${
                    check.met ? "bg-[#2f9e5b] text-white" : "border-2 border-line"
                  }`}
                >
                  {check.met && <CheckIcon className="size-3" />}
                </span>
                {check.label}
                <span className="sr-only">{check.met ? " (done)" : " (not yet)"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="press mt-1 h-14 rounded-2xl border-2 border-on-signal bg-signal text-lg font-bold text-on-signal shadow-[4px_4px_0_0_var(--pop)] disabled:opacity-60"
      >
        {pending
          ? mode === "signin"
            ? "Signing in…"
            : "Creating your account…"
          : mode === "signin"
            ? "Sign in"
            : "Create account"}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  icon,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-[15px] font-semibold">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-mist">{icon}</span>
        {children}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** "Sign in / Create account" switch at the top of the auth card. */
export function AuthSwitch({ mode, next }: { mode: "signin" | "signup"; next: string }) {
  const suffix = next !== "/" ? `?next=${encodeURIComponent(next)}` : "";
  const tabs = [
    { key: "signin", label: "Sign in", href: `/signin${suffix}` },
    { key: "signup", label: "Create account", href: `/signup${suffix}` },
  ] as const;
  return (
    <nav aria-label="Account" className="grid grid-cols-2 gap-1 rounded-[14px] border-2 border-line bg-concrete p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={mode === tab.key ? "page" : undefined}
          className={`rounded-[10px] py-2 text-center text-[15px] font-bold transition-colors ${
            mode === tab.key
              ? "bg-on-signal text-signal shadow-sm dark:bg-signal dark:text-on-signal"
              : "text-mist hover:text-ink"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
