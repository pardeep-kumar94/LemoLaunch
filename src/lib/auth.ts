import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

// Email + password accounts with database sessions. The cookie holds a random
// token; the database only stores its SHA-256, so a leaked table can't sign anyone in.

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

export const SESSION_COOKIE = "lp_session";
const SESSION_DAYS = 30;
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** False for accounts with no password ("!"), such as ones created with Google. */
export function hasPassword(passwordHash: string): boolean {
  return passwordHash.startsWith("scrypt$");
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Starts a session for `userId` and sets the cookie. Server Actions only. */
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { id: hashToken(token), userId, expiresAt } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

/** Ends the current session, if any. Server Actions only. */
export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: hashToken(token) } });
  store.delete(SESSION_COOKIE);
}

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  headline: string | null;
  websiteUrl: string | null;
  xUrl: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  notificationsSeenAt: Date | null;
  createdAt: Date;
};

/** The signed-in user for this request, or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { id: hashToken(token) },
    select: {
      expiresAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          headline: true,
          websiteUrl: true,
          xUrl: true,
          githubUrl: true,
          linkedinUrl: true,
          notificationsSeenAt: true,
          createdAt: true,
        },
      },
    },
  });
  if (!session || session.expiresAt.getTime() < Date.now()) return null;
  return session.user;
});

/** The SHA-256 id of the current browser's session, if signed in. Server code only. */
export async function currentSessionId(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? hashToken(token) : null;
}

/** Only allow redirects back to paths on this site. */
export function safeNextPath(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/";
}
