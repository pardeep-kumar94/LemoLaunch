import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { CommentIcon, UpTriangle } from "@/components/icons";
import { LogoTile } from "@/components/logo-tile";
import { PlatformBadges } from "@/components/platform-badges";
import { ChangeEmailForm, ChangePasswordForm } from "@/components/profile/account-forms";
import { ProfileForm } from "@/components/profile/profile-form";
import { WithdrawButton } from "@/components/profile/withdraw-button";
import { FilterTab } from "@/components/sections";
import { UserAvatar } from "@/components/user-avatar";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatLaunchDay, startOfUtcDay } from "@/lib/dates";
import { formatPrice } from "@/lib/payments";
import { getMyProducts, type MyProduct } from "@/lib/profile";
import { resumeCheckout } from "@/app/actions";

export const metadata: Metadata = { title: "Your profile | LemoLaunch", robots: { index: false } };

type Tab = "products" | "edit" | "account";

export default function ProfilePage({ searchParams }: PageProps<"/profile">) {
  return (
    <main>
      <Suspense fallback={<ProfileSkeleton />}>
        <Profile searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Profile({ searchParams }: { searchParams: PageProps<"/profile">["searchParams"] }) {
  const { tab: tabParam } = await searchParams;
  const tab: Tab = tabParam === "edit" || tabParam === "account" ? tabParam : "products";

  const user = await getCurrentUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(tab === "products" ? "/profile" : `/profile?tab=${tab}`)}`);

  await connection();
  const today = startOfUtcDay(new Date());
  const [products, commentCount] = await Promise.all([
    getMyProducts(user.id, today),
    db.comment.count({ where: { userId: user.id } }),
  ]);
  const upvotes = products.reduce((sum, p) => sum + p.voteCount, 0);
  const joined = user.createdAt.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <>
      <section className="band">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pt-10 pb-12 sm:px-8 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-5 sm:gap-6">
            <UserAvatar
              name={user.name}
              src={user.avatarUrl}
              size="lg"
              className="border-2 border-on-signal shadow-[5px_5px_0_0_var(--pop)]"
            />
            <div className="min-w-0">
              <h1
                className="font-display text-4xl leading-[0.95] font-extrabold tracking-[-0.02em] sm:text-6xl"
              >
                {user.name}
              </h1>
              {user.headline && <p className="mt-2 max-w-xl text-lg opacity-80">{user.headline}</p>}
              <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold opacity-75">
                <span>Joined {joined}</span>
                {user.websiteUrl && (
                  <a
                    href={user.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-pop decoration-2 underline-offset-4"
                  >
                    {user.websiteUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                  </a>
                )}
              </p>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {[
              ["Products", products.length],
              ["Upvotes", upvotes],
              ["Comments", commentCount],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[16px] border-2 border-on-signal bg-white px-4 py-3 text-center">
                <dt className="text-xs font-bold opacity-70">{label}</dt>
                <dd className="font-display text-2xl font-extrabold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="hazard" />
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
        <nav aria-label="Profile sections" className="flex flex-wrap gap-2">
          <FilterTab href="/profile" active={tab === "products"}>
            My products <span className="font-normal opacity-70">{products.length}</span>
          </FilterTab>
          <FilterTab href="/profile?tab=edit" active={tab === "edit"}>
            Edit profile
          </FilterTab>
          <FilterTab href="/profile?tab=account" active={tab === "account"}>
            Account
          </FilterTab>
        </nav>

        <div className="mt-8">
          {tab === "products" && <MyProducts products={products} />}
          {tab === "edit" && (
            <Card title="Edit profile" description="This is how you appear on your comments and launches.">
              <ProfileForm
                user={{
                  name: user.name,
                  headline: user.headline,
                  websiteUrl: user.websiteUrl,
                  xUrl: user.xUrl,
                  githubUrl: user.githubUrl,
                  linkedinUrl: user.linkedinUrl,
                  avatarUrl: user.avatarUrl,
                }}
              />
            </Card>
          )}
          {tab === "account" && (
            <div className="grid gap-8 lg:grid-cols-2">
              <Card title="Email address">
                <ChangeEmailForm email={user.email} />
              </Card>
              <Card title="Password" description="Changing it signs you out on every other device.">
                <ChangePasswordForm />
              </Card>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="max-w-3xl rounded-[22px] border-2 border-ink bg-paper p-6 shadow-[6px_6px_0_0_var(--pop)] sm:p-8">
      <h2 className="font-display text-2xl font-extrabold">{title}</h2>
      {description && <p className="mt-1 text-mist">{description}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

const statusStyles: Record<MyProduct["status"], { label: string; className: string }> = {
  awaiting_payment: { label: "Awaiting payment", className: "bg-pop-wash border-pop" },
  scheduled: { label: "Scheduled", className: "bg-silver border-[#b9aea4]" },
  live: { label: "Live today", className: "bg-pop border-on-signal" },
  launched: { label: "Launched", className: "bg-[#e3f5ea] border-[#8fcfa8]" },
};

function MyProducts({ products }: { products: MyProduct[] }) {
  if (products.length === 0) {
    return (
      <div className="rounded-[22px] border-2 border-dashed border-line px-6 py-14 text-center">
        <p className="font-display text-2xl font-extrabold">Nothing on the pad yet</p>
        <p className="mx-auto mt-2 max-w-md text-mist">
          Submit your first launch with a logo, screenshots and a video. It shows up here while
          it&apos;s scheduled, and stays here with its upvotes once it goes live.
        </p>
        <Link
          href="/submit"
          className="press mt-6 inline-flex h-12 items-center rounded-xl border-2 border-on-signal bg-signal px-6 font-bold text-on-signal shadow-[4px_4px_0_0_var(--pop)]"
        >
          Submit a launch
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-mist">
          Your launches. You can cancel one any time before it goes live, and a paid Launch Pass is
          refunded in full.
        </p>
        <Link
          href="/submit"
          className="press inline-flex h-11 items-center rounded-xl border-2 border-on-signal bg-on-signal px-4 font-bold text-signal shadow-[4px_4px_0_0_var(--pop)] dark:bg-signal dark:text-on-signal"
        >
          Submit another
        </Link>
      </div>
      <ul className="grid gap-3.5">
        {products.map((p) => {
          const status = statusStyles[p.status];
          const launchDay = p.launchDate ? formatLaunchDay(p.launchDate) : null;
          return (
            <li
              key={p.key}
              className="flex flex-col gap-4 rounded-[18px] border-2 border-line bg-paper p-4 sm:flex-row sm:items-center sm:p-5"
            >
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <LogoTile name={p.name} accent={p.accent} src={p.logoUrl} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-lg font-extrabold">
                      {p.slug ? (
                        <Link href={`/products/${p.slug}`} className="decoration-pop decoration-[3px] underline-offset-4 hover:underline">
                          {p.name}
                        </Link>
                      ) : (
                        p.name
                      )}
                    </h3>
                    <span className={`rounded-full border-2 px-2.5 py-px text-xs font-bold text-on-signal ${status.className}`}>
                      {status.label}
                    </span>
                    {p.plan === "pass" && (
                      <span className="medal-chip medal-chip-gold rounded-md px-1.5 py-px text-xs font-bold">
                        Launch Pass
                      </span>
                    )}
                    <PlatformBadges platforms={p.platforms} />
                  </div>
                  <p className="mt-0.5 text-mist sm:truncate">{p.tagline}</p>
                  <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <span>
                      <span className="text-mist">Launch day </span>
                      <span className="font-semibold">
                        {launchDay ? `${launchDay.weekday}, ${launchDay.day}` : "Set when you pay"}
                      </span>
                    </span>
                    {(p.screenshots > 0 || p.hasVideo) && (
                      <span className="text-mist">
                        {[
                          p.screenshots > 0 && `${p.screenshots} ${p.screenshots === 1 ? "screenshot" : "screenshots"}`,
                          p.hasVideo && "a video",
                        ]
                          .filter(Boolean)
                          .join(" and ")}
                      </span>
                    )}
                  </p>
                  {p.status === "awaiting_payment" && (
                    <p className="mt-2 text-sm text-mist">
                      Saved. Complete the {formatPrice()} payment and it&apos;s scheduled for the day you picked.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                {p.kind === "product" && (
                  <>
                    <span className="flex items-center gap-1.5 rounded-lg bg-signal-wash px-2.5 py-1.5 text-sm font-bold tabular-nums">
                      <UpTriangle className="size-2.5" /> {p.voteCount}
                      <span className="sr-only"> upvotes</span>
                    </span>
                    <span className="flex items-center gap-1.5 rounded-lg bg-signal-wash px-2.5 py-1.5 text-sm font-bold tabular-nums">
                      <CommentIcon className="size-4" /> {p.commentCount}
                      <span className="sr-only"> comments</span>
                    </span>
                  </>
                )}
                {p.kind === "product" && p.slug && (
                  <Link
                    href={`/products/${p.slug}#badge`}
                    className="inline-flex h-10 items-center rounded-xl border-2 border-line px-3.5 text-sm font-semibold hover:border-ink"
                  >
                    Get badge
                  </Link>
                )}
                {p.status === "awaiting_payment" && (
                  <form action={resumeCheckout.bind(null, p.id)}>
                    <button
                      type="submit"
                      className="press h-10 rounded-xl border-2 border-on-signal bg-signal px-3.5 text-sm font-bold text-on-signal shadow-[3px_3px_0_0_var(--pop)]"
                    >
                      Complete payment
                    </button>
                  </form>
                )}
                {(p.status === "awaiting_payment" || p.status === "scheduled") && (
                  <WithdrawButton
                    kind={p.kind}
                    id={p.id}
                    name={p.name}
                    label={p.status === "scheduled" ? "Cancel launch" : "Delete"}
                    refundNote={p.paymentStatus === "paid"}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your profile">
      <div className="band">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 pt-10 pb-12 motion-safe:animate-pulse sm:px-8">
          <div className="size-24 rounded-[26px] bg-on-signal/10 sm:size-28" />
          <div className="h-14 w-72 rounded-xl bg-on-signal/10" />
        </div>
        <div className="hazard" />
      </div>
    </div>
  );
}
