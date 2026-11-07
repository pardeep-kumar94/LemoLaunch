"use client";

import { useState } from "react";

/** Product video and screenshots: one large viewer with thumbnails to switch between them. */
export function MediaGallery({
  name,
  video,
  images,
}: {
  name: string;
  video: { kind: "embed" | "file"; src: string } | null;
  images: string[];
}) {
  const items = [
    ...(video ? [{ type: "video" as const, src: video.src, kind: video.kind }] : []),
    ...images.map((src) => ({ type: "image" as const, src, kind: "file" as const })),
  ];
  const [active, setActive] = useState(0);
  if (items.length === 0) return null;
  const current = items[Math.min(active, items.length - 1)];

  return (
    <section aria-label={`${name} video and screenshots`} className="grid gap-3">
      <div className="aspect-video overflow-hidden rounded-[20px] border-2 border-ink bg-on-signal shadow-[6px_6px_0_0_var(--pop)]">
        {current.type === "video" ? (
          current.kind === "embed" ? (
            <iframe
              src={current.src}
              title={`${name} video`}
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              className="size-full"
            />
          ) : (
            <video src={current.src} controls preload="metadata" className="size-full bg-black object-contain">
              <track kind="captions" />
            </video>
          )
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- maker-uploaded screenshots of varying size
          <img src={current.src} alt={`${name} screenshot ${active + (video ? 0 : 1)}`} className="size-full bg-paper object-contain" />
        )}
      </div>
      {items.length > 1 && (
        <ul className="flex gap-2.5 overflow-x-auto pb-1">
          {items.map((item, i) => (
            <li key={item.src} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={item.type === "video" ? "Show video" : `Show screenshot ${video ? i : i + 1}`}
                aria-pressed={i === active}
                className={`relative grid h-16 w-28 place-items-center overflow-hidden rounded-xl border-2 bg-paper transition-colors ${
                  i === active ? "border-ink" : "border-line hover:border-ink/50"
                }`}
              >
                {item.type === "video" ? (
                  <span className="grid size-full place-items-center bg-on-signal text-signal">
                    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-6">
                      <path d="M5 3.5v9l7.5-4.5L5 3.5Z" fill="currentColor" />
                    </svg>
                  </span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- thumbnail of an uploaded screenshot
                  <img src={item.src} alt="" className="size-full object-cover" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
