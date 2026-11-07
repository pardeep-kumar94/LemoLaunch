"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { submitLaunch, type SubmitField, type SubmitLaunchState } from "@/app/actions";
import { CheckIcon, GlobeIcon, PhoneIcon } from "@/components/icons";
import { PLATFORMS, platformLabels, type Platform } from "@/lib/platforms";
import {
  MAX_FEATURE_LENGTH,
  MAX_FEATURES,
  MAX_TRIAL_DAYS,
  PRICING_MODELS,
  pricingLabels,
  type PricingModel,
} from "@/lib/product-page";

const pricingHints: Record<PricingModel, string> = {
  free: "Everything is free",
  freemium: "Free plan, paid upgrades",
  paid: "Paid plans only",
};

const initialState: SubmitLaunchState = { status: "idle" };

const MB = 1024 * 1024;
const IMAGE_TYPES = "image/png,image/jpeg,image/webp";
const VIDEO_TYPES = "video/mp4,video/webm";

const inputClass =
  "h-12 w-full rounded-xl border-2 border-line bg-paper px-3.5 text-ink placeholder:text-mist focus:border-ink focus:outline-none aria-[invalid=true]:border-danger";

/** Object URLs for picked files, revoked when the files change or the form unmounts. */
function usePreviews(files: File[]) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const next = files.map((f) => URL.createObjectURL(f));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- previews mirror the picked files
    setUrls(next);
    return () => next.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);
  return urls;
}

export function SubmitForm({
  topics,
  minLaunchDate,
  passAvailable,
  passPrice,
}: {
  topics: { slug: string; name: string }[];
  minLaunchDate: string;
  /** False when payments aren't configured; the pass is shown but can't be chosen. */
  passAvailable: boolean;
  passPrice: string;
}) {
  const [state, formAction, pending] = useActionState(submitLaunch, initialState);
  const [, startTransition] = useTransition();
  const [logo, setLogo] = useState<File[]>([]);
  const [gallery, setGallery] = useState<File[]>([]);
  const [videoMode, setVideoMode] = useState<"file" | "link">("file");
  const [platforms, setPlatforms] = useState<Platform[]>(["web"]);
  const [plan, setPlan] = useState<"free" | "pass">("free");
  const [description, setDescription] = useState("");
  const [pricing, setPricing] = useState<PricingModel | null>(null);
  const [featureCount, setFeatureCount] = useState(3);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [clientErrors, setClientErrors] = useState<Partial<Record<SubmitField, string>>>({});
  const logoPreview = usePreviews(logo);
  const galleryPreviews = usePreviews(gallery);

  if (state.status === "submitted") {
    return (
      <div role="status" className="rounded-[22px] border-2 border-ink bg-paper p-8 shadow-[6px_6px_0_0_var(--pop)]">
        <h2 className="font-display text-2xl font-bold">{state.name} is scheduled</h2>
        <p className="mt-2 text-mist">
          It goes live at 00:00 UTC on <span className="font-semibold text-ink">{state.launchDay}</span>. You can
          cancel it from My products any time before then.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/products/${state.slug}`}
            className="press inline-flex h-12 items-center rounded-xl border-2 border-on-signal bg-signal px-5 font-bold text-on-signal shadow-[4px_4px_0_0_var(--pop)]"
          >
            See your launch page
          </Link>
          <Link
            href={`/products/${state.slug}#badge`}
            className="inline-flex h-12 items-center rounded-xl border-2 border-line px-5 font-semibold"
          >
            Get badge
          </Link>
          <Link href="/profile" className="inline-flex h-12 items-center rounded-xl border-2 border-line px-5 font-semibold">
            My products
          </Link>
        </div>
      </div>
    );
  }

  const serverErrors = state.status === "error" ? state.errors : {};
  const errors: Partial<Record<SubmitField | "form", string>> = { ...serverErrors, ...clientErrors };

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    // Submitting through a transition (not the form's action prop) keeps the picked files
    // in place if the server asks for a fix.
    event.preventDefault();
    const found: Partial<Record<SubmitField, string>> = {};
    if (description.trim().length < 20) found.description = "Describe your product in 20 to 600 characters.";
    if (platforms.length === 0) found.platforms = "Choose at least one: website, iPhone app or Android app.";
    if (!pricing) found.pricingModel = "Choose how your product is priced.";
    if (logo.length === 0) found.logo = "Add your product's logo.";
    else if (logo[0].size > 5 * MB) found.logo = "Images can be up to 5 MB.";
    if (gallery.length === 0) found.gallery = "Add at least one screenshot.";
    else if (gallery.length > 4) found.gallery = "Add up to 4 screenshots.";
    else if (gallery.some((f) => f.size > 5 * MB)) found.gallery = "Images can be up to 5 MB.";
    if (videoMode === "file" && videoFile && videoFile.size > 50 * MB) found.video = "Videos can be up to 50 MB.";
    setClientErrors(found);
    if (Object.keys(found).length > 0) return;

    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-7">
      {errors.form && (
        <p role="alert" className="rounded-xl border-2 border-danger/40 bg-pop-wash px-4 py-3 font-semibold">
          {errors.form}
        </p>
      )}

      <fieldset className="grid gap-4" aria-describedby={errors.plan ? "plan-error" : undefined}>
        <legend className="mb-4 font-display text-xl font-extrabold">How do you want to launch?</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <PlanCard
            value="free"
            checked={plan === "free"}
            onSelect={() => setPlan("free")}
            title="Free launch"
            price="Free"
            perks={["Published right away", "Goes live on the next open launch day", "Ranked by upvotes like everyone"]}
          />
          <PlanCard
            value="pass"
            checked={plan === "pass"}
            onSelect={() => passAvailable && setPlan("pass")}
            disabled={!passAvailable}
            title="Launch Pass"
            price={passAvailable ? passPrice : "Coming soon"}
            highlight
            perks={[
              "Pick your own launch day",
              "Featured card and 7 days in Featured launches",
              "Cancel before launch for a full refund",
            ]}
          />
        </div>
        {errors.plan && (
          <p id="plan-error" className="text-sm font-semibold text-danger">{errors.plan}</p>
        )}
        <p className="text-sm text-mist">
          Paying never buys upvotes or rank: every launch is ranked by the community.{" "}
          <Link href="/pricing" className="font-semibold text-ink underline decoration-pop decoration-2 underline-offset-4">
            Compare plans
          </Link>
        </p>
      </fieldset>

      <fieldset className="grid gap-6 border-t-2 border-line pt-7">
        <legend className="mb-4 font-display text-xl font-extrabold">The basics</legend>
        <Field id="name" label="Product name" error={errors.name}>
          <input id="name" name="name" maxLength={60} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} className={inputClass} />
        </Field>
        <fieldset className="grid gap-3" aria-describedby={errors.platforms ? "platforms-error" : "platforms-hint"}>
          <legend className="mb-1.5 font-semibold">Where can people get it?</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {PLATFORMS.map((platform) => {
              const checked = platforms.includes(platform);
              return (
                <label
                  key={platform}
                  className={`relative flex cursor-pointer items-center gap-3 rounded-[14px] border-2 p-3.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${
                    checked ? "border-ink bg-signal-wash" : "border-line bg-paper hover:border-ink/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    name="platforms"
                    value={platform}
                    checked={checked}
                    onChange={() =>
                      setPlatforms((current) =>
                        current.includes(platform) ? current.filter((p) => p !== platform) : [...current, platform],
                      )
                    }
                    className="sr-only"
                  />
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-[10px] ${
                      checked ? "bg-on-signal text-signal" : "bg-concrete text-mist"
                    }`}
                  >
                    {platform === "web" ? <GlobeIcon className="size-5" /> : <PhoneIcon className="size-5" />}
                  </span>
                  <span className="leading-tight">
                    <span className="block font-bold">{platformLabels[platform].short}</span>
                    <span className="text-xs text-mist">{platformLabels[platform].long}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`absolute top-2.5 right-2.5 grid size-5 place-items-center rounded-full border-2 ${
                      checked ? "border-on-signal bg-on-signal text-signal" : "border-line"
                    }`}
                  >
                    {checked && <CheckIcon className="size-3" />}
                  </span>
                </label>
              );
            })}
          </div>
          {errors.platforms ? (
            <p id="platforms-error" className="text-sm font-semibold text-danger">{errors.platforms}</p>
          ) : (
            <p id="platforms-hint" className="text-sm text-mist">Choose all that apply. Each one needs its link.</p>
          )}
        </fieldset>

        {platforms.includes("web") && (
          <Field id="websiteUrl" label="Website link" error={errors.websiteUrl}>
            <input id="websiteUrl" name="websiteUrl" type="url" inputMode="url" placeholder="https://" aria-invalid={!!errors.websiteUrl} aria-describedby={errors.websiteUrl ? "websiteUrl-error" : undefined} className={inputClass} />
          </Field>
        )}
        {platforms.includes("ios") && (
          <Field id="appStoreUrl" label="App Store link" error={errors.appStoreUrl}>
            <input id="appStoreUrl" name="appStoreUrl" type="url" inputMode="url" placeholder="https://apps.apple.com/app/your-app/id123456789" aria-invalid={!!errors.appStoreUrl} aria-describedby={errors.appStoreUrl ? "appStoreUrl-error" : undefined} className={inputClass} />
          </Field>
        )}
        {platforms.includes("android") && (
          <Field id="playStoreUrl" label="Google Play link" error={errors.playStoreUrl}>
            <input id="playStoreUrl" name="playStoreUrl" type="url" inputMode="url" placeholder="https://play.google.com/store/apps/details?id=com.example.app" aria-invalid={!!errors.playStoreUrl} aria-describedby={errors.playStoreUrl ? "playStoreUrl-error" : undefined} className={inputClass} />
          </Field>
        )}
        <Field id="tagline" label="Tagline" hint="One line on what it does, 80 characters or fewer." error={errors.tagline}>
          <input id="tagline" name="tagline" maxLength={80} aria-invalid={!!errors.tagline} aria-describedby={errors.tagline ? "tagline-error" : "tagline-hint"} className={inputClass} />
        </Field>
        <Field
          id="description"
          label="Description"
          hint={`${description.length}/600. What it does, who it's for, and what makes it different.`}
          error={errors.description}
        >
          <textarea
            id="description"
            name="description"
            rows={4}
            maxLength={600}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-invalid={!!errors.description}
            aria-describedby={errors.description ? "description-error" : "description-hint"}
            className={`${inputClass} h-auto resize-y py-3`}
          />
        </Field>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field id="topicSlug" label="Category" error={errors.topicSlug}>
            <select id="topicSlug" name="topicSlug" defaultValue="" aria-invalid={!!errors.topicSlug} aria-describedby={errors.topicSlug ? "topicSlug-error" : undefined} className={inputClass}>
              <option value="" disabled>
                Choose a category
              </option>
              {topics.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          {plan === "pass" ? (
            <Field id="launchDate" label="Launch day" hint="Your pick. Goes live at 00:00 UTC." error={errors.launchDate}>
              <input id="launchDate" name="launchDate" type="date" min={minLaunchDate} defaultValue={minLaunchDate} aria-invalid={!!errors.launchDate} aria-describedby={errors.launchDate ? "launchDate-error" : "launchDate-hint"} className={inputClass} />
            </Field>
          ) : (
            <div className="grid gap-1.5">
              <span className="font-semibold">Launch day</span>
              <p className="flex min-h-12 items-center rounded-xl border-2 border-dashed border-line px-3.5 text-sm text-mist">
                The next open day, set automatically
              </p>
            </div>
          )}
        </div>
      </fieldset>

      <fieldset className="grid gap-6 border-t-2 border-line pt-7">
        <legend className="mb-4 font-display text-xl font-extrabold">Pricing and features</legend>
        <fieldset className="grid gap-3" aria-describedby={errors.pricingModel ? "pricingModel-error" : undefined}>
          <legend className="mb-1.5 font-semibold">How is it priced?</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {PRICING_MODELS.map((model) => {
              const checked = pricing === model;
              return (
                <label
                  key={model}
                  className={`flex cursor-pointer flex-col rounded-[14px] border-2 p-3.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${
                    checked ? "border-ink bg-signal-wash" : "border-line bg-paper hover:border-ink/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="pricingModel"
                    value={model}
                    checked={checked}
                    onChange={() => setPricing(model)}
                    className="sr-only"
                  />
                  <span className="font-bold">{pricingLabels[model]}</span>
                  <span className="text-xs text-mist">{pricingHints[model]}</span>
                </label>
              );
            })}
          </div>
          {errors.pricingModel && (
            <p id="pricingModel-error" className="text-sm font-semibold text-danger">{errors.pricingModel}</p>
          )}
        </fieldset>
        {(pricing === "freemium" || pricing === "paid") && (
          <Field id="freeTrialDays" label="Free trial (optional)" hint="Number of days, if you offer a trial." error={errors.freeTrialDays}>
            <input id="freeTrialDays" name="freeTrialDays" type="number" inputMode="numeric" min={1} max={MAX_TRIAL_DAYS} placeholder="e.g. 14" aria-invalid={!!errors.freeTrialDays} aria-describedby={errors.freeTrialDays ? "freeTrialDays-error" : "freeTrialDays-hint"} className={`${inputClass} sm:max-w-48`} />
          </Field>
        )}
        <fieldset className="grid gap-2.5" aria-describedby={errors.features ? "features-error" : "features-hint"}>
          <legend className="mb-1 font-semibold">Key features (optional)</legend>
          {Array.from({ length: featureCount }, (_, i) => (
            <input
              key={i}
              name="features"
              maxLength={MAX_FEATURE_LENGTH}
              aria-label={`Feature ${i + 1}`}
              placeholder={i === 0 ? "e.g. Shared map everyone can edit" : ""}
              className={inputClass}
            />
          ))}
          {featureCount < MAX_FEATURES && (
            <button
              type="button"
              onClick={() => setFeatureCount((n) => Math.min(n + 1, MAX_FEATURES))}
              className="justify-self-start text-sm font-semibold underline decoration-pop decoration-2 underline-offset-4"
            >
              Add another feature
            </button>
          )}
          {errors.features ? (
            <p id="features-error" className="text-sm font-semibold text-danger">{errors.features}</p>
          ) : (
            <p id="features-hint" className="text-sm text-mist">
              Up to {MAX_FEATURES}, one short line each. Shown as a checklist on your launch page.
            </p>
          )}
        </fieldset>
      </fieldset>

      <fieldset className="grid gap-6 border-t-2 border-line pt-7">
        <legend className="sr-only">Media</legend>
        <p aria-hidden="true" className="-mb-2 font-display text-xl font-extrabold">
          Logo, screenshots and video
        </p>

        <Field id="logo" label="Logo" hint="Square PNG, JPG or WebP, up to 5 MB." error={errors.logo}>
          <div className="flex items-center gap-4">
            <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-[18px] border-2 border-dashed border-line bg-paper">
              {logoPreview[0] ? (
                // eslint-disable-next-line @next/next/no-img-element -- local preview of a picked file
                <img src={logoPreview[0]} alt="Logo preview" className="size-full object-cover" />
              ) : (
                <span className="text-xs text-mist">No logo</span>
              )}
            </span>
            <FilePicker
              id="logo"
              name="logo"
              accept={IMAGE_TYPES}
              label={logo.length ? "Change logo" : "Choose logo"}
              invalid={!!errors.logo}
              describedBy={errors.logo ? "logo-error" : "logo-hint"}
              onFiles={(f) => setLogo(f.slice(0, 1))}
            />
          </div>
        </Field>

        <Field id="gallery" label="Screenshots" hint="1 to 4 images, up to 5 MB each. The first one is the cover." error={errors.gallery}>
          <div className="grid gap-3">
            {galleryPreviews.length > 0 && (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {galleryPreviews.map((url, i) => (
                  <li key={url} className="relative aspect-[16/10] overflow-hidden rounded-xl border-2 border-line bg-paper">
                    {/* eslint-disable-next-line @next/next/no-img-element -- local preview of a picked file */}
                    <img src={url} alt={`Screenshot ${i + 1} preview`} className="size-full object-cover" />
                    {i === 0 && (
                      <span className="absolute top-1.5 left-1.5 rounded-md bg-signal px-1.5 text-[11px] font-bold text-on-signal">
                        Cover
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <FilePicker
              id="gallery"
              name="gallery"
              accept={IMAGE_TYPES}
              multiple
              label={gallery.length ? `Change screenshots (${gallery.length} chosen)` : "Choose screenshots"}
              invalid={!!errors.gallery}
              describedBy={errors.gallery ? "gallery-error" : "gallery-hint"}
              onFiles={setGallery}
            />
          </div>
        </Field>

        <div className="grid gap-2">
          <span id="video-label" className="font-semibold">
            Product video <span className="font-normal text-mist">(optional)</span>
          </span>
          <div role="radiogroup" aria-labelledby="video-label" className="flex w-fit gap-1 rounded-xl border-2 border-line bg-paper p-1">
            {(["file", "link"] as const).map((mode) => (
              <label
                key={mode}
                className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink ${
                  videoMode === mode ? "bg-on-signal text-signal" : "text-mist"
                }`}
              >
                <input
                  type="radio"
                  name="videoMode"
                  value={mode}
                  checked={videoMode === mode}
                  onChange={() => setVideoMode(mode)}
                  className="sr-only"
                />
                {mode === "file" ? "Upload a file" : "Paste a link"}
              </label>
            ))}
          </div>
          {videoMode === "file" ? (
            <div className="grid gap-1.5">
              <FilePicker
                id="videoFile"
                name="videoFile"
                accept={VIDEO_TYPES}
                label={videoFile ? "Change video" : "Choose video"}
                invalid={!!errors.video}
                describedBy={errors.video ? "video-error" : "video-hint"}
                onFiles={(f) => setVideoFile(f[0] ?? null)}
              />
              {videoFile && (
                <p className="text-sm">
                  {videoFile.name} <span className="text-mist">({(videoFile.size / MB).toFixed(1)} MB)</span>
                </p>
              )}
              <p id="video-hint" className="text-sm text-mist">A short demo helps people get it quickly. MP4 or WebM, up to 50 MB.</p>
            </div>
          ) : (
            <div className="grid gap-1.5">
              <label htmlFor="videoLink" className="sr-only">
                Video link
              </label>
              <input
                id="videoLink"
                name="videoLink"
                type="url"
                inputMode="url"
                placeholder="https://www.youtube.com/watch?v=…"
                aria-invalid={!!errors.video}
                aria-describedby={errors.video ? "video-error" : "video-hint"}
                className={inputClass}
              />
              <p id="video-hint" className="text-sm text-mist">A short demo helps people get it quickly. A YouTube, Vimeo or Loom link.</p>
            </div>
          )}
          {errors.video && (
            <p id="video-error" className="text-sm font-semibold text-danger">
              {errors.video}
            </p>
          )}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="press h-14 rounded-2xl border-2 border-on-signal bg-signal text-lg font-bold text-on-signal shadow-[4px_4px_0_0_var(--pop)] disabled:opacity-60 sm:justify-self-start sm:px-10"
      >
        {pending
          ? plan === "pass"
            ? "Saving and opening checkout…"
            : "Uploading and submitting…"
          : plan === "pass"
            ? `Continue to payment (${passPrice})`
            : "Publish launch"}
      </button>
    </form>
  );
}

function FilePicker({
  id,
  name,
  accept,
  multiple,
  label,
  invalid,
  describedBy,
  onFiles,
}: {
  id: string;
  name: string;
  accept: string;
  multiple?: boolean;
  label: string;
  invalid: boolean;
  describedBy: string;
  onFiles: (files: File[]) => void;
}) {
  return (
    <span className="relative inline-flex w-fit">
      <input
        id={id}
        name={name}
        type="file"
        accept={accept}
        multiple={multiple}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        onChange={(e) => onFiles(Array.from(e.currentTarget.files ?? []))}
        className="peer absolute inset-0 cursor-pointer opacity-0"
      />
      <span
        aria-hidden="true"
        className="inline-flex h-11 items-center rounded-xl border-2 border-ink bg-paper px-4 font-semibold shadow-[3px_3px_0_0_var(--ink)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink peer-aria-[invalid=true]:border-danger"
      >
        {label}
      </span>
    </span>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm font-semibold text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-sm text-mist">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

function PlanCard({
  value,
  checked,
  onSelect,
  disabled = false,
  title,
  price,
  perks,
  highlight = false,
}: {
  value: "free" | "pass";
  checked: boolean;
  onSelect: () => void;
  disabled?: boolean;
  title: string;
  price: string;
  perks: string[];
  highlight?: boolean;
}) {
  return (
    <label
      className={`relative grid cursor-pointer gap-3 rounded-[18px] border-2 p-5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${
        disabled
          ? "cursor-not-allowed border-line opacity-60"
          : checked
            ? highlight
              ? "medal-card medal-gold"
              : "border-ink bg-signal-wash"
            : "border-line bg-paper hover:border-ink/50"
      }`}
    >
      <input
        type="radio"
        name="plan"
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
        className="sr-only"
      />
      <span className="flex items-start justify-between gap-3">
        <span>
          <span className="block font-display text-xl font-extrabold">{title}</span>
          <span className="font-display text-2xl font-extrabold">{price}</span>
        </span>
        <span
          aria-hidden="true"
          className={`mt-1 grid size-6 shrink-0 place-items-center rounded-full border-2 ${
            checked ? "border-on-signal bg-on-signal text-signal" : "border-line"
          }`}
        >
          {checked && <CheckIcon className="size-3.5" />}
        </span>
      </span>
      <ul className="grid gap-1.5 text-sm">
        {perks.map((perk) => (
          <li key={perk} className="flex gap-2">
            <CheckIcon className="mt-0.5 size-4 shrink-0" />
            {perk}
          </li>
        ))}
      </ul>
    </label>
  );
}
