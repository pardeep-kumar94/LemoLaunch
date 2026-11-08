"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Sticky links to the page's sections, just under the site header. The section in view is underlined. */
export function SectionTabs({ sections }: { sections: { id: string; label: string }[] }) {
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    const targets = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    // A section counts as "in view" once its top passes the band just under the sticky tabs.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) setActive(visible[0].target.id);
      },
      { rootMargin: "-130px 0px -60% 0px" },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav aria-label="Sections" className="sticky top-16 z-30 border-b border-border bg-background/90 backdrop-blur-md">
      <ul className="mx-auto flex max-w-6xl gap-6 overflow-x-auto px-4 [scrollbar-width:none] sm:px-8">
        {sections.map((s) => (
          <li key={s.id} className="shrink-0">
            <a
              href={`#${s.id}`}
              aria-current={active === s.id ? "location" : undefined}
              onClick={() => setActive(s.id)}
              className={cn(
                "block py-3 text-sm font-medium whitespace-nowrap transition-[color,box-shadow]",
                active === s.id
                  ? "text-foreground shadow-[inset_0_-2px_0_var(--foreground)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
