import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { countOwnedCommunities } from "@/lib/creator-server";

export default async function CreatorIndexPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/creator")}`);
  }

  const n = await countOwnedCommunities(supabase, user.id);
  if (n === 0) {
    redirect("/communities/create");
  }

  const { data: first } = await supabase
    .from("communities")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!first) redirect("/communities/create");

  redirect(`/creator/${first.id}/dashboard`);
}

