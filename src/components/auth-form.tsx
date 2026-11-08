"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signIn, signUp, type AuthState } from "@/app/auth-actions";
import { Check, CircleAlert, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const inputClass = "h-11 rounded-[11px] bg-card pl-10 text-[15px] shadow-xs";

/** Rough guidance only; the server just requires 8+ characters. */
function passwordChecks(password: string) {
  return [
    { label: "8 or more characters", met: password.length >= 8 },
    { label: "Upper and lower case", met: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { label: "A number or symbol", met: /[\d\W_]/.test(password) },
  ];
}

const strengthLabels = ["Too short", "Okay", "Good", "Strong"];
const strengthColors = ["bg-destructive", "bg-lemon-deep", "bg-lemon-deep", "bg-leaf"];

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
    <form action={formAction} noValidate className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      {state.error && (
        <p role="alert" className="flex gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {state.error}
        </p>
      )}

      {mode === "signup" && (
        <Field id="name" label="Your name" error={errors.name} icon={<User className="size-4" />}>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            placeholder="Maya Lindqvist"
            defaultValue={state.values?.name}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "name-error" : undefined}
            className={cn(inputClass, "pr-3.5")}
          />
        </Field>
      )}

      <Field id="email" label="Email" error={errors.email} icon={<Mail className="size-4" />}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          defaultValue={state.values?.email}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          className={cn(inputClass, "pr-3.5")}
        />
      </Field>

      <Field id="password" label="Password" error={errors.password} icon={<Lock className="size-4" />}>
        <Input
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "password-error" : mode === "signup" ? "password-strength" : undefined}
          className={cn(inputClass, "pr-11")}
        />
        <button
          type="button"
          onClick={() => setShowPassword((s) => !s)}
          aria-label={showPassword ? "Hide password" : "Show password"}
          aria-pressed={showPassword}
          className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </Field>

      {mode === "signup" && (
        <div id="password-strength" className="-mt-1 grid gap-2.5" aria-live="polite">
          <div className="flex items-center gap-3">
            <div className="grid flex-1 grid-cols-3 gap-1.5" aria-hidden="true">
              {[1, 2, 3].map((step) => (
                <span
                  key={step}
                  className={`h-1.5 rounded-full transition-colors ${
                    password && score >= step ? strengthColors[score] : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <span className="w-20 text-right text-xs font-medium text-muted-foreground">
              {password ? strengthLabels[score] : "Strength"}
            </span>
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
            {checks.map((check) => (
              <li
                key={check.label}
                className={cn("flex items-center gap-1.5 transition-colors", check.met ? "text-foreground" : "text-muted-foreground")}
              >
                <span
                  className={cn(
                    "grid size-4 place-items-center rounded-full",
                    check.met ? "bg-leaf text-white" : "shadow-[inset_0_0_0_1px_var(--input)]",
                  )}
                >
                  {check.met && <Check className="size-3" strokeWidth={3} />}
                </span>
                {check.label}
                <span className="sr-only">{check.met ? " (done)" : " (not yet)"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button type="submit" size="lg" disabled={pending} className="mt-2 w-full">
        {pending
          ? mode === "signin"
            ? "Signing in…"
            : "Creating your account…"
          : mode === "signin"
            ? "Sign in"
            : "Create account"}
      </Button>
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
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground">{icon}</span>
        {children}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-destructive">
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
    <nav aria-label="Account" className="grid h-10 grid-cols-2 rounded-xl bg-muted p-[3px] text-muted-foreground">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={mode === tab.key ? "page" : undefined}
          className={cn(
            "grid place-items-center rounded-[9px] text-sm font-medium transition-colors",
            mode === tab.key ? "bg-card text-foreground shadow-xs" : "hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
