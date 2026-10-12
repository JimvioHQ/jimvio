/**
 * Supabase Auth templates. Production GoTrue sends these.
 * Hosted copies are Dashboard-managed — regenerate with
 * `npx tsx scripts/write-auth-email-templates.ts`.
 * Placeholders are Supabase's. This file never invents a code or token.
 */
import { renderJimvioEmail } from "../shell";

const ASSET_BASE = "https://www.jimvio.com";
const HELP = "https://www.jimvio.com/contact";
const SETTINGS = "https://www.jimvio.com/identity/settings";

export const AUTH_EMAIL_SUBJECTS = {
  confirmation: "Confirm your email",
  invite: "You're invited to Jimvio",
  magicLink: "Your Jimvio sign-in code",
  emailChange: "Confirm your new email address",
  recovery: "Reset your password",
  reauthentication: "Your Jimvio verification code",
  passwordChanged: "Your Jimvio password was changed",
  emailChanged: "Your Jimvio email address was changed",
  phoneChanged: "Your Jimvio phone number was changed",
  identityLinked: "A sign-in method was added to your Jimvio account",
  identityUnlinked: "A sign-in method was removed from your Jimvio account",
  mfaEnrolled: "A security method was added to your Jimvio account",
  mfaUnenrolled: "A security method was removed from your Jimvio account",
} as const;

function authHtml(input: Parameters<typeof renderJimvioEmail>[0]): string {
  return renderJimvioEmail({ ...input, assetBaseUrl: ASSET_BASE, helpUrl: input.helpUrl || HELP }).html;
}

export function confirmSignupHtml(): string {
  return authHtml({
    preview: "Use the verification code below to confirm your email address.",
    icon: "mail-check",
    titleLead: "Confirm your ",
    titleAccent: "email",
    subtitle: "Use the verification code below to confirm your email address and activate your Jimvio account.",
    code: { label: "YOUR VERIFICATION CODE", supabaseOtp: true },
    notice: {
      icon: "clock",
      title: "This code expires in 10 minutes",
      body: "For your security, this code can only be used once. If you didn't create a Jimvio account, you can safely ignore this email.",
    },
    cta: { label: "Confirm Email", url: "{{ .ConfirmationURL }}", trusted: true },
    help: "If you're having trouble confirming your email, contact our support team.",
    helpUrl: HELP,
    assetBaseUrl: ASSET_BASE,
  });
}

export function inviteUserHtml(): string {
  return authHtml({
    preview: "You've been invited to join Jimvio.",
    icon: "shield-check",
    titleLead: "You're ",
    titleAccent: "invited",
    subtitle: "You've been invited to create a Jimvio account.",
    details: {
      label: "YOUR INVITATION",
      headline: "Join Jimvio",
    },
    notice: {
      icon: "clock",
      title: "Accept to continue",
      body: "This invitation link expires for your security. If you were not expecting it, you can ignore this email.",
    },
    cta: { label: "Accept invitation", url: "{{ .ConfirmationURL }}", trusted: true },
    help: "If you're having trouble accepting this invitation, contact our support team.",
    helpUrl: HELP,
    assetBaseUrl: ASSET_BASE,
  });
}

export function magicLinkHtml(): string {
  return authHtml({
    preview: "Use this verification code to sign in to Jimvio.",
    icon: "mail-check",
    titleLead: "Sign in to ",
    titleAccent: "Jimvio",
    subtitle: "Use the verification code below to sign in, or confirm with the button. This code can only be used once.",
    code: { label: "YOUR VERIFICATION CODE", supabaseOtp: true },
    notice: {
      icon: "clock",
      title: "This code expires soon",
      body: "If you didn't try to sign in, you can safely ignore this email.",
    },
    cta: { label: "Sign in", url: "{{ .ConfirmationURL }}", trusted: true },
    help: "If you're having trouble signing in, contact our support team.",
    helpUrl: HELP,
    assetBaseUrl: ASSET_BASE,
  });
}

export function changeEmailHtml(): string {
  return authHtml({
    preview: "Confirm your new Jimvio email address.",
    icon: "mail-check",
    titleLead: "Confirm your ",
    titleAccent: "email",
    subtitle: "Confirm {{ .NewEmail }} to finish updating the email on your Jimvio account.",
    code: { label: "YOUR VERIFICATION CODE", supabaseOtp: true },
    notice: {
      icon: "clock",
      title: "This code expires soon",
      body: "For your security, this code can only be used once. If you didn't request an email change, you can safely ignore this email.",
    },
    cta: { label: "Confirm Email", url: "{{ .ConfirmationURL }}", trusted: true },
    help: "If you're having trouble confirming your email, contact our support team.",
    helpUrl: HELP,
    assetBaseUrl: ASSET_BASE,
  });
}

export function resetPasswordHtml(): string {
  return authHtml({
    preview: "Use the verification code below to reset your Jimvio password.",
    icon: "lock",
    titleLead: "Reset your ",
    titleAccent: "password",
    subtitle: "Use the verification code below to reset your Jimvio account password and regain access.",
    code: { label: "YOUR VERIFICATION CODE", supabaseOtp: true },
    notice: {
      icon: "clock",
      title: "This code expires soon",
      body: "For your security, this code can only be used once. If you didn't request a password reset, you can safely ignore this email.",
    },
    cta: { label: "Reset Password", url: "{{ .ConfirmationURL }}", trusted: true },
    help: "If you're having trouble resetting your password, contact our support team.",
    helpUrl: HELP,
    assetBaseUrl: ASSET_BASE,
  });
}

export function reauthenticationHtml(): string {
  return authHtml({
    preview: "Your Jimvio verification code is inside this email.",
    icon: "lock",
    titleLead: "Verify it's ",
    titleAccent: "you",
    subtitle: "Enter the verification code below to continue. Jimvio will never ask you to share this code.",
    code: { label: "YOUR VERIFICATION CODE", supabaseOtp: true },
    notice: {
      icon: "clock",
      title: "This code expires soon",
      body: "For your security, this code can only be used once. If you didn't try to continue, you can safely ignore this email.",
    },
    cta: { label: "Return to Jimvio", url: "{{ .SiteURL }}", trusted: true },
    help: "If you're having trouble verifying your identity, contact our support team.",
    helpUrl: HELP,
    assetBaseUrl: ASSET_BASE,
  });
}

function securityNotice(input: {
  preview: string;
  titleLead: string;
  titleAccent: string;
  subtitle: string;
  notice: string;
  ctaLabel: string;
}): string {
  return authHtml({
    preview: input.preview,
    icon: "shield-user",
    titleLead: input.titleLead,
    titleAccent: input.titleAccent,
    subtitle: input.subtitle,
    notice: {
      icon: "alert",
      title: "Wasn't you?",
      body: input.notice,
    },
    cta: { label: input.ctaLabel, url: SETTINGS },
    help: "If you have any questions about this security alert, contact our support team.",
    helpUrl: HELP,
    assetBaseUrl: ASSET_BASE,
  });
}

export function passwordChangedHtml(): string {
  return securityNotice({
    preview: "Your Jimvio password was changed.",
    titleLead: "Password ",
    titleAccent: "changed",
    subtitle: "The password for your Jimvio account was just updated. If this was you, no further action is needed.",
    notice: "If you don't recognize this change, reset your password immediately and contact support.",
    ctaLabel: "Secure Your Account",
  });
}

export function emailChangedHtml(): string {
  return securityNotice({
    preview: "Your Jimvio email address was changed.",
    titleLead: "Email ",
    titleAccent: "changed",
    subtitle: "The email address on your Jimvio account was updated. If this was you, no further action is needed.",
    notice: "If you don't recognize this change, contact support right away.",
    ctaLabel: "Secure Your Account",
  });
}

export function phoneChangedHtml(): string {
  return securityNotice({
    preview: "Your Jimvio phone number was changed.",
    titleLead: "Phone ",
    titleAccent: "changed",
    subtitle: "The phone number on your Jimvio account was updated. If this was you, no further action is needed.",
    notice: "If you don't recognize this change, contact support right away.",
    ctaLabel: "Secure Your Account",
  });
}

export function identityLinkedHtml(): string {
  return securityNotice({
    preview: "A sign-in method was added to your Jimvio account.",
    titleLead: "Sign-in method ",
    titleAccent: "added",
    subtitle: "A new sign-in method was linked to your Jimvio account. If this was you, no further action is needed.",
    notice: "If you don't recognize this change, remove unknown connections and secure your account.",
    ctaLabel: "Review connected accounts",
  });
}

export function identityUnlinkedHtml(): string {
  return securityNotice({
    preview: "A sign-in method was removed from your Jimvio account.",
    titleLead: "Sign-in method ",
    titleAccent: "removed",
    subtitle: "A sign-in method was removed from your Jimvio account. If this was you, no further action is needed.",
    notice: "If you didn't remove a sign-in method, contact support immediately.",
    ctaLabel: "Review connected accounts",
  });
}

export function mfaEnrolledHtml(): string {
  return securityNotice({
    preview: "A security method was added to your Jimvio account.",
    titleLead: "Security method ",
    titleAccent: "added",
    subtitle: "A multi-factor authentication method was added to your Jimvio account. If this was you, no further action is needed.",
    notice: "If you didn't add this method, secure your account and contact support.",
    ctaLabel: "Review security settings",
  });
}

export function mfaUnenrolledHtml(): string {
  return securityNotice({
    preview: "A security method was removed from your Jimvio account.",
    titleLead: "Security method ",
    titleAccent: "removed",
    subtitle: "A multi-factor authentication method was removed from your Jimvio account. If this was you, no further action is needed.",
    notice: "If you didn't remove this method, secure your account and contact support.",
    ctaLabel: "Review security settings",
  });
}
