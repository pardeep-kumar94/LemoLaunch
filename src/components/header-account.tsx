import Link from "next/link";
import { signOut } from "@/app/auth-actions";
import { UserAvatar } from "@/components/user-avatar";
import { getCurrentUser } from "@/lib/auth";

// No display class here: callers choose (hidden on phones, inline-flex from sm up).
const submitClass =
  "press h-11 items-center rounded-xl border-2 border-on-signal bg-on-signal px-4 text-[15px] font-bold whitespace-nowrap text-signal shadow-[4px_4px_0_0_var(--pop)]";

/** Sign-in link or account menu, plus the submit button. Reads the session cookie. */
export async function HeaderAccount() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <>
        <Link
          href="/signin"
          className="inline-flex h-11 items-center rounded-xl border-2 border-on-signal bg-white/60 px-4 text-[15px] font-bold whitespace-nowrap transition-colors hover:bg-white"
        >
          Sign in
        </Link>
        <Link href="/submit" className={`${submitClass} hidden sm:inline-flex`}>
          Submit a launch
        </Link>
      </>
    );
  }

  return (
    <>
      <Link href="/submit" className={`${submitClass} hidden sm:inline-flex`}>
        Submit a launch
      </Link>
      <details className="group relative">
        <summary
          aria-label={`Account menu for ${user.name}`}
          className="grid size-11 cursor-pointer list-none place-items-center rounded-xl border-2 border-on-signal bg-white/60 transition-colors hover:bg-white [&::-webkit-details-marker]:hidden"
        >
          <UserAvatar name={user.name} src={user.avatarUrl} size="sm" />
        </summary>
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border-2 border-ink bg-paper p-2 text-ink shadow-[6px_6px_0_0_var(--pop)]">
          <Link href="/profile" className="flex items-center gap-3 rounded-xl px-3 pt-2 pb-3 hover:bg-signal-wash">
            <UserAvatar name={user.name} src={user.avatarUrl} size="md" />
            <span className="min-w-0">
              <span className="block truncate font-bold">{user.name}</span>
              <span className="block truncate text-sm text-mist">{user.email}</span>
            </span>
          </Link>
          <div className="my-1 h-0.5 bg-line" />
          <Link href="/profile" className="block rounded-lg px-3 py-2 font-semibold hover:bg-signal-wash">
            My products
          </Link>
          <Link href="/profile?tab=edit" className="block rounded-lg px-3 py-2 font-semibold hover:bg-signal-wash">
            Edit profile
          </Link>
          <Link href="/profile?tab=account" className="block rounded-lg px-3 py-2 font-semibold hover:bg-signal-wash">
            Account settings
          </Link>

          <Link href="/submit" className="block rounded-lg px-3 py-2 font-semibold hover:bg-signal-wash sm:hidden">
            Submit a launch
          </Link>
          <div className="my-1 h-0.5 bg-line" />
          <form action={signOut}>
            <button type="submit" className="w-full rounded-lg px-3 py-2 text-left font-semibold hover:bg-signal-wash">
              Sign out
            </button>
          </form>
        </div>
      </details>
    </>
  );
}

export function HeaderAccountFallback() {
  return <span aria-hidden="true" className="h-11 w-24 rounded-xl bg-on-signal/10" />;
}
