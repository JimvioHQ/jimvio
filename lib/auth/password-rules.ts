export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 72;

/**
 * Client + server UX validation aligned with production Supabase Auth policy:
 * min 12, lowercase + uppercase + digits + symbols.
 * Supabase Auth remains authoritative; never weaken below provider policy.
 */
export function validateNewPassword(
  password: string,
  email?: string | null,
): string | null {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`;
  }
  if (!/[a-z]/.test(password)) {
    return "Password must include a lowercase letter.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must include an uppercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must include a number.";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must include a symbol.";
  }
  const local = email?.split("@")[0]?.trim().toLowerCase() ?? "";
  if (local.length >= 3 && password.toLowerCase().includes(local)) {
    return "Password should not contain your email.";
  }
  return null;
}

export const PASSWORD_REQUIREMENTS_HINT =
  "At least 12 characters with uppercase, lowercase, a number, and a symbol.";
