"use client";

import { useState } from "react";
import { BADGE_HEIGHT, BADGE_THEMES, BADGE_WIDTH, badgeSnippets, type BadgeTheme } from "@/lib/badge-snippets";
import { CheckIcon } from "@/components/icons";

const themeLabels: Record<BadgeTheme, string> = { light: "Light", yellow: "Yellow", dark: "Dark" };

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
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-[16px] border-2 p-3 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-3 has-focus-visible:outline-ink ${
                theme === t ? "border-ink ring-2 ring-ink ring-offset-2 ring-offset-concrete" : "border-line hover:border-mist"
              } ${t === "dark" ? "bg-[#1c120c]" : "bg-white"}`}
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
              <span className={`text-sm font-semibold ${t === "dark" ? "text-[#fbf1e8]" : "text-[#3b1d0e]"}`}>
                {themeLabels[t]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <div role="group" aria-label="Code format" className="flex gap-1 rounded-xl bg-signal-wash p-1 sm:inline-flex">
          {formats.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={format === f.key}
              onClick={() => setFormat(f.key)}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold sm:flex-none ${
                format === f.key ? "bg-paper shadow-[0_1px_0_0_var(--line)]" : "text-mist hover:text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-mist">{hint}</p>
        <div className="mt-3 overflow-hidden rounded-[16px] border-2 border-line bg-paper">
          <pre className="overflow-x-auto px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap break-all">
            <code>{code}</code>
          </pre>
          <div className="flex justify-end border-t-2 border-line px-3 py-2">
            <button
              type="button"
              onClick={copy}
              className="press inline-flex h-10 items-center gap-2 rounded-xl border-2 border-ink bg-signal px-4 text-sm font-bold text-on-signal shadow-[3px_3px_0_0_var(--ink)]"
            >
              {copied ? (
                <>
                  <CheckIcon /> Copied
                </>
              ) : (
                "Copy code"
              )}
            </button>
          </div>
        </div>
        <p aria-live="polite" className="sr-only">
          {copied ? "Code copied" : ""}
        </p>
      </div>
    </div>
  );
}
