import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-6xl px-4 pt-16 pb-6 sm:px-8 sm:pt-24">
      <h1 className="max-w-2xl font-display text-5xl leading-[0.95] font-bold text-balance sm:text-[68px]">
        This page isn&apos;t in any edition
      </h1>
      <p className="mt-5 max-w-lg text-[17px] text-muted-foreground">
        It doesn&apos;t exist, or the product was removed. Today&apos;s launches are still on the
        homepage, and every past day is in the archive.
      </p>
      <div className="mt-8 flex flex-wrap gap-2">
        <Button asChild size="lg">
          <Link href="/">See today&apos;s launches</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/archive">Browse the archive</Link>
        </Button>
      </div>
    </main>
  );
}
