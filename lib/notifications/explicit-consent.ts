/**
 * Marketing reengagement is opt-in.
 * A database default, a missing row, and a stored true without
 * email_reengagement_explicit_at are not consent.
 */

export type ReengagementWrite = {
  email_reengagement: boolean;
  email_reengagement_explicit_at: string | null;
};

export function explicitReengagementGranted(row: {
  email_reengagement?: boolean | null;
  email_reengagement_explicit_at?: string | null;
} | null | undefined): boolean {
  if (!row) return false;
  if (typeof row.email_reengagement_explicit_at !== "string" || row.email_reengagement_explicit_at.trim() === "") {
    return false;
  }
  return row.email_reengagement === true;
}

/**
 * A patch boolean is an explicit save and records the timestamp.
 * An omitted patch keeps the stored boolean and its existing timestamp.
 * It does not invent a timestamp for a default true. A new row with no
 * patch is false and unstamped.
 */
export function explicitReengagementWrite(input: {
  storedValue: boolean | null | undefined;
  storedExplicitAt: string | null | undefined;
  patch: boolean | undefined;
  now: Date;
}): ReengagementWrite {
  if (typeof input.patch === "boolean") {
    return {
      email_reengagement: input.patch,
      email_reengagement_explicit_at: input.now.toISOString(),
    };
  }
  if (typeof input.storedValue === "boolean") {
    const stamped = typeof input.storedExplicitAt === "string" && input.storedExplicitAt.trim() !== ""
      ? input.storedExplicitAt
      : null;
    return {
      email_reengagement: input.storedValue,
      email_reengagement_explicit_at: stamped,
    };
  }
  return { email_reengagement: false, email_reengagement_explicit_at: null };
}

/** @deprecated Use explicitReengagementWrite so a default true cannot gain a timestamp. */
export function explicitReengagementChoice(
  stored: boolean | null | undefined,
  patch: boolean | undefined,
): boolean {
  return explicitReengagementWrite({
    storedValue: stored,
    storedExplicitAt: null,
    patch,
    now: new Date(),
  }).email_reengagement;
}
