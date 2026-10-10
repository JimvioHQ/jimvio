import { ProductFeedbackForm } from "@/components/soft-launch/ProductFeedbackWidget";
import { SupportTicketForm } from "@/components/support/ticket-form";
import { customerSupportEmail } from "@/lib/contact-email";
import { getCachedUser } from "@/lib/supabase/server";

export default async function HelpContactPage() {
  const {
    data: { user },
  } = await getCachedUser();
  const email = customerSupportEmail();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Contact support</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4B5563]">
          Send a ticket with the form. It is saved before you see a reference. You can also email{" "}
          <a className="font-semibold text-[#FF5A1F]" href={`mailto:${email}`}>
            {email}
          </a>
          . The support chat on Help pages keeps the same conversation for follow-up. Marketplace messages and live-room chat are not Jimvio support.
        </p>
      </header>
      <SupportTicketForm
        requireContact={!user}
        defaultEmail={user?.email ?? ""}
        defaultName={typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : ""}
        heading="Contact form"
      />
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Product feedback</h2>
        <p className="mt-1 mb-4 text-sm text-[#6B7280]">
          Bugs and feature notes still go to the product team through the existing feedback form.
        </p>
        <ProductFeedbackForm title="Send feedback" description="This is saved as product feedback, separate from a support ticket." />
      </section>
    </div>
  );
}
