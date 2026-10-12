import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AUTH_EMAIL_SUBJECTS,
  changeEmailHtml,
  confirmSignupHtml,
  emailChangedHtml,
  identityLinkedHtml,
  identityUnlinkedHtml,
  inviteUserHtml,
  magicLinkHtml,
  mfaEnrolledHtml,
  mfaUnenrolledHtml,
  passwordChangedHtml,
  phoneChangedHtml,
  reauthenticationHtml,
  resetPasswordHtml,
} from "../lib/email/auth-templates/index.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "supabase", "templates");

const files: Record<string, { subject: string; html: string }> = {
  "confirmation.html": { subject: AUTH_EMAIL_SUBJECTS.confirmation, html: confirmSignupHtml() },
  "invite.html": { subject: AUTH_EMAIL_SUBJECTS.invite, html: inviteUserHtml() },
  "magic_link.html": { subject: AUTH_EMAIL_SUBJECTS.magicLink, html: magicLinkHtml() },
  "email_change.html": { subject: AUTH_EMAIL_SUBJECTS.emailChange, html: changeEmailHtml() },
  "recovery.html": { subject: AUTH_EMAIL_SUBJECTS.recovery, html: resetPasswordHtml() },
  "reauthentication.html": { subject: AUTH_EMAIL_SUBJECTS.reauthentication, html: reauthenticationHtml() },
  "password_changed.html": { subject: AUTH_EMAIL_SUBJECTS.passwordChanged, html: passwordChangedHtml() },
  "email_changed.html": { subject: AUTH_EMAIL_SUBJECTS.emailChanged, html: emailChangedHtml() },
  "phone_changed.html": { subject: AUTH_EMAIL_SUBJECTS.phoneChanged, html: phoneChangedHtml() },
  "identity_linked.html": { subject: AUTH_EMAIL_SUBJECTS.identityLinked, html: identityLinkedHtml() },
  "identity_unlinked.html": { subject: AUTH_EMAIL_SUBJECTS.identityUnlinked, html: identityUnlinkedHtml() },
  "mfa_factor_enrolled.html": { subject: AUTH_EMAIL_SUBJECTS.mfaEnrolled, html: mfaEnrolledHtml() },
  "mfa_factor_unenrolled.html": { subject: AUTH_EMAIL_SUBJECTS.mfaUnenrolled, html: mfaUnenrolledHtml() },
};

async function main() {
  await mkdir(dir, { recursive: true });
  for (const [name, file] of Object.entries(files)) {
    const banner = `<!-- Subject: ${file.subject} -->\n`;
    await writeFile(join(dir, name), banner + file.html);
  }
  console.log(`Wrote ${Object.keys(files).length} Supabase auth templates`);
}

main();
