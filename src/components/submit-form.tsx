"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronUp, Globe, ImagePlus, Smartphone } from "lucide-react";
import { submitLaunch, type SubmitField, type SubmitLaunchState } from "@/app/actions";
import { SeatGrid } from "@/components/seats";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PLATFORMS, platformLabels, type Platform } from "@/lib/platforms";
import { MAX_IMAGE_BYTES, MAX_IMAGE_LABEL } from "@/lib/image-compress";
import { track } from "@/lib/analytics";
import { uploadFiles } from "@/lib/upload-client";
import {
  MAX_FEATURE_LENGTH,
  MAX_FEATURES,
  MAX_TRIAL_DAYS,
  PRICING_MODELS,
  pricingLabels,
  type PricingModel,
} from "@/lib/product-page";
import { cn } from "@/lib/utils";

const pricingHints: Record<PricingModel, string> = {
  free: "Everything is free",
  freemium: "Free plan, paid upgrades",
  paid: "Paid plans only",
};

const initialState: SubmitLaunchState = { status: "idle" };

const IMAGE_TYPES = "image/png,image/jpeg,image/webp";

const inputClass = "h-10 bg-card shadow-xs";

/** A selectable card wrapping a visually hidden radio or checkbox. */
const choiceClass = (checked: boolean) =>
  cn(
    "relative flex cursor-pointer rounded-2xl bg-card ring-1 transition-[box-shadow,background-color] has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
    checked ? "shadow-lift ring-2 ring-primary" : "shadow-paper ring-border hover:ring-input",
  );

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
  queue,
  aside,
}: {
  topics: { slug: string; name: string }[];
  /** Where a launch submitted now would land. `seat` is its zero-based seat on that day. */
  queue: { launchDay: string; ahead: number; seat: number; dailyLimit: number };
  /** Extra content under the summary card, e.g. how launch day works. */
  aside?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(submitLaunch, initialState);
  const [, startTransition] = useTransition();
  const [logo, setLogo] = useState<File[]>([]);
  const [gallery, setGallery] = useState<File[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>(["web"]);
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [topicSlug, setTopicSlug] = useState("");
  const [description, setDescription] = useState("");
  const [pricing, setPricing] = useState<PricingModel | null>(null);
  const [featureCount, setFeatureCount] = useState(3);
  const [clientErrors, setClientErrors] = useState<Partial<Record<SubmitField | "form", string>>>({});
  /** Upload progress from 0 to 1 while files go to storage, otherwise null. */
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const logoPreview = usePreviews(logo);
  const galleryPreviews = usePreviews(gallery);

  useEffect(() => {
    if (state.status === "submitted") {
      track("launch_submitted", { pricing_model: pricing, product_slug: state.slug, screenshots: gallery.length });
    }
    // Once per successful submission.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (state.status === "submitted") {
    return (
      <div role="status" className="max-w-2xl rounded-2xl bg-card p-6 shadow-lift ring-1 ring-border sm:p-8">
        <span className="grid size-11 place-items-center rounded-xl bg-lemon text-on-lemon">
          <Check className="size-5" strokeWidth={2.5} aria-hidden />
        </span>
        <h2 className="mt-5 font-display text-3xl font-bold sm:text-4xl">{state.name} has a seat</h2>
        <p className="mt-3 text-[17px] text-muted-foreground">
          It goes live at 00:00 UTC on <span className="font-medium text-foreground">{state.launchDay}</span>. You
          can cancel it from My products any time before then.
        </p>
        <div className="mt-7 flex flex-wrap gap-2.5">
          <Button asChild size="lg">
            <Link href={`/products/${state.slug}`}>
              See your launch page
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={`/products/${state.slug}#badge`}>Get badge</Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href="/profile">My products</Link>
          </Button>
        </div>
      </div>
    );
  }

  const serverErrors = state.status === "error" ? state.errors : {};
  const errors: Partial<Record<SubmitField | "form", string>> = { ...serverErrors, ...clientErrors };
  const busy = pending || uploadProgress !== null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    // Submitting through a transition (not the form's action prop) keeps the picked files
    // in place if the server asks for a fix.
    event.preventDefault();
    const found: Partial<Record<SubmitField, string>> = {};
    if (description.trim().length < 20) found.description = "Describe your product in 20 to 600 characters.";
    if (platforms.length === 0) found.platforms = "Choose at least one: website, iPhone app or Android app.";
    if (!pricing) found.pricingModel = "Choose how your product is priced.";
    if (logo.length === 0) found.logo = "Add your product's logo.";
    else if (logo[0].size > MAX_IMAGE_BYTES) found.logo = `Images can be up to ${MAX_IMAGE_LABEL}.`;
    if (gallery.length === 0) found.gallery = "Add at least one screenshot.";
    else if (gallery.length > 4) found.gallery = "Add up to 4 screenshots.";
    else if (gallery.some((f) => f.size > MAX_IMAGE_BYTES)) found.gallery = `Images can be up to ${MAX_IMAGE_LABEL} each.`;
    setClientErrors(found);
    if (Object.keys(found).length > 0) return;

    // Files go straight to storage first; the form then carries only their URLs, which keeps
    // the request small enough for serverless hosting.
    const data = new FormData(event.currentTarget);
    setUploadProgress(0);
    const result = await uploadFiles(
      [
        { file: logo[0], purpose: "logo" as const },
        ...gallery.map((file) => ({ file, purpose: "screenshot" as const })),
      ],
      setUploadProgress,
    );
    setUploadProgress(null);
    if (!result.ok) {
      const field: SubmitField | "form" =
        result.index === undefined ? "form" : result.index === 0 ? "logo" : "gallery";
      setClientErrors({ [field]: result.error });
      return;
    }

    for (const field of ["logo", "gallery"]) data.delete(field);
    const [logoUrl, ...rest] = result.urls;
    data.set("logoUrl", logoUrl);
    rest.forEach((url) => data.append("galleryUrls", url));
    startTransition(() => formAction(data));
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="grid grid-cols-[minmax(0,1fr)] items-start gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12"
    >
      <div className="grid min-w-0 gap-12">
        {errors.form && (
          <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 font-medium text-destructive ring-1 ring-destructive/25">
            {errors.form}
          </p>
        )}

        <Section title="The basics">
          <Field id="name" label="Product name" error={errors.name}>
            <Input
              id="name"
              name="name"
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
              className={inputClass}
            />
          </Field>
          <Field id="tagline" label="Tagline" hint="One line on what it does, 80 characters or fewer." error={errors.tagline}>
            <Input
              id="tagline"
              name="tagline"
              maxLength={80}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              aria-invalid={!!errors.tagline}
              aria-describedby={errors.tagline ? "tagline-error" : "tagline-hint"}
              className={inputClass}
            />
          </Field>
          <Field
            id="description"
            label="Description"
            hint={`${description.length}/600. What it does, who it's for, and what makes it different.`}
            error={errors.description}
          >
            <Textarea
              id="description"
              name="description"
              rows={4}
              maxLength={600}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? "description-error" : "description-hint"}
              className="min-h-28 resize-y bg-card shadow-xs"
            />
          </Field>
          <Field id="topicSlug" label="Category" error={errors.topicSlug}>
            <Select name="topicSlug" value={topicSlug} onValueChange={setTopicSlug}>
              <SelectTrigger
                id="topicSlug"
                aria-invalid={!!errors.topicSlug}
                aria-describedby={errors.topicSlug ? "topicSlug-error" : undefined}
                className="h-10! w-full bg-card shadow-xs sm:max-w-xs"
              >
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent position="popper">
                {topics.map((t) => (
                  <SelectItem key={t.slug} value={t.slug}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <fieldset className="grid gap-3" aria-describedby={errors.platforms ? "platforms-error" : "platforms-hint"}>
            <legend className="mb-2 text-sm font-medium">Where can people get it?</legend>
            <div className="grid gap-2.5 sm:grid-cols-3">
              {PLATFORMS.map((platform) => {
                const checked = platforms.includes(platform);
                const Icon = platform === "web" ? Globe : Smartphone;
                return (
                  <label key={platform} className={cn(choiceClass(checked), "items-center gap-3 p-3.5")}>
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
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-[10px] transition-colors",
                        checked ? "bg-lemon text-on-lemon" : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="size-[18px]" aria-hidden />
                    </span>
                    <span className="min-w-0 leading-tight">
                      <span className="block font-semibold">{platformLabels[platform].short}</span>
                      <span className="text-xs text-muted-foreground">{platformLabels[platform].long}</span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute top-2.5 right-2.5 grid size-4 place-items-center rounded-[5px] border transition-colors",
                        checked ? "border-primary bg-primary text-primary-foreground" : "border-input",
                      )}
                    >
                      {checked && <Check className="size-3" strokeWidth={3} />}
                    </span>
                  </label>
                );
              })}
            </div>
            {errors.platforms ? (
              <p id="platforms-error" className="text-sm font-medium text-destructive">{errors.platforms}</p>
            ) : (
              <p id="platforms-hint" className="text-sm text-muted-foreground">Choose all that apply. Each one needs its link.</p>
            )}
          </fieldset>

          {platforms.includes("web") && (
            <Field id="websiteUrl" label="Website link" error={errors.websiteUrl}>
              <Input id="websiteUrl" name="websiteUrl" type="url" inputMode="url" placeholder="https://" aria-invalid={!!errors.websiteUrl} aria-describedby={errors.websiteUrl ? "websiteUrl-error" : undefined} className={inputClass} />
            </Field>
          )}
          {platforms.includes("ios") && (
            <Field id="appStoreUrl" label="App Store link" error={errors.appStoreUrl}>
              <Input id="appStoreUrl" name="appStoreUrl" type="url" inputMode="url" placeholder="https://apps.apple.com/app/your-app/id123456789" aria-invalid={!!errors.appStoreUrl} aria-describedby={errors.appStoreUrl ? "appStoreUrl-error" : undefined} className={inputClass} />
            </Field>
          )}
          {platforms.includes("android") && (
            <Field id="playStoreUrl" label="Google Play link" error={errors.playStoreUrl}>
              <Input id="playStoreUrl" name="playStoreUrl" type="url" inputMode="url" placeholder="https://play.google.com/store/apps/details?id=com.example.app" aria-invalid={!!errors.playStoreUrl} aria-describedby={errors.playStoreUrl ? "playStoreUrl-error" : undefined} className={inputClass} />
            </Field>
          )}
        </Section>

        <Section title="Pricing and features">
          <fieldset className="grid gap-3" aria-describedby={errors.pricingModel ? "pricingModel-error" : undefined}>
            <legend className="mb-2 text-sm font-medium">How is it priced?</legend>
            <div className="grid gap-2.5 sm:grid-cols-3">
              {PRICING_MODELS.map((model) => {
                const checked = pricing === model;
                return (
                  <label key={model} className={cn(choiceClass(checked), "flex-col p-3.5")}>
                    <input
                      type="radio"
                      name="pricingModel"
                      value={model}
                      checked={checked}
                      onChange={() => setPricing(model)}
                      className="sr-only"
                    />
                    <span className="font-semibold">{pricingLabels[model]}</span>
                    <span className="text-xs text-muted-foreground">{pricingHints[model]}</span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute top-3 right-3 grid size-4 place-items-center rounded-full border transition-colors",
                        checked ? "border-primary" : "border-input",
                      )}
                    >
                      {checked && <span className="size-2 rounded-full bg-primary" />}
                    </span>
                  </label>
                );
              })}
            </div>
            {errors.pricingModel && (
              <p id="pricingModel-error" className="text-sm font-medium text-destructive">{errors.pricingModel}</p>
            )}
          </fieldset>
          {(pricing === "freemium" || pricing === "paid") && (
            <Field id="freeTrialDays" label="Free trial (optional)" hint="Number of days, if you offer a trial." error={errors.freeTrialDays}>
              <Input id="freeTrialDays" name="freeTrialDays" type="number" inputMode="numeric" min={1} max={MAX_TRIAL_DAYS} placeholder="e.g. 14" aria-invalid={!!errors.freeTrialDays} aria-describedby={errors.freeTrialDays ? "freeTrialDays-error" : "freeTrialDays-hint"} className={cn(inputClass, "sm:max-w-40")} />
            </Field>
          )}
          <fieldset className="grid gap-2.5" aria-describedby={errors.features ? "features-error" : "features-hint"}>
            <legend className="mb-2 text-sm font-medium">
              Key features <span className="font-normal text-muted-foreground">(optional)</span>
            </legend>
            {Array.from({ length: featureCount }, (_, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground">
                  <Check className="size-3.5" strokeWidth={2.5} />
                </span>
                <Input
                  name="features"
                  maxLength={MAX_FEATURE_LENGTH}
                  aria-label={`Feature ${i + 1}`}
                  placeholder={i === 0 ? "e.g. Shared map everyone can edit" : ""}
                  className={inputClass}
                />
              </div>
            ))}
            {featureCount < MAX_FEATURES && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setFeatureCount((n) => Math.min(n + 1, MAX_FEATURES))}
                className="justify-self-start"
              >
                Add another feature
              </Button>
            )}
            {errors.features ? (
              <p id="features-error" className="text-sm font-medium text-destructive">{errors.features}</p>
            ) : (
              <p id="features-hint" className="text-sm text-muted-foreground">
                Up to {MAX_FEATURES}, one short line each. Shown as a checklist on your launch page.
              </p>
            )}
          </fieldset>
        </Section>

        <Section title="Logo, screenshots and video">
          <Field id="logo" label="Logo" hint={`Square PNG, JPG or WebP, up to ${MAX_IMAGE_LABEL}. We compress it for you.`} error={errors.logo}>
            <div className="flex items-center gap-4">
              <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-[20px] border border-dashed border-input bg-card">
                {logoPreview[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local preview of a picked file
                  <img src={logoPreview[0]} alt="Logo preview" className="size-full object-cover" />
                ) : (
                  <ImagePlus className="size-5 text-muted-foreground" aria-hidden />
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

          <Field id="gallery" label="Screenshots" hint={`1 to 4 images, up to ${MAX_IMAGE_LABEL} each. The first one is the cover. We compress them for you.`} error={errors.gallery}>
            <div className="grid gap-3">
              {galleryPreviews.length > 0 && (
                <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {galleryPreviews.map((url, i) => (
                    <li key={url} className="relative aspect-[16/10] overflow-hidden rounded-xl bg-card ring-1 ring-border">
                      {/* eslint-disable-next-line @next/next/no-img-element -- local preview of a picked file */}
                      <img src={url} alt={`Screenshot ${i + 1} preview`} className="size-full object-cover" />
                      {i === 0 && (
                        <Badge variant="lemon" className="absolute top-1.5 left-1.5">
                          Cover
                        </Badge>
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

          <Field
            id="videoLink"
            label="Product video (optional)"
            hint="A short demo helps people get it quickly. A YouTube, Vimeo or Loom link."
            error={errors.video}
            errorId="video-error"
            hintId="video-hint"
          >
            <Input
              id="videoLink"
              name="videoLink"
              type="url"
              inputMode="url"
              placeholder="https://www.youtube.com/watch?v=…"
              aria-invalid={!!errors.video}
              aria-describedby={errors.video ? "video-error" : "video-hint"}
              className={inputClass}
            />
          </Field>
        </Section>

        <Section
          title="Take your seat"
          description={`Every day has ${queue.dailyLimit} launch seats, free for everyone. The community decides the order.`}
        >
          <div className="grid items-center gap-6 rounded-2xl bg-card p-5 shadow-paper ring-1 ring-border sm:grid-cols-[200px_minmax(0,1fr)] sm:p-6">
            <SeatGrid
              total={queue.dailyLimit}
              filled={queue.seat}
              highlight={queue.seat}
              tone="queued"
              className="w-full max-w-[200px] gap-[3px]"
            />
            <div>
              <p className="text-[13px] text-muted-foreground">Your seat</p>
              <p className="mt-1 font-display text-3xl leading-[1.02] font-bold">{queue.launchDay}</p>
              <p className="num mt-2 text-[13px]">
                Seat {queue.seat + 1} of {queue.dailyLimit} · 00:00 UTC
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {queue.ahead === 0
                  ? "Nobody is ahead of you in the queue."
                  : `${queue.ahead} ${queue.ahead === 1 ? "launch is" : "launches are"} ahead of you in the queue.`}
              </p>
            </div>
          </div>
        </Section>
      </div>

      <aside className="grid gap-5 lg:sticky lg:top-24">
        <div className="rounded-2xl bg-card p-5 shadow-paper ring-1 ring-border sm:p-6">
          <p className="text-[13px] text-muted-foreground">How it will look</p>
          <div className="mt-3 flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-[11px] bg-muted">
              {logoPreview[0] ? (
                // eslint-disable-next-line @next/next/no-img-element -- local preview of a picked file
                <img src={logoPreview[0]} alt="" className="size-full object-cover" />
              ) : (
                <span className="font-display text-lg font-bold text-muted-foreground">{name.trim().charAt(0) || "?"}</span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{name.trim() || "Your product"}</span>
              <span className="block truncate text-[13px] text-muted-foreground">{tagline.trim() || "Your one-line tagline"}</span>
            </span>
            <span
              aria-hidden
              className="num grid h-12 w-11 shrink-0 place-items-center content-center gap-0.5 rounded-[11px] border border-border bg-card text-[13px] font-semibold shadow-xs"
            >
              <ChevronUp className="size-3.5" strokeWidth={2.5} />0
            </span>
          </div>
          <div className="my-5 border-t border-dashed border-input" />
          <dl className="grid gap-2.5 text-sm">
            <SummaryRow label="Goes live">{queue.launchDay}</SummaryRow>
            <SummaryRow label="Seat">
              <span className="num">
                {queue.seat + 1} of {queue.dailyLimit}
              </span>
            </SummaryRow>
            {topicSlug && <SummaryRow label="Category">{topics.find((t) => t.slug === topicSlug)?.name}</SummaryRow>}
          </dl>
          <Button type="submit" size="lg" disabled={busy} className="mt-5 w-full">
            {uploadProgress !== null
              ? `Uploading files… ${Math.round(uploadProgress * 100)}%`
              : pending
                ? "Publishing…"
                : "Publish launch"}
            {!busy && <ArrowRight data-icon="inline-end" />}
          </Button>
          {uploadProgress !== null && (
            <span aria-hidden className="mt-3 block h-1 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full bg-lemon-deep transition-[width]"
                style={{ width: `${Math.round(uploadProgress * 100)}%` }}
              />
            </span>
          )}
          <p className="mt-3 text-center text-xs text-muted-foreground">You can cancel any time before it goes live.</p>
        </div>
        {aside}
      </aside>
    </form>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-6">
      <div>
        <h2 className="font-display text-[26px] font-bold">{title}</h2>
        {description && <p className="mt-1 max-w-[60ch] text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
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
        className="peer absolute inset-0 z-10 cursor-pointer opacity-0"
      />
      <span
        aria-hidden="true"
        className={cn(
          buttonVariants({ variant: "outline" }),
          "peer-hover:bg-muted peer-focus-visible:border-ring peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 peer-aria-[invalid=true]:border-destructive",
        )}
      >
        <ImagePlus aria-hidden />
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
  errorId = `${id}-error`,
  hintId = `${id}-hint`,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  errorId?: string;
  hintId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={errorId} className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="text-sm text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
