"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { markNotificationsSeen } from "@/app/product-actions";
import { LogoTile } from "@/components/logo-tile";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { track } from "@/lib/analytics";

export type BellItem = {
  productSlug: string;
  productName: string;
  logoUrl: string | null;
  accent: string;
  maker: string;
  /** e.g. "today", "2 days ago" — worked out on the server. */
  when: string;
  unread: boolean;
};

/** Header bell with an unread count. Opening it marks everything read. */
export function NotificationBell({ items, unreadCount }: { items: BellItem[]; unreadCount: number }) {
  const [unread, setUnread] = useState(unreadCount);
  const [, startTransition] = useTransition();

  function handleOpenChange(open: boolean) {
    if (!open) return;
    track("notification_bell_opened", { unread, items: items.length });
    if (unread === 0) return;
    setUnread(0);
    startTransition(() => markNotificationsSeen());
  }

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}>
          <Bell />
          {unread > 0 && (
            <span
              aria-hidden="true"
              className="num absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-lemon px-1 text-[10px] leading-none font-semibold text-on-lemon ring-2 ring-background"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2">
        <p className="px-2 pt-1 pb-2 font-display text-base font-bold">Notifications</p>
        {items.length === 0 ? (
          <p className="px-2 pb-2 text-sm text-muted-foreground">No notifications yet. Follow makers to hear when they launch.</p>
        ) : (
          <ul className="max-h-96 overflow-y-auto">
            {items.map((item) => (
              <li key={item.productSlug}>
                <Link href={`/products/${item.productSlug}`} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted">
                  <LogoTile name={item.productName} accent={item.accent} src={item.logoUrl} size="sm" />
                  <span className="min-w-0 flex-1 text-sm leading-snug">
                    <span className="font-semibold">{item.maker}</span> launched <span className="font-semibold">{item.productName}</span>
                    <span className="block text-xs text-muted-foreground">{item.when}</span>
                  </span>
                  {item.unread && <span aria-label="New" className="size-2 shrink-0 rounded-full bg-lemon-deep" />}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
