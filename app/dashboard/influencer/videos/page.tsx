export const dynamic = "force-dynamic";

import React from "react";
import { VideoStudio } from "@/components/studio/VideoStudio";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Short Videos Studio | Jimvio",
};

export default async function ShortVideosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard/influencer/videos");
  }

  // Ensure user is an influencer
  const { data: inf } = await supabase
    .from("influencers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!inf) {
    redirect("/dashboard/influencer"); // Redirect to activation page
  }

  return (
    <div className="max-w-6xl mx-auto py-6 animate-fade-in">
      <VideoStudio />
    </div>
  );
}
