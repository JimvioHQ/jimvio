/**
 * Jimvio Auth / Security email template library.
 *
 * Production delivery path: Supabase Auth (GoTrue) sends these emails.
 * Hosted templates are Dashboard-managed — paste from `supabase/templates/*.html`.
 * Local CLI uses `supabase/config.toml` content_path bindings.
 *
 * Do not put secrets or tokens in these files beyond Supabase template vars.
 */

import { authEmailShell } from "./shared";

export const AUTH_EMAIL_SUBJECTS = {
  confirmation: "Confirm your Jimvio account",
  invite: "You're invited to Jimvio",
  magicLink: "Your Jimvio sign-in link",
  emailChange: "Confirm your new email address",
  recovery: "Reset your Jimvio password",
  reauthentication: "Verify your identity to continue",
  passwordChanged: "Your Jimvio password was changed",
  emailChanged: "Your Jimvio email address was changed",
  phoneChanged: "Your Jimvio phone number was changed",
  identityLinked: "A sign-in method was added to your Jimvio account",
  identityUnlinked: "A sign-in method was removed from your Jimvio account",
  mfaEnrolled: "A security method was added to your Jimvio account",
  mfaUnenrolled: "A security method was removed from your Jimvio account",
} as const;

export function confirmSignupHtml(): string {
  return authEmailShell({
    preview: "Confirm your email to finish creating your Jimvio account.",
    heading: "Confirm your Jimvio account",
    bodyHtml: `<p style="margin:0 0 12px;">Thanks for joining Jimvio.</p>
      <p style="margin:0;">Confirm your email address to activate your account and sign in with email and password.</p>`,
    ctaLabel: "Confirm email",
    ctaUrl: "{{ .ConfirmationURL }}",
    fallbackUrl: "{{ .ConfirmationURL }}",
    securityNote:
      "This link expires for your security. If you did not create a Jimvio account, ignore this email.",
  });
}

export function inviteUserHtml(): string {
  return authEmailShell({
    preview: "You've been invited to join Jimvio.",
    heading: "You're invited to Jimvio",
    bodyHtml: `<p style="margin:0 0 12px;">You've been invited to create a Jimvio account.</p>
      <p style="margin:0;">Accept the invitation to set up your account and get started.</p>`,
    ctaLabel: "Accept invitation",
    ctaUrl: "{{ .ConfirmationURL }}",
    fallbackUrl: "{{ .ConfirmationURL }}",
  });
}

export function magicLinkHtml(): string {
  return authEmailShell({
    preview: "Use this secure link to sign in to Jimvio.",
    heading: "Your Jimvio sign-in link",
    bodyHtml: `<p style="margin:0 0 12px;">Use the button below to sign in securely.</p>
      <p style="margin:0;">This link works once and expires shortly. Or enter this code if prompted: <strong style="color:#111827;">{{ .Token }}</strong></p>`,
    ctaLabel: "Sign in to Jimvio",
    ctaUrl: "{{ .ConfirmationURL }}",
    fallbackUrl: "{{ .ConfirmationURL }}",
    securityNote:
      "If you did not try to sign in, ignore this email. Someone may have entered your address by mistake.",
  });
}

export function changeEmailHtml(): string {
  return authEmailShell({
    preview: "Confirm your new email address for Jimvio.",
    heading: "Confirm your new email address",
    bodyHtml: `<p style="margin:0 0 12px;">You requested to update the email on your Jimvio account.</p>
      <p style="margin:0;">Confirm this address to complete the change.</p>`,
    ctaLabel: "Confirm new email",
    ctaUrl: "{{ .ConfirmationURL }}",
    fallbackUrl: "{{ .ConfirmationURL }}",
    securityNote:
      "If you did not request an email change, secure your account and contact support.",
  });
}

export function resetPasswordHtml(): string {
  return authEmailShell({
    preview: "Reset your Jimvio password securely.",
    heading: "Reset your Jimvio password",
    bodyHtml: `<p style="margin:0 0 12px;">We received a request to reset the password for your Jimvio account.</p>
      <p style="margin:0;">Choose a new password using the button below. For your security, this link expires soon.</p>`,
    ctaLabel: "Reset password",
    ctaUrl: "{{ .ConfirmationURL }}",
    fallbackUrl: "{{ .ConfirmationURL }}",
    securityNote:
      "If you did not request a password reset, you can ignore this email. Your password will not change.",
  });
}

export function reauthenticationHtml(): string {
  return authEmailShell({
    preview: "Verify your identity to continue on Jimvio.",
    heading: "Verify your identity",
    bodyHtml: `<p style="margin:0 0 12px;">Jimvio needs a quick verification before you continue with a sensitive action.</p>
      <p style="margin:0;">Your verification code is: <strong style="font-size:22px;letter-spacing:0.08em;color:#111827;">{{ .Token }}</strong></p>`,
    securityNote:
      "Never share this code. Jimvio will never ask you for your password or verification codes by phone.",
  });
}

export function passwordChangedHtml(): string {
  return authEmailShell({
    preview: "Your Jimvio password was changed.",
    heading: "Your password was changed",
    bodyHtml: `<p style="margin:0 0 12px;">The password for your Jimvio account was just updated.</p>
      <p style="margin:0;">If this was you, no further action is needed.</p>`,
    ctaLabel: "Review account security",
    ctaUrl: "https://www.jimvio.com/identity/settings",
    securityNote:
      "If you did not change your password, reset it immediately and contact support.",
  });
}

export function emailChangedHtml(): string {
  return authEmailShell({
    preview: "Your Jimvio email address was changed.",
    heading: "Your email address was changed",
    bodyHtml: `<p style="margin:0;">The email address on your Jimvio account was updated successfully.</p>`,
    ctaLabel: "Open account settings",
    ctaUrl: "https://www.jimvio.com/identity/settings",
    securityNote:
      "If you did not change your email, contact support right away.",
  });
}

export function phoneChangedHtml(): string {
  return authEmailShell({
    preview: "Your Jimvio phone number was changed.",
    heading: "Your phone number was changed",
    bodyHtml: `<p style="margin:0;">The phone number on your Jimvio account was updated successfully.</p>`,
    ctaLabel: "Open account settings",
    ctaUrl: "https://www.jimvio.com/identity/settings",
    securityNote:
      "If you did not change your phone number, contact support right away.",
  });
}

export function identityLinkedHtml(): string {
  return authEmailShell({
    preview: "A sign-in method was added to your Jimvio account.",
    heading: "Sign-in method added",
    bodyHtml: `<p style="margin:0;">A new sign-in method was linked to your Jimvio account.</p>`,
    ctaLabel: "Review connected accounts",
    ctaUrl: "https://www.jimvio.com/identity/settings",
    securityNote:
      "If you did not link a sign-in method, remove unknown connections and secure your account.",
  });
}

export function identityUnlinkedHtml(): string {
  return authEmailShell({
    preview: "A sign-in method was removed from your Jimvio account.",
    heading: "Sign-in method removed",
    bodyHtml: `<p style="margin:0;">A sign-in method was removed from your Jimvio account.</p>`,
    ctaLabel: "Review connected accounts",
    ctaUrl: "https://www.jimvio.com/identity/settings",
    securityNote:
      "If you did not remove a sign-in method, contact support immediately.",
  });
}

export function mfaEnrolledHtml(): string {
  return authEmailShell({
    preview: "A security method was added to your Jimvio account.",
    heading: "Security method added",
    bodyHtml: `<p style="margin:0;">A multi-factor authentication method was added to your Jimvio account.</p>`,
    ctaLabel: "Review security settings",
    ctaUrl: "https://www.jimvio.com/identity/settings",
    securityNote:
      "If you did not add this method, secure your account and contact support.",
  });
}

export function mfaUnenrolledHtml(): string {
  return authEmailShell({
    preview: "A security method was removed from your Jimvio account.",
    heading: "Security method removed",
    bodyHtml: `<p style="margin:0;">A multi-factor authentication method was removed from your Jimvio account.</p>`,
    ctaLabel: "Review security settings",
    ctaUrl: "https://www.jimvio.com/identity/settings",
    securityNote:
      "If you did not remove this method, secure your account and contact support.",
  });
}
