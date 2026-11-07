export function AuthSkeleton() {
  return (
    <div
      aria-busy="true"
      className="mx-auto grid max-w-6xl gap-8 px-4 py-10 motion-safe:animate-pulse sm:px-8 lg:grid-cols-[1fr_minmax(0,460px)] lg:gap-14 lg:py-16"
    >
      <div className="order-2 h-[520px] rounded-[26px] bg-signal/50 lg:order-1" />
      <div className="order-1 h-[520px] rounded-[26px] bg-line lg:order-2" />
    </div>
  );
}
