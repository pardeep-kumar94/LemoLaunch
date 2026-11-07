"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { markNotificationsSeen } from "@/app/product-actions";
import { BellIcon } from "@/components/icons";
import { LogoTile } from "@/components/logo-tile";

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

  function handleToggle(event: React.SyntheticEvent<HTMLDetailsElement>) {
    if (!event.currentTarget.open || unread === 0) return;
    setUnread(0);
    startTransition(() => markNotificationsSeen());
  }

  return (
    <details className="relative" onToggle={handleToggle}>
      <summary
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative grid size-11 cursor-pointer list-none place-items-center rounded-xl border-2 border-on-signal/20 bg-white/55 transition-colors hover:bg-white [&::-webkit-details-marker]:hidden"
      >
        <BellIcon />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-on-signal bg-pop px-1 text-[11px] leading-none font-extrabold text-on-signal tabular-nums"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border-2 border-ink bg-paper p-2 text-ink shadow-[6px_6px_0_0_var(--pop)]">
        <p className="px-3 pt-2 pb-1 font-display font-extrabold">Notifications</p>
        {items.length === 0 ? (
          <p className="px-3 pt-1 pb-3 text-sm text-mist">
            No notifications yet. Follow makers to hear when they launch.
          </p>
        ) : (
          <ul className="max-h-96 overflow-y-auto">
            {items.map((item) => (
              <li key={item.productSlug}>
                <Link
                  href={`/products/${item.productSlug}`}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-signal-wash"
                >
                  <LogoTile name={item.productName} accent={item.accent} src={item.logoUrl} size="sm" />
                  <span className="min-w-0 flex-1 text-sm leading-snug">
                    <span className="font-bold">{item.maker}</span> launched{" "}
                    <span className="font-bold">{item.productName}</span>
                    <span className="block text-xs text-mist">{item.when}</span>
                  </span>
                  {item.unread && <span aria-label="New" className="size-2.5 shrink-0 rounded-full bg-pop" />}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
