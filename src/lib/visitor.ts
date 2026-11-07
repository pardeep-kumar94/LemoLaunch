import { cookies } from "next/headers";

// Anonymous visitor id used to remember upvotes until accounts exist.
export const VISITOR_COOKIE = "lp_visitor";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function readVisitorId(): Promise<string | null> {
  const value = (await cookies()).get(VISITOR_COOKIE)?.value;
  return value && UUID_PATTERN.test(value) ? value : null;
}

/** Returns the visitor id, issuing a new cookie if needed. Server Actions only. */
export async function ensureVisitorId(): Promise<string> {
  const existing = await readVisitorId();
  if (existing) return existing;

  const id = crypto.randomUUID();
  (await cookies()).set(VISITOR_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return id;
}
