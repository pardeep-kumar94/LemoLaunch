import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AtSign, Briefcase, CalendarDays, ChevronUp, Code, Globe, MessageCircle, Plus, Zap } from "lucide-react";
import { LogoTile } from "@/components/logo-tile";
import { PlatformBadges } from "@/components/platform-badges";
import { ChangeEmailForm, ChangePasswordForm } from "@/components/profile/account-forms";
import { ProfileForm } from "@/components/profile/profile-form";
import { WithdrawButton } from "@/components/profile/withdraw-button";
import { Segmented } from "@/components/sections";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { getCurrentUser, hasPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatLaunchDay, startOfUtcDay } from "@/lib/dates";
import { formatPrice } from "@/lib/payments";
import { getMyProducts, type MyProduct } from "@/lib/profile";
import { resumeCheckout } from "@/app/actions";

export const metadata: Metadata = pageMetadata({
  title: "Your profile",
  description: "Your LemoLaunch profile, launches and account settings.",
  path: "/profile",
  noindex: true,
});

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
  const [products, commentCount, account] = await Promise.all([
    getMyProducts(user.id, today),
    db.comment.count({ where: { userId: user.id } }),
    db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } }),
  ]);
  const passwordSet = account ? hasPassword(account.passwordHash) : true;
  const upvotes = products.reduce((sum, p) => sum + p.voteCount, 0);
  const joined = user.createdAt.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

  const links = [
    user.websiteUrl && { label: hostOf(user.websiteUrl), href: user.websiteUrl, Icon: Globe },
    user.xUrl && { label: "X", href: user.xUrl, Icon: AtSign },
    user.githubUrl && { label: "GitHub", href: user.githubUrl, Icon: Code },
    user.linkedinUrl && { label: "LinkedIn", href: user.linkedinUrl, Icon: Briefcase },
  ].filter((l): l is { label: string; href: string; Icon: typeof Globe } => Boolean(l));

  return (
    <>
      <section className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-10 pb-8 sm:flex-row sm:items-center sm:gap-7 sm:px-8 sm:pt-12">
          <UserAvatar name={user.name} src={user.avatarUrl} size="lg" className="size-20 rounded-[22px] text-3xl shadow-paper ring-1 ring-border sm:size-28 sm:rounded-[28px] sm:text-4xl" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-4xl leading-[1] font-bold break-words sm:text-[56px]">{user.name}</h1>
            {user.headline && <p className="mt-2 max-w-xl text-lg text-muted-foreground">{user.headline}</p>}
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" aria-hidden />
                Joined {joined}
              </span>
              {links.map(({ label, href, Icon }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-foreground underline decoration-lemon-deep decoration-[1.5px] underline-offset-4 hover:decoration-2"
                >
                  <Icon className="size-4 text-muted-foreground" aria-hidden />
                  {label}
                </a>
              ))}
            </p>
          </div>
          <dl className="flex gap-6 sm:gap-8">
            {[
              ["Products", products.length],
              ["Upvotes", upvotes],
              ["Comments", commentCount],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[13px] text-muted-foreground">{label}</dt>
                <dd className="num text-2xl font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-5 sm:px-8">
          <Segmented
            label="Profile sections"
            options={[
              {
                href: "/profile",
                active: tab === "products",
                label: (
                  <>
                    My products <span className="num text-[12px] opacity-60">{products.length}</span>
                  </>
                ),
              },
              { href: "/profile?tab=edit", active: tab === "edit", label: "Edit profile" },
              { href: "/profile?tab=account", active: tab === "account", label: "Account" },
            ]}
          />
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
        {tab === "products" && <MyProducts products={products} />}
        {tab === "edit" && (
          <SettingsCard title="Edit profile" description="This is how you appear on your comments and launches.">
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
          </SettingsCard>
        )}
        {tab === "account" && (
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <SettingsCard title="Email address">
              <ChangeEmailForm email={user.email} hasPassword={passwordSet} />
            </SettingsCard>
            <SettingsCard title="Password" description="Changing it signs you out on every other device.">
              <ChangePasswordForm hasPassword={passwordSet} />
            </SettingsCard>
          </div>
        )}
      </div>
    </>
  );
}

function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="pt-1">{children}</CardContent>
    </Card>
  );
}

const statusStyles: Record<MyProduct["status"], { label: string; variant: "lemon" | "secondary" | "outline"; dot?: string }> = {
  awaiting_payment: { label: "Awaiting payment", variant: "outline", dot: "bg-destructive" },
  scheduled: { label: "Scheduled", variant: "secondary" },
  live: { label: "Live today", variant: "lemon" },
  launched: { label: "Launched", variant: "outline", dot: "bg-leaf" },
};

const paymentLabels: Record<string, string> = {
  paid: "Paid",
  refunded: "Refunded",
  refund_failed: "Refund failed",
};

function MyProducts({ products }: { products: MyProduct[] }) {
  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-input px-6 py-14 text-center">
        <p className="font-display text-2xl font-bold">No launches yet</p>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">
          Submit your first launch with a logo and screenshots. It shows up here while it waits for its
          seat, and stays here with its upvotes once it goes live.
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link href="/submit">
            <Plus data-icon="inline-start" />
            Submit a launch
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[62ch] text-muted-foreground">
          Cancel a launch any time before it goes live; a paid Launch Pass is refunded in full.
        </p>
        <Button asChild>
          <Link href="/submit">
            <Plus data-icon="inline-start" />
            Submit another
          </Link>
        </Button>
      </div>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-card shadow-paper ring-1 ring-border">
        {products.map((p) => {
          const status = statusStyles[p.status];
          const launchDay = p.launchDate ? formatLaunchDay(p.launchDate) : null;
          const payment = p.plan === "pass" ? paymentLabels[p.paymentStatus] : undefined;
          return (
            <li key={p.key} className="flex flex-col gap-4 px-4 py-4 sm:px-5 md:flex-row md:items-center">
              <div className="flex min-w-0 flex-1 items-start gap-4 md:items-center">
                <LogoTile name={p.name} accent={p.accent} src={p.logoUrl} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[15.5px] font-semibold tracking-[-0.01em]">
                      {p.slug ? (
                        <Link href={`/products/${p.slug}`} className="hover:underline hover:decoration-lemon-deep hover:decoration-2">
                          {p.name}
                        </Link>
                      ) : (
                        p.name
                      )}
                    </h3>
                    <Badge variant={status.variant}>
                      {status.dot && <span aria-hidden className={`size-1.5 rounded-full ${status.dot}`} />}
                      {status.label}
                    </Badge>
                    {p.plan === "pass" && (
                      <Badge variant="outline">
                        <Zap aria-hidden />
                        Launch Pass{payment ? ` · ${payment}` : ""}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-muted-foreground md:truncate">{p.tagline}</p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted-foreground">
                    <span className="inline-flex items-start gap-1.5">
                      <CalendarDays className="mt-px size-3.5 shrink-0" aria-hidden />
                      <span>
                        {launchDay ? (
                          <>
                            {p.status === "scheduled" ? "Goes live " : p.status === "live" ? "Live since " : "Launched "}
                            <span className="font-medium text-foreground">
                              {launchDay.weekday}, {launchDay.day}
                            </span>
                            {p.status === "scheduled" && " at 00:00 UTC"}
                          </>
                        ) : (
                          "Launch day set when you pay"
                        )}
                      </span>
                    </span>
                    <PlatformBadges platforms={p.platforms} />
                    {(p.screenshots > 0 || p.hasVideo) && (
                      <span>
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
                    <p className="mt-2 text-sm text-muted-foreground">
                      Saved. Complete the {formatPrice()} payment and it&apos;s scheduled for the day you picked.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pl-16 md:justify-end md:pl-0">
                {p.kind === "product" && (
                  <span className="num mr-2 flex items-center gap-3 text-[13px]">
                    <span className="inline-flex items-center gap-1">
                      <ChevronUp className="size-3.5" aria-hidden />
                      {p.voteCount}
                      <span className="sr-only"> upvotes</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <MessageCircle className="size-3.5" aria-hidden />
                      {p.commentCount}
                      <span className="sr-only"> comments</span>
                    </span>
                  </span>
                )}
                {p.kind === "product" && p.slug && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/products/${p.slug}#badge`}>Get badge</Link>
                  </Button>
                )}
                {p.status === "awaiting_payment" && (
                  <form action={resumeCheckout.bind(null, p.id)}>
                    <Button type="submit" variant="lemon" size="sm">
                      Complete payment
                    </Button>
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

function hostOf(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

function ProfileSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your profile" className="border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center gap-7 px-4 pt-12 pb-8 motion-safe:animate-pulse sm:px-8">
        <div className="size-24 rounded-[28px] bg-muted sm:size-28" />
        <div className="h-14 w-72 rounded-xl bg-muted" />
      </div>
    </div>
  );
}
