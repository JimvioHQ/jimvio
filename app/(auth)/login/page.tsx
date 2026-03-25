import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Sign In - Jimvio",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full space-y-6 animate-pulse">
          <div className="h-8 bg-[var(--color-surface-secondary)] rounded-lg w-3/4 mx-auto" />
          <div className="h-11 bg-[var(--color-surface-secondary)] rounded-xl" />
          <div className="h-11 bg-[var(--color-surface-secondary)] rounded-xl" />
          <div className="h-11 bg-[var(--color-surface-secondary)] rounded-xl" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
