/**
 * Cloudflare Turnstile gating for auth forms.
 *
 * Default: enabled whenever NEXT_PUBLIC_TURNSTILE_SITE_KEY is set.
 * Temporary demo-only disable (login UI / client gate): set AUTH_TURNSTILE_ENABLED=false
 * on the deployment environment, then remove the override and redeploy to restore.
 *
 * IMPORTANT: Supabase Auth → Bot and Abuse Protection → CAPTCHA must also be
 * disabled for the same window when the login widget is hidden. Otherwise
 * signInWithPassword without captchaToken fails and can surface as a generic
 * credentials error. Re-enable CAPTCHA in Supabase when restoring Turnstile.
 *
 * Does not delete Turnstile widgets or permanently clear CAPTCHA secrets.
 * Register / forgot-password are not gated by this flag unless callers opt in.
 */
export function isAuthTurnstileEnabled(): boolean {
  const flag = process.env.AUTH_TURNSTILE_ENABLED?.trim().toLowerCase();
  if (flag === "false" || flag === "0" || flag === "off") {
    return false;
  }
  if (flag === "true" || flag === "1" || flag === "on") {
    return true;
  }
  return Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim());
}
