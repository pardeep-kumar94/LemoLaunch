"use client";

import { useState } from "react";
import { BADGE_HEIGHT, BADGE_THEMES, BADGE_WIDTH, badgeSnippets, type BadgeTheme } from "@/lib/badge-snippets";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";

const themeLabels: Record<BadgeTheme, string> = { light: "Light", yellow: "Lemon", dark: "Dark" };

const formats = [
  { key: "html", label: "HTML", hint: "Works on any website. Paste it where the badge should appear." },
  { key: "script", label: "Script", hint: "One line that adds the badge for you. Paste it where the badge should appear." },
  { key: "markdown", label: "Markdown", hint: "For a GitHub README or docs written in Markdown." },
] as const;

/** Lets a maker pick a badge style and copy the code to put it on their own site. */
export function BadgeEmbed({ origin, slug }: { origin: string; slug: string }) {
  const [theme, setTheme] = useState<BadgeTheme>("light");
  const [format, setFormat] = useState<(typeof formats)[number]["key"]>("html");
  const [copied, setCopied] = useState(false);
  const code = badgeSnippets(origin, slug, theme)[format];
  const hint = formats.find((f) => f.key === format)!.hint;

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      track("badge_embed_copied", { product_slug: slug, theme, format });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the code stays selectable in the box.
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      <fieldset>
        <legend className="font-semibold">Style</legend>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {BADGE_THEMES.map((t) => (
            <label
              key={t}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-2 rounded-xl p-3 ring-1 transition-shadow has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring",
                theme === t ? "ring-2 ring-primary" : "ring-border hover:ring-input",
                t === "dark" ? "bg-[#17130e]" : "bg-white",
              )}
            >
              <input
                type="radio"
                name="badge-theme"
                value={t}
                checked={theme === t}
                onChange={() => setTheme(t)}
                className="sr-only"
              />
              {/* eslint-disable-next-line @next/next/no-img-element -- SVG badge served by /badge */}
              <img
                src={`/badge/${slug}.svg?theme=${t}`}
                alt=""
                width={BADGE_WIDTH}
                height={BADGE_HEIGHT}
                className="h-auto w-full max-w-[250px]"
              />
              <span className={cn("text-sm font-medium", t === "dark" ? "text-[#f4efe6]" : "text-[#2c2318]")}>
                {themeLabels[t]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <div role="group" aria-label="Code format" className="flex h-9 gap-0.5 rounded-xl bg-muted p-[3px] sm:inline-flex">
          {formats.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={format === f.key}
              onClick={() => setFormat(f.key)}
              className={cn(
                "flex-1 rounded-[9px] px-3.5 text-[13px] font-medium transition-colors sm:flex-none",
                format === f.key ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{hint}</p>
        <div className="mt-3 overflow-hidden rounded-xl bg-card ring-1 ring-border">
          <pre className="overflow-x-auto px-4 py-3 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap break-all">
            <code>{code}</code>
          </pre>
          <div className="flex justify-end border-t border-border px-3 py-2">
            <Button type="button" size="sm" onClick={copy}>
              {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
              {copied ? "Copied" : "Copy code"}
            </Button>
          </div>
        </div>
        <p aria-live="polite" className="sr-only">
          {copied ? "Code copied" : ""}
        </p>
      </div>
    </div>
  );
}
