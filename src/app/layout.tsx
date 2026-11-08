import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { HeaderAccount, HeaderAccountFallback } from "@/components/header-account";
import { MobileMenu, NavLinks } from "@/components/site-nav";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Wordmark } from "@/components/wordmark";
import { NAV_LINKS } from "@/lib/nav";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_NAME, SITE_ORIGIN } from "@/lib/seo";
import "./globals.css";

// Geist for reading and controls, Geist Mono for numbers, Bricolage Grotesque for headlines.
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: { default: DEFAULT_TITLE, template: `%s | ${SITE_NAME}` },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: "/",
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  // Search Console / Bing HTML-tag verification, as an alternative to a DNS TXT record.
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${bricolage.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <TooltipProvider>
          <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
            <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4 sm:px-8">
              <Link href="/" className="mr-3 flex shrink-0 rounded-lg" aria-label="LemoLaunch, today's launches">
                <Wordmark />
              </Link>
              <Suspense fallback={<NavLinksFallback />}>
                <NavLinks />
              </Suspense>
              <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
                <form action="/search" role="search" className="hidden xl:block">
                  <label className="flex h-9 w-56 items-center gap-2 rounded-[10px] border border-input bg-card px-3 shadow-xs transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40">
                    <Search className="size-4 text-muted-foreground" aria-hidden />
                    <span className="sr-only">Search launches</span>
                    <input
                      name="q"
                      type="search"
                      placeholder="Search launches"
                      className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
                    />
                  </label>
                </form>
                <Link
                  href="/search"
                  aria-label="Search launches"
                  className="grid size-9 place-items-center rounded-[10px] text-foreground hover:bg-muted xl:hidden"
                >
                  <Search className="size-4" />
                </Link>
                <Suspense fallback={<HeaderAccountFallback />}>
                  <HeaderAccount />
                </Suspense>
                <Suspense fallback={<span aria-hidden className="size-9 lg:hidden" />}>
                  <MobileMenu />
                </Suspense>
              </div>
            </div>
          </header>
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </TooltipProvider>
        <GoogleAnalytics />
      </body>
    </html>
  );
}

/** The header links before the current page is known (no active state). */
function NavLinksFallback() {
  return (
    <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
      {NAV_LINKS.map((link) => (
        <Link key={link.href} href={link.href} className="rounded-lg px-2.5 py-1.5 text-[14px] font-medium text-muted-foreground">
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-8 md:grid-cols-[1.6fr_1fr_1fr]">
        <div>
          <Link href="/" className="inline-block rounded-lg">
            <Wordmark />
          </Link>
          <p className="mt-4 max-w-sm text-muted-foreground">
            A new edition every day at 00:00 UTC: up to 100 products launch, and the community decides
            what rises to the top. Nobody can pay to climb the ranking.
          </p>
        </div>
        <FooterColumn
          title="Discover"
          links={[
            ["Today's launches", "/"],
            ["Leaderboard", "/leaderboard"],
            ["Archive", "/archive"],
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
      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted-foreground sm:px-8">© 2026 LemoLaunch</p>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h2 className="font-display text-base font-bold">{title}</h2>
      <ul className="mt-4 flex flex-col gap-2.5">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="text-muted-foreground transition-colors hover:text-foreground">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
