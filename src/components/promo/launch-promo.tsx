"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { LemonMark } from "@/components/wordmark";
import { track } from "@/lib/analytics";
import { isPromoActive, LAUNCH_PROMO, promoDaysLeft } from "@/lib/promo";

const STORAGE_KEY = "lemolaunch:promo-dismissed";
/** Wait a moment so the popup never interrupts the first look at the page. */
const SHOW_AFTER_MS = 2500;
/** Pages where the offer would only get in the way. */
const QUIET_PATHS = ["/submit", "/signin", "/signup"];

function wasDismissed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === LAUNCH_PROMO.id;
  } catch {
    return false;
  }
}

function rememberDismissed() {
  try {
    window.localStorage.setItem(STORAGE_KEY, LAUNCH_PROMO.id);
  } catch {
    // Private mode: the popup may show again next visit, which is fine.
  }
}

/** The launch-promotion popup: shown once per visitor while the promotion runs. */
export function LaunchPromo() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [daysLeft, setDaysLeft] = useState(0);
  const quiet = QUIET_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    if (quiet || !isPromoActive() || wasDismissed()) return;
    const timer = setTimeout(() => {
      setDaysLeft(promoDaysLeft());
      setOpen(true);
      rememberDismissed();
      track("promo_popup_shown", { promo: LAUNCH_PROMO.id });
    }, SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [quiet]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[440px] [&>[data-slot=dialog-close]]:text-on-lemon [&>[data-slot=dialog-close]]:hover:bg-on-lemon/10">
        <div className="relative overflow-hidden bg-lemon px-6 pt-6 pb-5 text-on-lemon">
          <LemonMark className="pointer-events-none absolute -right-7 -bottom-9 size-32 -rotate-12 opacity-20" />
          <Badge className="bg-on-lemon text-lemon">
            <Sparkles aria-hidden />
            Launch promotion
          </Badge>
          <DialogTitle className="relative mt-4 font-display text-[32px] leading-[1.02] font-bold text-balance text-on-lemon">
            Every listing is free for 2 weeks
          </DialogTitle>
          <p className="relative mt-3 text-sm font-medium">
            {daysLeft === 0 ? "Last day" : daysLeft === 1 ? "1 day left" : `${daysLeft} days left`} · ends {LAUNCH_PROMO.lastDayLabel}
          </p>
        </div>
        <div className="px-6 pt-5 pb-6">
          <DialogDescription className="text-[15px] text-muted-foreground">
            We&apos;re celebrating our launch. Put your product in front of makers and early adopters,
            at no cost.
          </DialogDescription>
          <ul className="mt-4 grid gap-2 text-sm">
            {["A launch page with logo, screenshots and video", "Upvotes, comments and reviews", "A \"Launched on LemoLaunch\" badge for your site"].map((perk) => (
              <li key={perk} className="flex gap-2.5">
                <span aria-hidden className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                  <Check className="size-3" strokeWidth={3} />
                </span>
                {perk}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Maybe later
            </Button>
            <Button asChild>
              <Link
                href="/submit"
                onClick={() => {
                  track("promo_popup_clicked", { promo: LAUNCH_PROMO.id });
                  setOpen(false);
                }}
              >
                Submit your launch free
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
