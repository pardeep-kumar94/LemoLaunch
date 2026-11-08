"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

function subscribe(onTick: () => void) {
  const timer = setInterval(onTick, 1000);
  return () => clearInterval(timer);
}

const currentSecond = () => Math.floor(Date.now() / 1000);
const noTimeOnServer = () => null;

/** Time left until the next UTC midnight, when the next edition goes live, as HH:MM:SS. */
export function Countdown({ className }: { className?: string }) {
  const nowSeconds = useSyncExternalStore(subscribe, currentSecond, noTimeOnServer);
  const pad = (n: number) => String(n).padStart(2, "0");
  const left = nowSeconds === null ? null : 86_400 - (nowSeconds % 86_400);
  const [h, m, s] = left === null ? ["--", "--", "--"] : [pad(Math.floor(left / 3600)), pad(Math.floor((left % 3600) / 60)), pad(left % 60)];
  return (
    <span role="timer" aria-label={`${h} hours ${m} minutes until the next edition`} className={cn("num", className)}>
      {h}:{m}:{s}
    </span>
  );
}
