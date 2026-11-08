"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

/** Records one event when a server-rendered page is shown. Renders nothing. */
export function TrackView({ event, properties }: { event: string; properties?: Record<string, string | number | boolean> }) {
  const serialized = JSON.stringify(properties ?? {});
  useEffect(() => {
    track(event, JSON.parse(serialized));
  }, [event, serialized]);
  return null;
}
