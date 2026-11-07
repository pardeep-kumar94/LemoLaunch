"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { createSession, destroySession, hashPassword, safeNextPath, verifyPassword } from "@/lib/auth";

export type AuthState = {
  error?: string;
  fieldErrors?: Partial<Record<"name" | "email" | "password", string>>;
  values?: { name?: string; email?: string };
};

// A real scrypt hash of a throwaway password, checked when the email isn't found.
const DUMMY_HASH =
  "scrypt$b868714ac479a27056166a43e33b3a94$5400dd3acab9c641721423ffc03f6e7086fe2c07f357368363455c1dde9985f28c8822339977e87d2a1b8e427489780755c6f9bb8cb8fa8dff43da851454bca2";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function signUp(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const name = readField(formData, "name").trim();
  const email = readField(formData, "email").trim().toLowerCase();
  const password = readField(formData, "password");
  const next = safeNextPath(formData.get("next"));

  const fieldErrors: AuthState["fieldErrors"] = {};
  if (!name || name.length > 60) fieldErrors.name = "Enter your name (60 characters or fewer).";
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    fieldErrors.email = "Enter an email address like name@example.com.";
  }
  if (password.length < 8 || password.length > 200) {
    fieldErrors.password = "Use at least 8 characters.";
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values: { name, email } };

  let userId: string;
  try {
    const user = await db.user.create({
      data: { name, email, passwordHash: await hashPassword(password) },
      select: { id: true },
    });
    userId = user.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        fieldErrors: { email: "An account with this email already exists. Sign in instead." },
        values: { name, email },
      };
    }
    throw error;
  }

  await createSession(userId);
  redirect(next);
}

export async function signIn(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const email = readField(formData, "email").trim().toLowerCase();
  const password = readField(formData, "password");
  const next = safeNextPath(formData.get("next"));

  const user = email
    ? await db.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } })
    : null;
  // Always run a hash check so response time doesn't reveal which emails have accounts,
  // and use the same message whether the email or the password was wrong.
  const passwordMatches = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !passwordMatches) {
    return { error: "That email and password don't match an account.", values: { email } };
  }

  await createSession(user.id);
  redirect(next);
}

export async function signOut() {
  await destroySession();
  redirect("/");
}
