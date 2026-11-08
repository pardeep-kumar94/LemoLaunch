import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { siteOrigin } from "@/lib/origin";

// "Continue with Google": OAuth 2.0 authorization code flow with PKCE and state. The state,
// PKCE verifier and post-login path ride in a short-lived httpOnly cookie between the redirect
// to Google and the callback.

export const GOOGLE_STATE_COOKIE = "lp_google_oauth";
export const GOOGLE_STATE_MAX_AGE = 10 * 60;

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export function googleEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export async function googleRedirectUri(): Promise<string> {
  return `${await siteOrigin()}/api/auth/google/callback`;
}

export type GoogleState = { state: string; verifier: string; next: string };

/** A fresh state + PKCE pair and the Google URL to send the browser to. */
export async function startGoogleSignIn(next: string): Promise<{ url: string; cookie: GoogleState }> {
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const url = new URL(AUTHORIZE_URL);
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: await googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return { url: url.toString(), cookie: { state, verifier, next } };
}

export function parseGoogleState(value: string | undefined): GoogleState | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<GoogleState>;
    return typeof parsed.state === "string" && typeof parsed.verifier === "string" && typeof parsed.next === "string"
      ? (parsed as GoogleState)
      : null;
  } catch {
    return null;
  }
}

export type GoogleProfile = { sub: string; email: string; emailVerified: boolean; name: string; picture: string | null };

/** Exchanges the callback code for tokens, then reads the profile from Google's userinfo endpoint. */
export async function fetchGoogleProfile(code: string, verifier: string): Promise<GoogleProfile | null> {
  const tokenResponse = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: await googleRedirectUri(),
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
    cache: "no-store",
  });
  if (!tokenResponse.ok) return null;
  const tokens = (await tokenResponse.json()) as { access_token?: string };
  if (!tokens.access_token) return null;

  const userResponse = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    cache: "no-store",
  });
  if (!userResponse.ok) return null;
  const info = (await userResponse.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean | string;
    name?: string;
    picture?: string;
  };
  if (!info.sub || !info.email) return null;
  return {
    sub: info.sub,
    email: info.email.trim().toLowerCase(),
    emailVerified: info.email_verified === true || info.email_verified === "true",
    name: (info.name ?? "").trim().slice(0, 60) || info.email.split("@")[0].slice(0, 60),
    picture: info.picture?.startsWith("https://") ? info.picture : null,
  };
}

/** Readable messages for /signin?error=… after a failed Google sign-in. */
export const googleErrors: Record<string, string> = {
  google_unavailable: "Google sign-in isn't available right now. Use your email and password instead.",
  google_cancelled: "Google sign-in was cancelled.",
  google_failed: "Google sign-in didn't work. Please try again.",
  google_unverified: "Your Google account's email isn't verified, so we can't use it to sign in.",
  google_conflict: "This email is already linked to a different Google account.",
};

/**
 * The account for this Google user: already linked, or an existing account with the same
 * (Google-verified) email, which gets linked, or a new account with no password.
 */
export async function findOrCreateGoogleUser(profile: GoogleProfile): Promise<string | null> {
  const linked = await db.user.findUnique({ where: { googleId: profile.sub }, select: { id: true } });
  if (linked) return linked.id;

  const byEmail = await db.user.findUnique({ where: { email: profile.email }, select: { id: true, googleId: true } });
  if (byEmail) {
    if (byEmail.googleId && byEmail.googleId !== profile.sub) return null;
    await db.user.update({ where: { id: byEmail.id }, data: { googleId: profile.sub } });
    return byEmail.id;
  }

  try {
    const created = await db.user.create({
      data: {
        name: profile.name,
        email: profile.email,
        googleId: profile.sub,
        passwordHash: "!",
        avatarUrl: profile.picture,
      },
      select: { id: true },
    });
    return created.id;
  } catch (error) {
    // Two callbacks racing for the same new account: use the one that won.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await db.user.findUnique({ where: { googleId: profile.sub }, select: { id: true } });
      return existing?.id ?? null;
    }
    throw error;
  }
}
