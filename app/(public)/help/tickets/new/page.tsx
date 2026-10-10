import { redirect } from "next/navigation";
import { SupportTicketForm } from "@/components/support/ticket-form";
import { getCachedUser } from "@/lib/supabase/server";

export default async function NewTicketPage() {
  const {
    data: { user },
  } = await getCachedUser();
  if (!user) redirect("/login?next=/help/tickets/new");

  return (
    <SupportTicketForm
      defaultEmail={user.email ?? ""}
      defaultName={typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : ""}
      heading="Create a support ticket"
    />
  );
}
