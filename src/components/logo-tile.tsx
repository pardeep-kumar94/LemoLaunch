import { cn } from "@/lib/utils";

// A product's logo, or its initial on its accent color when there's no logo yet.
// Corners scale with the size so small and large tiles share the same shape.
const sizes = {
  xs: "size-7 rounded-[7px] text-xs",
  sm: "size-9 rounded-[9px] text-sm",
  md: "size-12 rounded-xl text-xl",
  podium: "size-16 rounded-[15px] text-2xl",
  lg: "size-20 rounded-[20px] text-4xl sm:size-26 sm:rounded-[25px] sm:text-5xl",
};

export function LogoTile({
  name,
  accent,
  src,
  size = "md",
  className,
}: {
  name: string;
  accent: string;
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const sizing = cn(sizes[size], "shrink-0 shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]", className);
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- small logos from /logos and /uploads
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        className={cn(sizing, "object-cover")}
        style={{ backgroundColor: accent }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(sizing, "grid place-items-center font-display font-bold text-white")}
      style={{ backgroundColor: accent }}
    >
      {name.charAt(0)}
    </span>
  );
}
