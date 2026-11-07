"use client";

import { useEffect, useState } from "react";

/** Sticky links to the page's sections. The tab for the section in view is underlined. */
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
      { rootMargin: "-80px 0px -65% 0px" },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav aria-label="Sections" className="sticky top-0 z-10 border-b-2 border-line bg-concrete/95 backdrop-blur-sm">
      <ul className="mx-auto flex max-w-6xl gap-6 overflow-x-auto px-4 [scrollbar-width:none] sm:px-8">
        {sections.map((s) => (
          <li key={s.id} className="shrink-0">
            <a
              href={`#${s.id}`}
              aria-current={active === s.id ? "location" : undefined}
              onClick={() => setActive(s.id)}
              className={`block py-3.5 text-sm font-semibold whitespace-nowrap underline decoration-[3px] underline-offset-[10px] transition-colors ${
                active === s.id ? "text-ink decoration-pop" : "text-mist decoration-transparent hover:text-ink"
              }`}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
