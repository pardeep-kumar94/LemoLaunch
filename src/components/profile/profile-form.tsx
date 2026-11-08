"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { updateProfile, type FormState } from "@/app/profile/actions";
import { ImageUp } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { MAX_IMAGE_BYTES, MAX_IMAGE_LABEL } from "@/lib/image-compress";
import { uploadFiles } from "@/lib/upload-client";
import { cn } from "@/lib/utils";
import { Field, FormStatus, inputClass, saveButtonClass } from "./form-bits";

const socialFields = [
  { name: "xUrl", label: "X (Twitter)", placeholder: "https://x.com/yourname" },
  { name: "githubUrl", label: "GitHub", placeholder: "https://github.com/yourname" },
  { name: "linkedinUrl", label: "LinkedIn", placeholder: "https://www.linkedin.com/in/yourname" },
] as const;

export function ProfileForm({
  user,
}: {
  user: {
    name: string;
    headline: string | null;
    websiteUrl: string | null;
    xUrl: string | null;
    githubUrl: string | null;
    linkedinUrl: string | null;
    avatarUrl: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(updateProfile, { status: "idle" });
  const [, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);
  const [name, setName] = useState(user.name);
  const [headline, setHeadline] = useState(user.headline ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const errors: Record<string, string> = { ...state.fieldErrors, ...(uploadError ? { avatar: uploadError } : {}) };

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- preview mirrors the picked file
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    // A transition instead of the action prop keeps unsaved edits in place if a field is rejected.
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    // The photo goes straight to storage; the form only carries its URL.
    data.delete("avatar");
    setUploadError(null);
    if (file && !remove) {
      if (file.size > MAX_IMAGE_BYTES) {
        setUploadError(`Images can be up to ${MAX_IMAGE_LABEL}.`);
        return;
      }
      setUploading(true);
      const result = await uploadFiles([{ file, purpose: "avatar" }]);
      setUploading(false);
      if (!result.ok) {
        setUploadError(result.error);
        return;
      }
      data.set("avatarUrl", result.urls[0]);
    }
    startTransition(() => formAction(data));
  }

  const shownAvatar = remove ? null : (preview ?? user.avatarUrl);

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5">
      <div className="grid gap-2">
        <span className="text-sm font-medium">Profile photo</span>
        <div className="flex flex-wrap items-center gap-5">
          <UserAvatar name={name || user.name} src={shownAvatar} size="lg" className="ring-1 ring-border" />
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
                className={cn(buttonVariants({ variant: "outline" }), "peer-hover:bg-muted peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50")}
              >
                <ImageUp data-icon="inline-start" />
                {shownAvatar ? "Change photo" : "Upload photo"}
              </span>
            </span>
            {(user.avatarUrl || file) && (
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  name="removeAvatar"
                  checked={remove}
                  onChange={(e) => setRemove(e.target.checked)}
                  className="size-4 accent-[var(--primary)]"
                />
                Remove photo
              </label>
            )}
            {errors.avatar ? (
              <p id="avatar-error" className="text-sm font-medium text-destructive">{errors.avatar}</p>
            ) : (
              <p id="avatar-hint" className="text-[13px] text-muted-foreground">Square PNG, JPG or WebP, up to {MAX_IMAGE_LABEL}. We compress it for you.</p>
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

      <div className="grid gap-5 sm:grid-cols-2">
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

      {socialFields.map(({ name, label, placeholder }) => (
        <Field key={name} id={name} label={label} hint="Optional. Shown on your launch pages." error={errors[name]}>
          <input
            id={name}
            name={name}
            type="url"
            inputMode="url"
            defaultValue={user[name] ?? ""}
            placeholder={placeholder}
            aria-invalid={!!errors[name]}
            aria-describedby={errors[name] ? `${name}-error` : `${name}-hint`}
            className={inputClass}
          />
        </Field>
      ))}
      </div>

      <FormStatus status={state.status} message={state.message} />
      <button type="submit" disabled={pending || uploading} className={saveButtonClass}>
        {uploading ? "Uploading photo…" : pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
