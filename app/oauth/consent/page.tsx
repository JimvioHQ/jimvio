import { redirect } from "next/navigation";
import { assertPlatformAdmin } from "@/lib/auth/platform-admin";
import { OAuthConsentClient } from "./consent-client";

export const dynamic = "force-dynamic";

export default async function OAuthConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ authorization_id?: string }>;
}) {
  const { authorization_id: authorizationId } = await searchParams;
  if (!authorizationId || !/^[A-Za-z0-9_-]{12,200}$/.test(authorizationId)) {
    return <main className="mx-auto max-w-xl px-6 py-20"><h1 className="text-2xl font-bold">Invalid authorization request</h1><p className="mt-3 text-sm text-zinc-500">The OAuth authorization request is missing or invalid.</p></main>;
  }

  const auth = await assertPlatformAdmin();
  if (!auth.ok && auth.status === 401) {
    redirect(`/login?next=${encodeURIComponent(`/oauth/consent?authorization_id=${authorizationId}`)}`);
  }
  if (!auth.ok) {
    return <main className="mx-auto max-w-xl px-6 py-20"><h1 className="text-2xl font-bold">Administrator access required</h1><p className="mt-3 text-sm text-zinc-500">Only Jimvio platform administrators can authorize the Media Publisher integration.</p></main>;
  }

  return <OAuthConsentClient authorizationId={authorizationId} />;
}
