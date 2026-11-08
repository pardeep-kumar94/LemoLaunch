import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Suspense } from "react";
import { AuthPage } from "@/components/auth-page";
import { AuthSkeleton } from "@/components/auth-skeleton";

export const metadata: Metadata = pageMetadata({
  title: "Sign in",
  description: "Sign in to LemoLaunch to upvote, comment, review and launch your product.",
  path: "/signin",
  noindex: true,
});

export default function SignInPage({ searchParams }: PageProps<"/signin">) {
  return (
    <main>
      <Suspense fallback={<AuthSkeleton />}>
        <AuthPage mode="signin" searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
