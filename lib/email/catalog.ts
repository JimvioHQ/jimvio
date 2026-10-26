/**
 * Coverage for Jimvio email. IMPLEMENTED means a real trigger sends it.
 * Supabase templates are implemented in the repo; hosted Auth HTML is not
 * updated by a Vercel deploy.
 */
export type EmailCoverage = "IMPLEMENTED" | "NOT_APPLICABLE" | "BLOCKED";

export type EmailCatalogEntry = {
  id: string;
  subject: string;
  recipient: string;
  trigger: string;
  classification: "transactional" | "security" | "marketing";
  mechanism: "resend" | "supabase_auth";
  status: EmailCoverage;
  notes?: string;
};

export const EMAIL_CATALOG: EmailCatalogEntry[] = [
  { id: "auth.confirmation", subject: "Confirm your email", recipient: "New account email", trigger: "Supabase sign-up confirmation", classification: "security", mechanism: "supabase_auth", status: "IMPLEMENTED", notes: "Hosted template updated through the Management API and read back. No live test message was sent." },
  { id: "auth.invite", subject: "You're invited to Jimvio", recipient: "Invited user", trigger: "Supabase invite user", classification: "security", mechanism: "supabase_auth", status: "IMPLEMENTED" },
  { id: "auth.magic_link", subject: "Your Jimvio sign-in code", recipient: "Signing-in user", trigger: "Supabase magic link / OTP", classification: "security", mechanism: "supabase_auth", status: "IMPLEMENTED" },
  { id: "auth.email_change", subject: "Confirm your new email address", recipient: "New email address", trigger: "Supabase email change", classification: "security", mechanism: "supabase_auth", status: "IMPLEMENTED" },
  { id: "auth.recovery", subject: "Reset your password", recipient: "Account email", trigger: "Supabase password recovery", classification: "security", mechanism: "supabase_auth", status: "IMPLEMENTED" },
  { id: "auth.reauthentication", subject: "Your Jimvio verification code", recipient: "Account email", trigger: "Supabase reauthentication", classification: "security", mechanism: "supabase_auth", status: "IMPLEMENTED" },
  { id: "auth.password_changed", subject: "Your Jimvio password was changed", recipient: "Account email", trigger: "Supabase password-changed notification", classification: "security", mechanism: "supabase_auth", status: "IMPLEMENTED" },
  { id: "auth.email_changed", subject: "Your Jimvio email address was changed", recipient: "Previous email", trigger: "Supabase email-changed notification", classification: "security", mechanism: "supabase_auth", status: "IMPLEMENTED" },
  { id: "auth.phone_changed", subject: "Your Jimvio phone number was changed", recipient: "Account email", trigger: "Supabase phone-changed notification", classification: "security", mechanism: "supabase_auth", status: "IMPLEMENTED" },
  { id: "auth.identity_linked", subject: "A sign-in method was added to your Jimvio account", recipient: "Account email", trigger: "Supabase identity linked", classification: "security", mechanism: "supabase_auth", status: "IMPLEMENTED" },
  { id: "auth.identity_unlinked", subject: "A sign-in method was removed from your Jimvio account", recipient: "Account email", trigger: "Supabase identity unlinked", classification: "security", mechanism: "supabase_auth", status: "IMPLEMENTED" },
  { id: "auth.mfa_enrolled", subject: "A security method was added to your Jimvio account", recipient: "Account email", trigger: "Supabase MFA enrolled", classification: "security", mechanism: "supabase_auth", status: "IMPLEMENTED" },
  { id: "auth.mfa_unenrolled", subject: "A security method was removed from your Jimvio account", recipient: "Account email", trigger: "Supabase MFA unenrolled", classification: "security", mechanism: "supabase_auth", status: "IMPLEMENTED" },
  { id: "order.created", subject: "Order #… created", recipient: "Buyer", trigger: "Checkout creates a pending order", classification: "transactional", mechanism: "resend", status: "IMPLEMENTED" },
  { id: "order.received", subject: "Order #… received", recipient: "Buyer", trigger: "Verified payment finalization", classification: "transactional", mechanism: "resend", status: "IMPLEMENTED", notes: "This is the payment-success email. A second payment-success message is not sent." },
  { id: "order.seller_pending", subject: "New order #…", recipient: "Seller", trigger: "Checkout creates a pending order", classification: "transactional", mechanism: "resend", status: "IMPLEMENTED" },
  { id: "order.seller_paid", subject: "New order #…", recipient: "Seller", trigger: "Verified payment finalization", classification: "transactional", mechanism: "resend", status: "IMPLEMENTED" },
  { id: "payment.failed", subject: "Payment failed", recipient: "Buyer", trigger: "Flutterwave failure webhook", classification: "transactional", mechanism: "resend", status: "IMPLEMENTED" },
  { id: "order.shipped", subject: "Shipped — order #…", recipient: "Buyer", trigger: "Fulfillment status becomes shipped", classification: "transactional", mechanism: "resend", status: "IMPLEMENTED" },
  { id: "order.delivered", subject: "Delivered — order #…", recipient: "Buyer", trigger: "Fulfillment status becomes delivered", classification: "transactional", mechanism: "resend", status: "IMPLEMENTED" },
  { id: "order.cancelled", subject: "Cancelled — order #…", recipient: "Buyer", trigger: "Merchant cancel or fulfillment cancel", classification: "transactional", mechanism: "resend", status: "IMPLEMENTED" },
  { id: "refund.completed", subject: "Refund completed", recipient: "Buyer", trigger: "Flutterwave refund confirmed", classification: "transactional", mechanism: "resend", status: "IMPLEMENTED" },
  { id: "welcome", subject: "Welcome to Jimvio", recipient: "New member", trigger: "Welcome onboarding completion", classification: "transactional", mechanism: "resend", status: "IMPLEMENTED" },
  { id: "withdrawal.requested", subject: "Withdrawal request received", recipient: "Wallet owner", trigger: "Withdrawal request created (pending)", classification: "transactional", mechanism: "resend", status: "IMPLEMENTED" },
  { id: "payout.sent", subject: "Payout sent", recipient: "Wallet owner", trigger: "Admin marks a pending payout paid", classification: "transactional", mechanism: "resend", status: "IMPLEMENTED" },
  { id: "payout.failed", subject: "Payout not sent", recipient: "Wallet owner", trigger: "Admin rejects a pending payout", classification: "transactional", mechanism: "resend", status: "IMPLEMENTED" },
  { id: "verification.decision", subject: "Verification approved or update", recipient: "Verified user", trigger: "Didit webhook Approved or Declined", classification: "transactional", mechanism: "resend", status: "IMPLEMENTED" },
  { id: "ugc.application", subject: "Campaign application emails", recipient: "Creator or brand", trigger: "Application submitted, accepted, or declined", classification: "transactional", mechanism: "resend", status: "IMPLEMENTED" },
  { id: "ugc.invite", subject: "Campaign invitation", recipient: "Invited creator and brand", trigger: "Invitation created or accepted", classification: "transactional", mechanism: "resend", status: "IMPLEMENTED" },
  { id: "ugc.revision", subject: "Changes requested / revision submitted", recipient: "Creator or brand", trigger: "Revision request or resubmit", classification: "transactional", mechanism: "resend", status: "IMPLEMENTED" },
  { id: "ugc.reward_paid", subject: "Creator reward paid", recipient: "Creator", trigger: "Fixed reward credited as paid", classification: "transactional", mechanism: "resend", status: "IMPLEMENTED" },
  { id: "support.ticket", subject: "Support request received or reply", recipient: "Requester and support inbox", trigger: "Support ticket or conversation reply", classification: "transactional", mechanism: "resend", status: "IMPLEMENTED" },
  { id: "contact.form", subject: "Contact form", recipient: "Jimvio support inbox", trigger: "Public contact form", classification: "transactional", mechanism: "resend", status: "IMPLEMENTED" },
  { id: "login.detected", subject: "Login detected", recipient: "Account email", trigger: "No new-device detector exists", classification: "security", mechanism: "resend", status: "NOT_APPLICABLE" },
  { id: "account.deletion", subject: "Account deletion", recipient: "Account email", trigger: "Deletion is a support request, not an automated event", classification: "security", mechanism: "resend", status: "NOT_APPLICABLE" },
  { id: "marketing.newsletter", subject: "Confirm your Jimvio newsletter subscription", recipient: "Person who submitted the footer form", trigger: "Footer subscription is stored and Resend accepts the confirmation email", classification: "marketing", mechanism: "resend", status: "IMPLEMENTED", notes: "Double opt-in. Marketing email is allowed only after confirmation and is stopped by unsubscribe. A provider rejection does not count as subscribed." },
  { id: "community.mention", subject: "Mention", recipient: "Mentioned member", trigger: "In-app notification only", classification: "transactional", mechanism: "resend", status: "NOT_APPLICABLE" },
];
