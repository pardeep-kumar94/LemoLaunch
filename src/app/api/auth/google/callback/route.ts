import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession } from "@/lib/auth";
import {
  fetchGoogleProfile,
  findOrCreateGoogleUser,
  GOOGLE_STATE_COOKIE,
  googleEnabled,
  parseGoogleState,
  type GoogleProfile,
} from "@/lib/google-auth";

/** Google sends the browser back here with ?code&state (or ?error when the user backs out). */
export async function GET(request: Request) {
  if (!googleEnabled()) redirect("/signin?error=google_unavailable");

  const params = new URL(request.url).searchParams;
  const store = await cookies();
  const saved = parseGoogleState(store.get(GOOGLE_STATE_COOKIE)?.value);
  store.delete({ name: GOOGLE_STATE_COOKIE, path: "/api/auth/google" });
  const back = (error: string) => `/signin?error=${error}${saved ? `&next=${encodeURIComponent(saved.next)}` : ""}`;

  if (params.get("error")) redirect(back("google_cancelled"));
  const code = params.get("code");
  if (!saved || !code || params.get("state") !== saved.state) redirect(back("google_failed"));

  let profile: GoogleProfile | null = null;
  try {
    profile = await fetchGoogleProfile(code, saved.verifier);
  } catch {
    profile = null;
  }
  if (!profile) redirect(back("google_failed"));
  if (!profile.emailVerified) redirect(back("google_unverified"));

  const userId = await findOrCreateGoogleUser(profile);
  if (!userId) redirect(back("google_conflict"));

  await createSession(userId);
  redirect(saved.next);
}
