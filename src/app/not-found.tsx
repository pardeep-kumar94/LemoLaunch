import Link from "next/link";

export default function NotFound() {
  return (
    <main>
      <section className="band">
        <div className="mx-auto max-w-6xl px-4 pt-14 pb-14 sm:px-8">
          <h1 className="font-display text-5xl font-extrabold tracking-tight sm:text-7xl">
            Nothing on this pad
          </h1>
          <p className="mt-4 max-w-md text-lg opacity-80">
            This page doesn&apos;t exist, or the product was removed. Today&apos;s launches are
            still on the homepage.
          </p>
          <Link
            href="/"
            className="press mt-8 inline-flex h-12 items-center rounded-xl border-2 border-on-signal bg-on-signal px-6 font-bold text-signal shadow-[4px_4px_0_0_var(--pop)]"
          >
            See today&apos;s launches
          </Link>
        </div>
        <div className="hazard" />
      </section>
    </main>
  );
}
