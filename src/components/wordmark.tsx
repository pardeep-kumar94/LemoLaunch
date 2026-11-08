import { cn } from "@/lib/utils";

/** The lemon mark: a lemon with a leaf, drawn in the brand's lemon, ink and leaf colors. */
export function LemonMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-7 shrink-0", className)}>
      <path
        d="M5.5 18.5c-1.2-.4-1.6-1.6-.9-2.5.3-.4.7-.6 1.1-.7C6.6 9.8 11 6 16.4 6c2.6 0 5 .9 6.8 2.4.5-.3 1.2-.4 1.8-.1 1 .5 1.2 1.7.5 2.5-.2.2-.5.4-.8.5.6 1.4.9 2.9.9 4.5 0 6-4.9 10.2-10.6 10.2-4.3 0-8-2.4-9.5-5.6-.1-.6.1-1.4 0-1.9z"
        fill="var(--lemon)"
        stroke="var(--on-lemon)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M11 14.5c1.2-2.6 3.6-4.1 6.3-4.1" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" opacity=".85" />
      <path
        d="M21.5 6.8c.6-2.6 2.8-4.2 5.7-4-.5 2.7-2.8 4.4-5.7 4z"
        fill="var(--leaf)"
        stroke="var(--on-lemon)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The LemoLaunch logo: the lemon mark and the name. */
export function Wordmark({ className }: { className?: string; priority?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LemonMark />
      <span className="font-display text-[19px] leading-none font-bold">LemoLaunch</span>
    </span>
  );
}
