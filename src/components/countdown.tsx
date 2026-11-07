"use client";

import { useSyncExternalStore } from "react";

function subscribe(onTick: () => void) {
  const timer = setInterval(onTick, 1000);
  return () => clearInterval(timer);
}

const currentSecond = () => Math.floor(Date.now() / 1000);
const noTimeOnServer = () => null;

/** Time left until the next UTC midnight, when the next batch of launches goes live. */
export function Countdown() {
  const nowSeconds = useSyncExternalStore(subscribe, currentSecond, noTimeOnServer);

  let parts: [string, string][] = [
    ["--", "hours"],
    ["--", "minutes"],
    ["--", "seconds"],
  ];
  if (nowSeconds !== null) {
    const left = 86_400 - (nowSeconds % 86_400);
    const pad = (n: number) => String(n).padStart(2, "0");
    parts = [
      [pad(Math.floor(left / 3600)), "hours"],
      [pad(Math.floor((left % 3600) / 60)), "minutes"],
      [pad(left % 60), "seconds"],
    ];
  }

  return (
    <div className="flex gap-2.5" role="timer" aria-label={`${parts[0][0]} hours ${parts[1][0]} minutes left`}>
      {parts.map(([value, unit]) => (
        <div
          key={unit}
          aria-hidden="true"
          className="flex-1 rounded-[14px] bg-on-signal pt-3 pb-2 text-center text-signal"
        >
          <span className="block font-display text-4xl leading-none font-extrabold tabular-nums sm:text-[44px]">
            {value}
          </span>
          <span className="text-xs opacity-75">{unit}</span>
        </div>
      ))}
    </div>
  );
}
