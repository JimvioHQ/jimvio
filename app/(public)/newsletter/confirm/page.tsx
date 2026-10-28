import type { Metadata } from "next";
import Link from "next/link";
import { confirmNewsletterToken } from "@/lib/newsletter/actions";

export const metadata: Metadata = {
  title: "Confirm newsletter",
  robots: { index: false, follow: false },
};

export default async function ConfirmNewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = (await searchParams).token ?? "";
  const result = token ? await confirmNewsletterToken(token) : "invalid";
  const copy = {
    confirmed: "Your subscription is confirmed. Jimvio can send product updates to this address.",
    already_subscribed: "This address is already subscribed.",
    unsubscribed: "This address is unsubscribed. Submit the footer form again if you want a new confirmation email.",
    expired: "This confirmation link has expired. Submit the footer form again.",
    invalid: "This confirmation link is not valid.",
    not_configured: "Newsletter confirmation is not available until the server email secret is configured.",
    database_error: "The subscription could not be saved. Try the link again later.",
  }[result];

  return (
    <main className="mx-auto max-w-xl px-6 py-24">
      <h1 className="text-2xl font-semibold text-text-primary">Newsletter confirmation</h1>
      <p className="mt-3 text-sm leading-6 text-text-secondary">{copy}</p>
      <Link href="/" className="mt-6 inline-block text-sm font-medium text-[var(--color-accent)]">
        Back to Jimvio
      </Link>
    </main>
  );
}
