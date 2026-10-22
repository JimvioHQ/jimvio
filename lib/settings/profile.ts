export const PROFILE_BIO_LIMIT = 500;
export const PROFILE_USERNAME_MIN = 3;
export const PROFILE_USERNAME_MAX = 24;
export const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;

export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function joinFullName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

export function resolveDisplayName(input: {
  displayName: string;
  firstName: string;
  lastName: string;
}): string {
  const display = input.displayName.trim();
  if (display) return display;
  return joinFullName(input.firstName, input.lastName);
}

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase().replace(/^@+/, "");
}

export function validateUsername(value: string): string | null {
  const username = normalizeUsername(value);
  if (!username) return "Enter a username.";
  if (username.length < PROFILE_USERNAME_MIN) {
    return `Username must be at least ${PROFILE_USERNAME_MIN} characters.`;
  }
  if (username.length > PROFILE_USERNAME_MAX) {
    return `Username must be ${PROFILE_USERNAME_MAX} characters or fewer.`;
  }
  if (!USERNAME_PATTERN.test(username)) {
    return "Use lowercase letters, numbers, and underscores only.";
  }
  return null;
}

export function isValidHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateOptionalHttpUrl(value: string, label: string): string | null {
  if (!value.trim()) return null;
  return isValidHttpUrl(value) ? null : `Enter a valid ${label} URL starting with https://.`;
}

export function publicProfilePath(username: string | null | undefined): string | null {
  const normalized = username ? normalizeUsername(username) : "";
  return normalized ? `/u/${normalized}` : null;
}

export function publicProfileUrl(origin: string, username: string | null | undefined): string {
  const path = publicProfilePath(username);
  const host = origin.replace(/\/$/, "");
  return path ? `${host}${path}` : `${host}/u/`;
}

export function bioLimitForValue(value: string, preferred = PROFILE_BIO_LIMIT): number {
  return Math.max(preferred, value.length);
}
