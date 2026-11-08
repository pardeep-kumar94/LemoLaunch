import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Suspense } from "react";
import { AuthPage } from "@/components/auth-page";
import { AuthSkeleton } from "@/components/auth-skeleton";

export const metadata: Metadata = pageMetadata({
  title: "Create an account",
  description: "Join LemoLaunch for free to launch your product, upvote new startups and follow makers.",
  path: "/signup",
  noindex: true,
});

export default function SignUpPage({ searchParams }: PageProps<"/signup">) {
  return (
    <main>
      <Suspense fallback={<AuthSkeleton />}>
        <AuthPage mode="signup" searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
