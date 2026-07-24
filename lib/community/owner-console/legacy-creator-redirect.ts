import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  OWNER_CONSOLE_HUB,
  ownerConsoleHref,
} from "@/lib/community/owner-console";

async function resolveSlug(communityId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(`/creator/${communityId}/dashboard`)}`
    );
  }
  const { data } = await supabase
    .from("communities")
    .select("slug")
    .eq("id", communityId)
    .maybeSingle();
  return data?.slug ?? null;
}

export async function redirectCreatorStudio(
  communityId: string,
  section: string = ""
): Promise<never> {
  const slug = await resolveSlug(communityId);
  if (!slug) redirect(OWNER_CONSOLE_HUB);
  redirect(ownerConsoleHref(slug, section));
}
