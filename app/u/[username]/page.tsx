import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IdentityProfileView } from "@/components/identity/IdentityProfileView";
import { PresenceProvider } from "@/components/presence/PresenceProvider";
import { IdentityPublicProfileClient } from "@/components/identity/IdentityPublicProfileClient";
import type { IdentityProfilePayload } from "@/lib/identity/types";

export const dynamic = "force-dynamic";

async function getViewerId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

async function safeLoadIdentity(
  username: string,
  viewerId: string | null,
): Promise<IdentityProfilePayload | null | "resolver-unavailable"> {
  try {
    const { getIdentityByUsername } = await import("@/lib/identity/resolve");
    return await getIdentityByUsername(username, viewerId);
  } catch (err) {
    console.error("[app/u/[username]] @/lib/identity/resolve unavailable, using client fallback", err);
    return "resolver-unavailable";
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const viewerId = await getViewerId();
  const payload = await safeLoadIdentity(username, viewerId);
  if (!payload || payload === "resolver-unavailable") {
    return { title: payload === "resolver-unavailable" ? "Profile · Jimvio" : "Profile not found · Jimvio" };
  }

  const name = payload.profile.fullName || payload.profile.username || "Jimvio member";
  const description = payload.profile.headline || payload.profile.bio || `${name} on Jimvio.`;

  return {
    title: `${name} (@${payload.profile.username ?? username})`,
    description,
    openGraph: {
      title: name,
      description,
      images: payload.profile.avatarUrl ? [payload.profile.avatarUrl] : undefined,
    },
  };
}

export default async function PublicIdentityPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const viewerId = await getViewerId();
  const payload = await safeLoadIdentity(username, viewerId);

  if (payload === "resolver-unavailable") {
    return <IdentityPublicProfileClient username={username} />;
  }
  if (!payload) notFound();

  return (
    <PresenceProvider>
      <IdentityProfileView payload={payload} />
    </PresenceProvider>
  );
}
