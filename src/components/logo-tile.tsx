// A product's logo, or its initial on its accent color when there's no logo yet.
const sizes = {
  sm: "size-9 rounded-lg text-base",
  md: "size-12 rounded-[14px] text-xl sm:size-[54px] sm:text-2xl",
  podium: "size-[68px] rounded-[18px] text-3xl sm:size-[76px] sm:text-4xl",
  lg: "size-20 rounded-2xl text-4xl sm:size-24 sm:text-5xl",
};

export function LogoTile({
  name,
  accent,
  src,
  size = "md",
}: {
  name: string;
  accent: string;
  src?: string | null;
  size?: keyof typeof sizes;
}) {
  const sizing = sizes[size];
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- small logos from /logos and /uploads
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        className={`${sizing} shrink-0 object-cover`}
        style={{ backgroundColor: accent }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${sizing} grid shrink-0 place-items-center font-display font-bold text-white`}
      style={{ backgroundColor: accent }}
    >
      {name.charAt(0)}
    </span>
  );
}
