import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AuthForm, AuthSwitch } from "@/components/auth-form";
import { CheckIcon } from "@/components/icons";
import { LogoTile } from "@/components/logo-tile";
import { getCurrentUser, safeNextPath } from "@/lib/auth";
import { startOfUtcDay } from "@/lib/dates";
import { countLaunchesInRange, getRankedLaunches } from "@/lib/launches";

const copy = {
  signin: {
    panelTitle: "Welcome back to the pad.",
    panelBody: "Pick up where you left off: check on your submissions and catch up on the conversation.",
    cardTitle: "Sign in",
    cardBody: "Good to see you again.",
  },
  signup: {
    panelTitle: "Launch day starts here.",
    panelBody: "A free account lets you put your product on the pad and talk with the people trying it.",
    cardTitle: "Create your account",
    cardBody: "It takes less than a minute.",
  },
};

const perks = [
  ["Submit your launches", "Add your logo, screenshots and a video, and pick your launch day."],
  ["Join the conversation", "Ask makers questions and share feedback on every launch."],
  ["Climb the leaderboard", "Rally upvotes on launch day and aim for the gold medal."],
];

/** Shared body for /signin and /signup. Signed-in visitors go straight on. */
export async function AuthPage({
  mode,
  searchParams,
}: {
  mode: "signin" | "signup";
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const next = safeNextPath((await searchParams).next);
  if (await getCurrentUser()) redirect(next);

  await connection();
  const today = startOfUtcDay(new Date());
  const [launches, todayCount] = await Promise.all([
    getRankedLaunches({ from: today, to: today, visitorId: null }),
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

  return (
    <div className="mx-auto grid max-w-6xl items-start gap-8 px-4 py-10 sm:px-8 lg:grid-cols-[1fr_minmax(0,460px)] lg:gap-14 lg:py-16">
      <section
        aria-labelledby="auth-pitch"
        className="relative order-2 overflow-hidden rounded-[26px] border-2 border-on-signal bg-signal text-on-signal shadow-[8px_8px_0_0_var(--pop)] lg:order-1"
      >
        <div className="hazard h-3" />
        <div className="p-7 sm:p-10">
          <h1
            id="auth-pitch"
            className="font-display text-[clamp(2.5rem,5vw,3.75rem)] leading-[0.95] font-extrabold tracking-[-0.02em]"
          >
            {text.panelTitle}
          </h1>
          <p className="mt-4 max-w-md text-lg opacity-80">{text.panelBody}</p>

          <ul className="mt-8 grid gap-4">
            {perks.map(([title, body]) => (
              <li key={title} className="flex gap-3.5">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border-2 border-on-signal bg-white">
                  <CheckIcon className="size-4" />
                </span>
                <span>
                  <span className="block font-bold">{title}</span>
                  <span className="text-[15px] opacity-75">{body}</span>
                </span>
              </li>
            ))}
          </ul>

          {launches.length > 0 && (
            <div className="mt-9 flex flex-wrap items-center gap-4 rounded-[18px] border-2 border-on-signal/15 bg-white/50 p-4">
              <span className="flex -space-x-3" aria-hidden="true">
                {launches.slice(0, 5).map((launch) => (
                  <span key={launch.id} className="rounded-[14px] ring-[3px] ring-signal">
                    <LogoTile name={launch.name} accent={launch.accent} src={launch.logoUrl} size="sm" />
                  </span>
                ))}
              </span>
              <p className="text-[15px] leading-snug">
                <span className="font-bold">
                  {todayCount} {todayCount === 1 ? "product" : "products"} launched today
                </span>
                <span className="block opacity-75">
                  Including {launches.slice(0, 2).map((l) => l.name).join(" and ")}.
                </span>
              </p>
            </div>
          )}
        </div>
      </section>

      <section
        aria-labelledby="auth-card-title"
        className="order-1 rounded-[26px] border-2 border-ink bg-paper p-6 shadow-[8px_8px_0_0_var(--ink)] sm:p-8 lg:order-2"
      >
        <AuthSwitch mode={mode} next={next} />
        <h2 id="auth-card-title" className="mt-7 font-display text-[28px] font-extrabold tracking-[-0.01em]">
          {text.cardTitle}
        </h2>
        <p className="mt-1 text-mist">{purpose ?? text.cardBody}</p>
        <div className="mt-6">
          <AuthForm mode={mode} next={next} />
        </div>
      </section>
    </div>
  );
}
