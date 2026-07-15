import { Suspense } from "react";
import { RegisterForm } from "./register-form";
import { redirectIfAuthenticated } from "@/lib/auth/redirect-authenticated";

export const metadata = {
  title: "Create Account - Jimvio",
};

interface PageProps {
  searchParams: Promise<{ next?: string; redirect?: string }>;
}

export default async function RegisterPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const next = params.next ?? params.redirect ?? null;
  await redirectIfAuthenticated(next);

  return (
    <Suspense
      fallback={
        <div className="w-full space-y-6 animate-pulse">
          <div className="h-8 bg-[var(--color-surface-secondary)] rounded-sm w-3/4 mx-auto" />
          <div className="h-11 bg-[var(--color-surface-secondary)] rounded-sm" />
          <div className="h-11 bg-[var(--color-surface-secondary)] rounded-sm" />
          <div className="h-11 bg-[var(--color-surface-secondary)] rounded-sm" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
