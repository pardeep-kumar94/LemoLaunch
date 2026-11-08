import Link from "next/link";
import { Plus } from "lucide-react";
import { signOut } from "@/app/auth-actions";
import { AnalyticsIdentity } from "@/components/analytics/analytics-identity";
import { NotificationBell } from "@/components/notification-bell";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCurrentUser } from "@/lib/auth";
import { startOfUtcDay } from "@/lib/dates";
import { getNotifications } from "@/lib/notifications";

/** Sign-in link or account menu, plus the submit button. Reads the session cookie. */
export async function HeaderAccount() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <>
        <AnalyticsIdentity user={null} />
        <Button asChild variant="ghost">
          <Link href="/signin">Sign in</Link>
        </Button>
        <Button asChild className="hidden sm:inline-flex">
          <Link href="/submit">
            <Plus data-icon="inline-start" />
            Submit a launch
          </Link>
        </Button>
      </>
    );
  }

  const notifications = await getNotifications(user);
  const today = startOfUtcDay(new Date()).getTime();

  return (
    <>
      <AnalyticsIdentity
        user={{ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt.toISOString() }}
      />
      <NotificationBell
        unreadCount={notifications.unreadCount}
        items={notifications.items.map(({ launchDate, ...item }) => ({
          ...item,
          when: daysAgo(Math.round((today - launchDate.getTime()) / 86_400_000)),
        }))}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label={`Account menu for ${user.name}`} className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <UserAvatar name={user.name} src={user.avatarUrl} size="sm" className="size-8" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="flex items-center gap-3 py-2 font-normal">
            <UserAvatar name={user.name} src={user.avatarUrl} size="md" />
            <span className="min-w-0">
              <span className="block truncate font-semibold text-foreground">{user.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profile">My products</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/profile?tab=edit">Edit profile</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/profile?tab=account">Account settings</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <form action={signOut}>
            <DropdownMenuItem asChild>
              <button type="submit" className="w-full">
                Sign out
              </button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button asChild className="hidden sm:inline-flex">
        <Link href="/submit">
          <Plus data-icon="inline-start" />
          Submit a launch
        </Link>
      </Button>
    </>
  );
}

function daysAgo(days: number): string {
  if (days <= 0) return "Launched today";
  if (days === 1) return "Launched yesterday";
  return `Launched ${days} days ago`;
}

export function HeaderAccountFallback() {
  return <span aria-hidden="true" className="h-9 w-40 rounded-[10px] bg-muted" />;
}
