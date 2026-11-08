"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { FacebookLogo, LinkedInLogo, XLogo } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";

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
      track("share_clicked", { network: "copy_link", url });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (e.g. insecure context): leave the button as it was.
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="mr-auto text-[13px] text-muted-foreground">Share</span>
      {links.map(({ label, href, Icon }) => (
        <Button key={label} asChild variant="outline" size="icon-sm">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            onClick={() => track("share_clicked", { network: label.replace("Share on ", "").toLowerCase(), url })}
          >
            <Icon className="size-3.5" />
          </a>
        </Button>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={copy} aria-label="Copy link">
        {copied ? <Check data-icon="inline-start" /> : <Link2 data-icon="inline-start" />}
        {copied ? "Copied" : "Copy link"}
      </Button>
      <span role="status" className="sr-only">
        {copied ? "Link copied" : ""}
      </span>
    </div>
  );
}
