export function formatProfileLocation(
  city: string | null | undefined,
  country: string | null | undefined,
): string {
  return [city, country].filter((v) => v?.trim()).join(", ");
}

export function parseProfileLocationInput(location: string): {
  city: string | null;
  country: string | null;
} {
  const trimmed = location.trim();
  if (!trimmed) return { city: null, country: null };

  const comma = trimmed.indexOf(",");
  if (comma === -1) return { city: trimmed, country: null };

  return {
    city: trimmed.slice(0, comma).trim() || null,
    country: trimmed.slice(comma + 1).trim() || null,
  };
}

export const PROFILE_SELECT_FIELDS =
  "id,full_name,avatar_url,username,bio,city,country,website,updated_at" as const;
