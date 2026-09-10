# Jimvio Auth Email Templates + Google OAuth Branding

## Auth email delivery path (production)

Authentication and security emails are sent by **Supabase Auth (GoTrue)**, not Resend.

| Kind | Sender |
|------|--------|
| Confirm signup, invite, magic link, recovery, email change, reauthentication | Supabase Auth templates |
| Password / email / phone / MFA / identity notifications | Supabase Auth notification templates |
| Order, payout, welcome product mail | Resend via `lib/email/*` |

Hosted Jimvio Auth templates are **Dashboard-managed**. Pushing this repo does **not** update live Auth HTML unless you paste templates into the Dashboard (or sync via Management API).

## Repo source of truth

- HTML: `supabase/templates/*.html`
- Generators / copy: `lib/email/auth-templates/`
- Local CLI wiring: `supabase/config.toml` `[auth.email.template.*]` / `[auth.email.notification.*]`

### OWNER ACTION — Supabase Dashboard (required for LIVE emails)

1. Open Supabase project → **Authentication → Email Templates**.
2. For each template below, paste the matching file body and subject:

| Dashboard template | File | Subject |
|--------------------|------|---------|
| Confirm signup | `confirmation.html` | Confirm your Jimvio account |
| Invite user | `invite.html` | You're invited to Jimvio |
| Magic Link | `magic_link.html` | Your Jimvio sign-in link |
| Change Email Address | `email_change.html` | Confirm your new email address |
| Reset Password | `recovery.html` | Reset your Jimvio password |

3. Under **Authentication → Emails / Notifications** (wording varies by Dashboard version), enable and paste:

| Notification | File |
|--------------|------|
| Password changed | `password_changed.html` |
| Email changed | `email_changed.html` |
| Phone changed | `phone_changed.html` |
| MFA enrolled / unenrolled | `mfa_factor_enrolled.html` / `mfa_factor_unenrolled.html` |
| Identity linked / unlinked | `identity_linked.html` / `identity_unlinked.html` |
| Reauthentication | `reauthentication.html` |

4. Align Auth password policy with the app: **min 8**, require lower + upper + digit + symbol, leaked password protection ON.
5. Confirm Site URL / redirect URLs use `https://www.jimvio.com` (and auth callback).

Optional: point Auth SMTP at Resend SMTP so From-domain matches product mail. Do not put SMTP secrets in git.

---

## Google OAuth branding

Jimvio controls:

- In-app “Continue with Google” button (`components/auth/google-button.tsx`)
- OAuth redirect / `next` handling / PKCE via Supabase
- `queryParams`: `access_type=offline`, `prompt=select_account`

Google hosts the account chooser. **Do not** inject CSS into Google’s UI.

### GOOGLE-CONSOLE ACTION REQUIRED

1. Google Cloud Console → APIs & Services → **OAuth consent screen**
2. App name: **Jimvio**
3. App logo: official Jimvio mark (`public/jimvio-logo-mark.png`, square, follow Google size rules)
4. Support email + developer contact: your Jimvio ops address
5. Authorized domains: `jimvio.com`, plus Supabase project domain if required
6. Confirm redirect URI includes Supabase callback: `https://<project-ref>.supabase.co/auth/v1/callback`
7. Supabase Dashboard → Auth → Providers → Google: client ID/secret match the Console client

Until Console branding is updated, the Google account chooser may still show a generic or outdated app name/logo.
