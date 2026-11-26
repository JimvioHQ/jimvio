import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IdentityProfileView } from "@/components/identity/IdentityProfileView";
import { PresenceProvider } from "@/components/presence/PresenceProvider";
import type { IdentityProfilePayload } from "@/lib/identity/types";

export const dynamic = "force-dynamic";

async function getViewerId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

async function loadProfile(userId: string, viewerId: string | null): Promise<IdentityProfilePayload | null> {
  try {
    const { getIdentityByUserId } = await import("@/lib/identity/resolve");
    return await getIdentityByUserId(userId, viewerId);
  } catch (error) {
    console.error("[app/members/[userId]] Failed to resolve member profile", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  const { userId } = await params;
  const payload = await loadProfile(userId, await getViewerId());
  if (!payload || payload.restricted) {
    return { title: payload?.restricted ? "Private profile · Jimvio" : "Profile not found · Jimvio", robots: { index: false, follow: false } };
  }

  const name = payload.profile.fullName || payload.profile.username || "Jimvio member";
  const description = payload.profile.headline || payload.profile.bio || `${name} on Jimvio.`;
  return {
    title: name,
    description,
    openGraph: {
      title: name,
      description,
      images: payload.profile.avatarUrl ? [payload.profile.avatarUrl] : undefined,
    },
  };
}

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const payload = await loadProfile(userId, await getViewerId());
  if (!payload) notFound();

  return (
    <PresenceProvider>
      <IdentityProfileView payload={payload} />
    </PresenceProvider>
  );
}
