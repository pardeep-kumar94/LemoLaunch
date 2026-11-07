import { GlobeIcon, PhoneIcon } from "@/components/icons";
import { platformLabels, sortPlatforms } from "@/lib/platforms";

/** Small "Web / iOS / Android" pills. */
export function PlatformBadges({
  platforms,
  tone = "surface",
}: {
  platforms: readonly string[];
  tone?: "surface" | "band";
}) {
  const list = sortPlatforms(platforms);
  if (list.length === 0) return null;
  const pill =
    tone === "band"
      ? "border-on-signal/30 bg-white/60 text-on-signal"
      : "border-line bg-paper text-mist";
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      <span className="sr-only">Available on </span>
      {list.map((p) => (
        <span
          key={p}
          title={platformLabels[p].long}
          className={`inline-flex items-center gap-1 rounded-md border-2 px-1.5 py-px text-xs font-bold ${pill}`}
        >
          {p === "web" ? <GlobeIcon className="size-3.5" /> : <PhoneIcon className="size-3.5" />}
          {platformLabels[p].short}
        </span>
      ))}
    </span>
  );
}
