import { Globe, Smartphone } from "lucide-react";
import { platformLabels, sortPlatforms } from "@/lib/platforms";

/** "Web · iOS · Android" with small icons, for meta lines. */
export function PlatformBadges({ platforms }: { platforms: readonly string[]; tone?: string }) {
  const list = sortPlatforms(platforms);
  if (list.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1">
      <span className="sr-only">Available on </span>
      {list.map((p) => (
        <span key={p} title={platformLabels[p].long} className="inline-flex items-center gap-1">
          {p === "web" ? <Globe className="size-3" aria-hidden /> : <Smartphone className="size-3" aria-hidden />}
          {platformLabels[p].short}
        </span>
      ))}
    </span>
  );
}
