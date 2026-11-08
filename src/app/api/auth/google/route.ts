import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/auth";
import { GOOGLE_STATE_COOKIE, GOOGLE_STATE_MAX_AGE, googleEnabled, startGoogleSignIn } from "@/lib/google-auth";

/** Sends the browser to Google's account chooser: /api/auth/google?next=/submit */
export async function GET(request: Request) {
  if (!googleEnabled()) redirect("/signin?error=google_unavailable");

  const next = safeNextPath(new URL(request.url).searchParams.get("next"));
  const { url, cookie } = await startGoogleSignIn(next);
  (await cookies()).set(GOOGLE_STATE_COOKIE, JSON.stringify(cookie), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: GOOGLE_STATE_MAX_AGE,
    path: "/api/auth/google",
  });
  redirect(url);
}
