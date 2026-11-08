import { cn } from "@/lib/utils";

const sizes = {
  sm: "size-7 text-[11px]",
  md: "size-9 text-xs",
  lg: "size-24 text-3xl sm:size-28 sm:text-4xl",
};

const hues = [24, 48, 140, 190, 215, 265, 320, 350];

/** A person's photo, or their initials on a color picked from their name. */
export function UserAvatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const shape = size === "lg" ? "rounded-[28px]" : "rounded-full";
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- user-uploaded avatar from /uploads
      <img src={src} alt="" className={cn(sizes[size], shape, "shrink-0 object-cover", className)} />
    );
  }
  const hash = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  return (
    <span
      aria-hidden="true"
      className={cn(sizes[size], shape, "grid shrink-0 place-items-center font-semibold text-white", className)}
      style={{ backgroundColor: `oklch(0.5 0.08 ${hues[hash % hues.length]})` }}
    >
      {initials || "?"}
    </span>
  );
}
