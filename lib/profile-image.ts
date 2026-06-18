export const DEFAULT_PROFILE_IMAGE = "/images/default-profile.png";

export function resolveProfileImage(url?: string | null): string {
  const trimmed = url?.trim();
  return trimmed ? trimmed : DEFAULT_PROFILE_IMAGE;
}

export function hasProfileImage(url?: string | null): boolean {
  return Boolean(url?.trim());
}
