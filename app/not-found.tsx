import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-[var(--color-surface)] to-[var(--color-surface-secondary)]">
      <div className="text-center space-y-6">
        <div>
          <h1 className="text-6xl font-black text-[var(--color-text-primary)]">404</h1>
          <p className="text-xl text-[var(--color-text-muted)] mt-2">Page not found</p>
        </div>
        <p className="text-[var(--color-text-secondary)] max-w-sm">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link href="/">
          <Button className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-bold rounded-xl">
            Go home
          </Button>
        </Link>
      </div>
    </div>
  );
}
