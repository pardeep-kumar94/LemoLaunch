import { redirect } from "next/navigation";
import { connection } from "next/server";
import { CircleAlert } from "lucide-react";
import { AuthForm, AuthSwitch } from "@/components/auth-form";
import { LogoTile } from "@/components/logo-tile";
import { SeatGrid } from "@/components/seats";
import { Card, CardContent } from "@/components/ui/card";
import { LemonMark } from "@/components/wordmark";
import { getCurrentUser, safeNextPath } from "@/lib/auth";
import { googleEnabled, googleErrors } from "@/lib/google-auth";
import { startOfUtcDay } from "@/lib/dates";
import { countLaunchesInRange, getRankedLaunches } from "@/lib/launches";
import { DAILY_LAUNCH_LIMIT } from "@/lib/publish";

const copy = {
  signin: {
    panelTitle: "Welcome back.",
    panelBody: "Check on your launches, answer comments and see how today's edition is shaping up.",
    cardTitle: "Sign in",
    cardBody: "Good to see you again.",
  },
  signup: {
    panelTitle: "Take a seat in tomorrow's edition.",
    panelBody: "A free account lets you launch your product and talk with the people trying it.",
    cardTitle: "Create your account",
    cardBody: "It takes less than a minute.",
  },
};

const points = [
  ["A new edition every day", `Up to ${DAILY_LAUNCH_LIMIT} products go live at 00:00 UTC, each with its own seat.`],
  ["Ranked by the community", "Upvotes decide the order. Nobody can pay to climb it."],
  ["Free to launch", "Join the queue at no cost and take the next open seat."],
];

/** Shared body for /signin and /signup. Signed-in visitors go straight on. */
export async function AuthPage({
  mode,
  searchParams,
}: {
  mode: "signin" | "signup";
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const googleError = typeof params.error === "string" ? googleErrors[params.error] : undefined;
  if (await getCurrentUser()) redirect(next);

  await connection();
  const today = startOfUtcDay(new Date());
  const [launches, todayCount] = await Promise.all([
    getRankedLaunches({ from: today, to: today, visitorId: null, limit: 5 }),
    countLaunchesInRange(today, today),
  ]);
  const text = copy[mode];
  const verb = mode === "signin" ? "Sign in" : "Create an account";
  const purpose =
    next === "/submit"
      ? `${verb} to submit your launch.`
      : next.startsWith("/products/")
        ? `${verb} to join the conversation.`
        : null;
  const seatsTaken = Math.min(todayCount, DAILY_LAUNCH_LIMIT);

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-10 px-4 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-16 lg:py-16">
      <section aria-labelledby="auth-pitch" className="order-2 lg:order-1">
        <LemonMark className="size-11" />
        <h1 id="auth-pitch" className="mt-5 max-w-[16ch] font-display text-[clamp(2.5rem,5vw,3.75rem)] leading-[0.98] font-bold text-balance">
          {text.panelTitle}
        </h1>
        <p className="mt-4 max-w-[46ch] text-lg text-muted-foreground">{text.panelBody}</p>

        <ul className="mt-8 grid max-w-md gap-5">
          {points.map(([title, body], i) => (
            <li key={title} className="flex gap-4">
              <span className="num grid size-7 shrink-0 place-items-center rounded-lg bg-accent text-[13px] font-medium text-accent-foreground">
                {i + 1}
              </span>
              <span>
                <span className="block font-semibold">{title}</span>
                <span className="text-[15px] text-muted-foreground">{body}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-9 flex max-w-md items-center gap-5 rounded-2xl bg-card p-4 shadow-paper ring-1 ring-border">
          <SeatGrid total={DAILY_LAUNCH_LIMIT} filled={seatsTaken} columns={20} className="w-36 shrink-0 gap-[2px]" />
          <div className="min-w-0 text-[15px] leading-snug">
            <p className="font-semibold">
              <span className="num">{seatsTaken}</span> of {DAILY_LAUNCH_LIMIT} seats taken today
            </p>
            {launches.length > 0 ? (
              <div className="mt-2 flex items-center gap-2">
                <span className="flex -space-x-1.5" aria-hidden="true">
                  {launches.slice(0, 4).map((launch) => (
                    <span key={launch.id} className="rounded-[8px] ring-2 ring-card">
                      <LogoTile name={launch.name} accent={launch.accent} src={launch.logoUrl} size="xs" />
                    </span>
                  ))}
                </span>
                <span className="truncate text-sm text-muted-foreground">
                  Including {launches.slice(0, 2).map((l) => l.name).join(" and ")}
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">The next edition goes live at 00:00 UTC.</p>
            )}
          </div>
        </div>
      </section>

      <Card className="order-1 lg:order-2" aria-labelledby="auth-card-title">
        <CardContent className="px-6 py-2 sm:px-8 sm:py-4">
          <AuthSwitch mode={mode} next={next} />
          <h2 id="auth-card-title" className="mt-7 font-display text-[28px] font-bold">
            {text.cardTitle}
          </h2>
          <p className="mt-1 text-muted-foreground">{purpose ?? text.cardBody}</p>
          {googleError && (
            <p role="alert" className="mt-5 flex gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {googleError}
            </p>
          )}
          {googleEnabled() && (
            <div className="mt-6">
              <GoogleButton next={next} />
              <p className="mt-6 flex items-center gap-3 text-[13px] text-muted-foreground" aria-hidden="true">
                <span className="h-px flex-1 bg-border" />
                or with email
                <span className="h-px flex-1 bg-border" />
              </p>
            </div>
          )}
          <div className="mt-6">
            <AuthForm mode={mode} next={next} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** A plain link: the route handler starts the Google flow, so this works without JavaScript. */
function GoogleButton({ next }: { next: string }) {
  return (
    <a
      href={`/api/auth/google?next=${encodeURIComponent(next)}`}
      className="flex h-11 w-full items-center justify-center gap-3 rounded-[11px] border border-border bg-card text-[15px] font-medium shadow-xs transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <svg viewBox="0 0 48 48" aria-hidden="true" className="size-5">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.5Z" />
        <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7Z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44Z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.5Z" />
      </svg>
      Continue with Google
    </a>
  );
}
