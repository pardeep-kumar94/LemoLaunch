const sizes = {
  sm: "size-7 text-xs",
  md: "size-9 text-sm",
  lg: "size-24 text-4xl sm:size-28 sm:text-5xl",
};

const hues = [24, 48, 140, 190, 215, 265, 320, 350];

/** A person's photo, or their initial on a color picked from their name. */
export function UserAvatar({
  name,
  src,
  size = "md",
  className = "",
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const shape = size === "lg" ? "rounded-[26px]" : "rounded-full";
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- user-uploaded avatar from /uploads
      <img src={src} alt="" className={`${sizes[size]} ${shape} shrink-0 object-cover ${className}`} />
    );
  }
  const hash = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return (
    <span
      aria-hidden="true"
      className={`${sizes[size]} ${shape} grid shrink-0 place-items-center font-display font-extrabold text-white ${className}`}
      style={{ backgroundColor: `hsl(${hues[hash % hues.length]} 45% 38%)` }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
