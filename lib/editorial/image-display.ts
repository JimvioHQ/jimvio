/** The owned desk mark is not a photograph of a story. */
export function isEditorialMarkUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  return /(?:^|\/)editorial\/desk-mark\.png(?:[?#].*)?$/i.test(value.trim());
}

/** A public photo URL, or null when the only asset is the desk mark. */
export function editorialPhotoSrc(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || isEditorialMarkUrl(trimmed)) return null;
  return trimmed;
}
