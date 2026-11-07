"use client";

import { useState } from "react";
import { FacebookLogo, LinkIcon, LinkedInLogo, XLogo } from "@/components/icons";

const buttonClass =
  "grid size-9 place-items-center rounded-[10px] border-2 border-line bg-paper text-ink transition-colors hover:border-ink";

/** Share links for X, LinkedIn and Facebook, plus copy-to-clipboard. No third-party scripts. */
export function ShareButtons({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  const links = [
    { label: "Share on X", href: `https://x.com/intent/post?text=${t}&url=${u}`, Icon: XLogo },
    { label: "Share on LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, Icon: LinkedInLogo },
    { label: "Share on Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, Icon: FacebookLogo },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (e.g. insecure context): leave the button as it was.
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="mr-1 text-sm font-semibold text-mist">Share</span>
      {links.map(({ label, href, Icon }) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={buttonClass}>
          <Icon className="size-4" />
        </a>
      ))}
      <button type="button" onClick={copy} aria-label="Copy link" className={buttonClass}>
        <LinkIcon className="size-4" />
      </button>
      <span role="status" className="text-sm font-semibold text-mist">
        {copied ? "Copied" : ""}
      </span>
    </div>
  );
}
