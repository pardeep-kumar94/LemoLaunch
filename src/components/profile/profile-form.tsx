"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { updateProfile, type FormState } from "@/app/profile/actions";
import { UserAvatar } from "@/components/user-avatar";
import { Field, FormStatus, inputClass, saveButtonClass } from "./form-bits";

export function ProfileForm({
  user,
}: {
  user: { name: string; headline: string | null; websiteUrl: string | null; avatarUrl: string | null };
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(updateProfile, { status: "idle" });
  const [, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);
  const [name, setName] = useState(user.name);
  const [headline, setHeadline] = useState(user.headline ?? "");
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- preview mirrors the picked file
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    // A transition instead of the action prop keeps unsaved edits in place if a field is rejected.
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }

  const shownAvatar = remove ? null : (preview ?? user.avatarUrl);

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-6">
      <div className="grid gap-2">
        <span className="font-semibold">Profile photo</span>
        <div className="flex flex-wrap items-center gap-5">
          <UserAvatar name={name || user.name} src={shownAvatar} size="lg" className="border-2 border-ink" />
          <div className="grid gap-2">
            <span className="relative inline-flex w-fit">
              <input
                id="avatar"
                name="avatar"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-label="Choose a profile photo"
                aria-invalid={!!errors.avatar}
                aria-describedby={errors.avatar ? "avatar-error" : "avatar-hint"}
                onChange={(e) => {
                  setFile(e.currentTarget.files?.[0] ?? null);
                  setRemove(false);
                }}
                className="peer absolute inset-0 cursor-pointer opacity-0"
              />
              <span
                aria-hidden="true"
                className="inline-flex h-11 items-center rounded-xl border-2 border-ink bg-paper px-4 font-semibold shadow-[3px_3px_0_0_var(--ink)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink"
              >
                {shownAvatar ? "Change photo" : "Upload photo"}
              </span>
            </span>
            {(user.avatarUrl || file) && (
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  name="removeAvatar"
                  checked={remove}
                  onChange={(e) => setRemove(e.target.checked)}
                  className="size-4 accent-[var(--pop)]"
                />
                Remove photo
              </label>
            )}
            {errors.avatar ? (
              <p id="avatar-error" className="text-sm font-semibold text-danger">{errors.avatar}</p>
            ) : (
              <p id="avatar-hint" className="text-sm text-mist">Square PNG, JPG or WebP, up to 5 MB.</p>
            )}
          </div>
        </div>
      </div>

      <Field id="name" label="Name" error={errors.name}>
        <input
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          autoComplete="name"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "name-error" : undefined}
          className={inputClass}
        />
      </Field>

      <Field
        id="headline"
        label="Headline"
        hint={`${headline.length}/120. Shown under your name, e.g. "Building tools for remote teams".`}
        error={errors.headline}
      >
        <input
          id="headline"
          name="headline"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          maxLength={120}
          placeholder="What are you building?"
          aria-invalid={!!errors.headline}
          aria-describedby={errors.headline ? "headline-error" : "headline-hint"}
          className={inputClass}
        />
      </Field>

      <Field id="websiteUrl" label="Website" hint="Optional." error={errors.websiteUrl}>
        <input
          id="websiteUrl"
          name="websiteUrl"
          type="url"
          inputMode="url"
          defaultValue={user.websiteUrl ?? ""}
          placeholder="https://"
          aria-invalid={!!errors.websiteUrl}
          aria-describedby={errors.websiteUrl ? "websiteUrl-error" : "websiteUrl-hint"}
          className={inputClass}
        />
      </Field>

      <FormStatus status={state.status} message={state.message} />
      <button type="submit" disabled={pending} className={saveButtonClass}>
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
