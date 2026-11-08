"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

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
      <div className="aspect-video overflow-hidden rounded-2xl bg-muted shadow-paper ring-1 ring-border">
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
          <img src={current.src} alt={`${name} screenshot ${active + (video ? 0 : 1)}`} className="size-full bg-card object-contain" />
        )}
      </div>
      {items.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto p-1">
          {items.map((item, i) => (
            <li key={item.src} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={item.type === "video" ? "Show video" : `Show screenshot ${video ? i : i + 1}`}
                aria-pressed={i === active}
                className={cn(
                  "relative grid h-16 w-28 place-items-center overflow-hidden rounded-xl bg-card ring-1 transition-[box-shadow,opacity]",
                  i === active ? "ring-2 ring-primary" : "opacity-75 ring-border hover:opacity-100",
                )}
              >
                {item.type === "video" ? (
                  <span className="grid size-full place-items-center bg-primary text-primary-foreground">
                    <Play className="size-5 fill-current" aria-hidden />
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
