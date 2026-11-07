"use client";

import { useActionState } from "react";
import { changeEmail, changePassword, type FormState } from "@/app/profile/actions";
import { Field, FormStatus, inputClass, saveButtonClass } from "./form-bits";

export function ChangeEmailForm({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(changeEmail, { status: "idle" });
  const errors = state.fieldErrors ?? {};
  return (
    <form action={formAction} noValidate className="grid gap-5">
      <p className="text-mist">
        You sign in with <span className="font-semibold text-ink">{email}</span>.
      </p>
      <Field id="new-email" label="New email" error={errors.email}>
        <input id="new-email" name="email" type="email" autoComplete="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? "new-email-error" : undefined} className={inputClass} />
      </Field>
      <Field id="email-current-password" label="Current password" hint="To confirm it's you." error={errors.currentPassword}>
        <input id="email-current-password" name="currentPassword" type="password" autoComplete="current-password" aria-invalid={!!errors.currentPassword} aria-describedby={errors.currentPassword ? "email-current-password-error" : "email-current-password-hint"} className={inputClass} />
      </Field>
      <FormStatus status={state.status} message={state.message} />
      <button type="submit" disabled={pending} className={saveButtonClass}>
        {pending ? "Updating…" : "Update email"}
      </button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(changePassword, { status: "idle" });
  const errors = state.fieldErrors ?? {};
  return (
    <form action={formAction} noValidate className="grid gap-5">
      <Field id="current-password" label="Current password" error={errors.currentPassword}>
        <input id="current-password" name="currentPassword" type="password" autoComplete="current-password" aria-invalid={!!errors.currentPassword} aria-describedby={errors.currentPassword ? "current-password-error" : undefined} className={inputClass} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="new-password" label="New password" hint="At least 8 characters." error={errors.newPassword}>
          <input id="new-password" name="newPassword" type="password" autoComplete="new-password" aria-invalid={!!errors.newPassword} aria-describedby={errors.newPassword ? "new-password-error" : "new-password-hint"} className={inputClass} />
        </Field>
        <Field id="confirm-password" label="Repeat new password" error={errors.confirmPassword}>
          <input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" aria-invalid={!!errors.confirmPassword} aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined} className={inputClass} />
        </Field>
      </div>
      <FormStatus status={state.status} message={state.message} />
      <button type="submit" disabled={pending} className={saveButtonClass}>
        {pending ? "Changing…" : "Change password"}
      </button>
    </form>
  );
}
