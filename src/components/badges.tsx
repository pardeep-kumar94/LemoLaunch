const rankStyles: Record<number, { className: string; label: string }> = {
  1: { className: "bg-pop text-on-signal border-on-signal", label: "Ranked first" },
  2: { className: "bg-silver text-on-signal border-on-signal", label: "Ranked second" },
  3: { className: "bg-bronze text-on-signal border-on-signal", label: "Ranked third" },
};

/** Medal for the top three launches of a day. Renders nothing below third. */
export function RankBadge({ rank }: { rank: number }) {
  const style = rankStyles[rank];
  if (!style) return null;
  return (
    <span
      title={style.label}
      className={`inline-flex h-6 items-center gap-1 rounded-lg border-2 px-1.5 font-display text-xs font-extrabold tabular-nums ${style.className}`}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3">
        <path d="M2 5l3 2.5L8 3l3 4.5L14 5l-1.25 7.5h-9.5L2 5Z" fill="currentColor" />
      </svg>
      #{rank}
      <span className="sr-only">, {style.label.toLowerCase()}</span>
    </span>
  );
}

/** Seal shown next to products whose maker confirmed ownership. */
export function VerifiedBadge({ className = "size-[18px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label="Verified maker" className={`shrink-0 ${className}`}>
      <title>Verified maker</title>
      <path
        d="M12 1.5l2.6 1.9 3.2-.2 1 3 2.6 1.9-1 3.1 1 3.1-2.6 1.9-1 3-3.2-.2L12 22.5l-2.6-1.9-3.2.2-1-3L2.6 16l1-3.1-1-3.1 2.6-1.9 1-3 3.2.2L12 1.5Z"
        fill="var(--pop)"
        stroke="var(--on-signal)"
        strokeWidth="1.25"
      />
      <path d="m8 12.2 2.6 2.6L16 9.4" fill="none" stroke="var(--on-signal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const avatarHues = [24, 48, 140, 190, 215, 265, 320, 350];

/** Initial-letter avatar for a maker until profiles exist. */
export function MakerAvatar({ name }: { name: string }) {
  const hash = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const hue = avatarHues[hash % avatarHues.length];
  return (
    <span
      aria-hidden="true"
      className="grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
      style={{ backgroundColor: `hsl(${hue} 45% 38%)` }}
    >
      {name.charAt(0)}
    </span>
  );
}
