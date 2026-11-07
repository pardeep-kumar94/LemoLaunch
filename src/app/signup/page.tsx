import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPage } from "@/components/auth-page";
import { AuthSkeleton } from "@/components/auth-skeleton";

export const metadata: Metadata = { title: "Create an account | LemoLaunch" };

export default function SignUpPage({ searchParams }: PageProps<"/signup">) {
  return (
    <main>
      <Suspense fallback={<AuthSkeleton />}>
        <AuthPage mode="signup" searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
