import { redirect } from "next/navigation";
import { SupportTicketForm } from "@/components/support/ticket-form";
import { getCachedUser } from "@/lib/supabase/server";
import { PHYSICAL_SELLER_SUPPORT_SUBJECT } from "@/lib/products/physical-selling";

export default async function NewTicketPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; category?: string; issueType?: string; description?: string }>;
}) {
  const {
    data: { user },
  } = await getCachedUser();
  const params = await searchParams;
  const subject = params.subject === PHYSICAL_SELLER_SUPPORT_SUBJECT ? params.subject : params.subject?.slice(0, 140) || "";
  if (!user) redirect(`/login?next=${encodeURIComponent(`/help/tickets/new${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`)}`);

  return (
    <SupportTicketForm
      defaultEmail={user.email ?? ""}
      defaultName={typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : ""}
      heading="Create a support ticket"
      defaultSubject={subject}
      defaultCategory={params.category === "selling" ? "selling" : ""}
      defaultIssueType={params.issueType === "account" ? "account" : ""}
      defaultDescription={
        subject === PHYSICAL_SELLER_SUPPORT_SUBJECT
          ? "Please review my seller account for physical product selling. I am requesting business verification."
          : ""
      }
    />
  );
}
