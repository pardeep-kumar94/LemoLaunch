import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/** Seal shown next to products whose maker confirmed ownership. */
export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <BadgeCheck role="img" aria-label="Verified maker" className={cn("size-4 shrink-0 text-leaf", className)}>
      <title>Verified maker</title>
    </BadgeCheck>
  );
}

const avatarHues = [24, 48, 140, 190, 215, 265, 320, 350];

/** Initial-letter avatar for a maker without a profile photo. */
export function MakerAvatar({ name, className }: { name: string; className?: string }) {
  const hash = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const hue = avatarHues[hash % avatarHues.length];
  return (
    <span
      aria-hidden="true"
      className={cn("grid size-[18px] shrink-0 place-items-center rounded-full text-[9px] font-semibold text-white", className)}
      style={{ backgroundColor: `oklch(0.5 0.08 ${hue})` }}
    >
      {name.charAt(0)}
    </span>
  );
}
