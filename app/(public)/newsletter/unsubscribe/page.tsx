import type { Metadata } from "next";
import Link from "next/link";
import { unsubscribeNewsletterToken } from "@/lib/newsletter/actions";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

export default async function UnsubscribeNewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = (await searchParams).token ?? "";
  const result = token ? await unsubscribeNewsletterToken(token) : "invalid";
  const copy = {
    unsubscribed: "This address will not receive further Jimvio newsletter email.",
    expired: "This unsubscribe link has expired. Use the link in a newer message, or contact support.",
    invalid: "This unsubscribe link is not valid.",
    not_configured: "Unsubscribe is not available until the server email secret is configured.",
    database_error: "The unsubscribe request could not be saved. Try the link again later.",
  }[result];

  return (
    <main className="mx-auto max-w-xl px-6 py-24">
      <h1 className="text-2xl font-semibold text-text-primary">Unsubscribe</h1>
      <p className="mt-3 text-sm leading-6 text-text-secondary">{copy}</p>
      <Link href="/privacy" className="mt-6 inline-block text-sm font-medium text-[var(--color-accent)]">
        Privacy
      </Link>
    </main>
  );
}
