import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import { Suspense } from "react";
import Link from "next/link";
import { HeaderAccount, HeaderAccountFallback } from "@/components/header-account";
import { MenuIcon, SearchIcon } from "@/components/icons";
import { Wordmark } from "@/components/wordmark";
import "./globals.css";

// Lexend for everything: headlines use heavier weights, text uses the regular ones.
const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LemoLaunch: today's new products",
  description:
    "Discover products launching today, upvote the ones you like, and see what lands tomorrow.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${lexend.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <header className="band">
          <div className="mx-auto flex h-[76px] w-full max-w-6xl items-center gap-3 px-4 sm:gap-7 sm:px-8">
            <Link href="/" className="flex shrink-0">
              <Wordmark priority />
            </Link>
            <nav aria-label="Main" className="hidden items-center gap-5 text-[15px] font-semibold whitespace-nowrap lg:flex">
              <NavLink href="/">Launches</NavLink>
              <NavLink href="/archive">Archive</NavLink>
              <NavLink href="/categories">Categories</NavLink>
              <NavLink href="/#upcoming" className="hidden xl:inline">
                Coming up
              </NavLink>
              <NavLink href="/pricing" className="hidden xl:inline">
                Pricing
              </NavLink>
            </nav>
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <form action="/search" role="search" className="hidden xl:block">
                <label className="flex h-11 w-44 items-center gap-2 rounded-xl border-2 border-on-signal/20 bg-white/55 px-3 transition-colors focus-within:border-on-signal focus-within:bg-white">
                  <SearchIcon className="size-4 opacity-60" />
                  <span className="sr-only">Search launches</span>
                  <input
                    name="q"
                    type="search"
                    placeholder="Search launches"
                    className="w-full bg-transparent text-sm text-on-signal placeholder:text-on-signal/55 focus:outline-none"
                  />
                </label>
              </form>
              <Link
                href="/search"
                aria-label="Search launches"
                className="hidden size-11 place-items-center rounded-xl border-2 border-on-signal/20 bg-white/55 sm:grid xl:hidden"
              >
                <SearchIcon />
              </Link>
              <details className="relative xl:hidden">
                <summary className="grid size-11 cursor-pointer list-none place-items-center rounded-xl border-2 border-on-signal/20 bg-white/55 [&::-webkit-details-marker]:hidden">
                  <MenuIcon />
                  <span className="sr-only">Menu</span>
                </summary>
                <nav
                  aria-label="Menu"
                  className="absolute right-0 z-20 mt-2 grid w-56 rounded-2xl border-2 border-ink bg-paper p-2 text-ink shadow-[6px_6px_0_0_var(--pop)]"
                >
                  {[
                    ["Launches", "/"],
                    ["Archive", "/archive"],
                    ["Categories", "/categories"],
                    ["Coming up", "/#upcoming"],
                    ["Pricing", "/pricing"],
                    ["Search", "/search"],
                  ].map(([label, href]) => (
                    <Link key={href} href={href} className="rounded-lg px-3 py-2 font-semibold hover:bg-signal-wash">
                      {label}
                    </Link>
                  ))}
                </nav>
              </details>
              <Suspense fallback={<HeaderAccountFallback />}>
                <HeaderAccount />
              </Suspense>
            </div>
          </div>
        </header>
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}

function NavLink({
  href,
  className = "",
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`underline decoration-transparent decoration-[3px] underline-offset-[6px] transition-colors hover:decoration-pop ${className}`}
    >
      {children}
    </Link>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t-2 border-line bg-paper">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-8 md:grid-cols-[1.6fr_1fr_1fr]">
        <div>
          <Link href="/" className="inline-block">
            <Wordmark />
          </Link>
          <p className="mt-4 max-w-sm text-mist">
            A daily launch directory. New products go live every day at 00:00 UTC, and the
            community decides what rises to the top.
          </p>
        </div>
        <FooterColumn
          title="Discover"
          links={[
            ["Today's launches", "/"],
            ["Archive", "/archive"],
            ["Coming up", "/#upcoming"],
            ["Categories", "/categories"],
            ["Search", "/search"],
          ]}
        />
        <FooterColumn
          title="Makers"
          links={[
            ["Submit a launch", "/submit"],
            ["Pricing", "/pricing"],
            ["Sign in", "/signin"],
            ["Create an account", "/signup"],
            ["Daily digest", "/#digest"],
          ]}
        />
      </div>
      <div className="border-t-2 border-line">
        <p className="mx-auto max-w-6xl px-4 py-6 text-sm text-mist sm:px-8">© 2026 LemoLaunch</p>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h2 className="font-display font-extrabold">{title}</h2>
      <ul className="mt-4 flex flex-col gap-2.5">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="text-mist transition-colors hover:text-ink">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
