"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackFirebasePageView } from "@/lib/analytics";

// The App Router changes pages without the history calls GA4 listens for, so page views after
// the first one are sent from here. Firebase records the first one itself when it starts.
let lastPage: string | null = null;

export function PageViews() {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    const page = search ? `${pathname}?${search}` : pathname;
    if (lastPage === null || lastPage === page) {
      lastPage = page;
      return;
    }
    // Give the new page a moment to set its title.
    const timer = setTimeout(() => {
      lastPage = page;
      trackFirebasePageView();
    }, 300);
    return () => clearTimeout(timer);
  }, [pathname, search]);

  return null;
}
