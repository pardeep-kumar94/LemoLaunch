import Image from "next/image";

/**
 * The LemoLaunch logo: the lemon-rocket icon plus the name set in Lexend.
 * "Lemo" follows the text color around it; "Launch" is always the coral accent.
 */
export function Wordmark({ priority = false, className = "" }: { priority?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 sm:gap-2 ${className}`}>
      <Image
        src="/brand/lemon-mark.png"
        alt=""
        width={192}
        height={192}
        priority={priority}
        className="size-7 shrink-0 min-[360px]:size-9 sm:size-10"
      />
      <span className="font-display text-[16px] leading-none font-extrabold tracking-[-0.03em] min-[360px]:text-[21px] sm:text-[25px]">
        Lemo<span className="text-pop">Launch</span>
      </span>
    </span>
  );
}
