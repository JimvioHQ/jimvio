import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateCommunityForm } from "@/components/community/creator/CreateCommunityForm";

export const metadata = {
  title: "Create Community",
};

export default async function CreateCommunityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/communities/create")}`);
  }

  return (
    <div className="min-h-[calc(100vh-var(--navbar-height))] bg-[var(--color-bg)] py-6 sm:py-10">
      <div className="text-center mb-8 px-4">
        <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-text-primary)]">Create a community</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-2">Set up your space in a few steps.</p>
      </div>
      <CreateCommunityForm />
    </div>
  );
}
