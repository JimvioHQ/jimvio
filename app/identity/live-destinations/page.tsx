import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Live Destinations" };

/**
 * Legacy General Settings entry — Live Destinations now live inside
 * Live → Settings. Keep this route for OAuth return bookmarks.
 */
export default async function IdentityLiveDestinationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/communities/live")}`);
  }

  redirect("/communities/live?open=settings");
}
