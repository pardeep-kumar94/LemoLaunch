export function AuthSkeleton() {
  return (
    <div
      aria-busy="true"
      className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-10 px-4 py-10 motion-safe:animate-pulse sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-16 lg:py-16"
    >
      <div className="order-2 lg:order-1">
        <div className="size-11 rounded-xl bg-muted" />
        <div className="mt-5 h-32 max-w-md rounded-2xl bg-muted" />
        <div className="mt-8 h-44 max-w-md rounded-2xl bg-muted" />
      </div>
      <div className="order-1 h-[480px] rounded-2xl bg-muted lg:order-2" />
    </div>
  );
}
