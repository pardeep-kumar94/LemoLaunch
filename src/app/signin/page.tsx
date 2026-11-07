import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPage } from "@/components/auth-page";
import { AuthSkeleton } from "@/components/auth-skeleton";

export const metadata: Metadata = { title: "Sign in | LaunchPad" };

export default function SignInPage({ searchParams }: PageProps<"/signin">) {
  return (
    <main>
      <Suspense fallback={<AuthSkeleton />}>
        <AuthPage mode="signin" searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
