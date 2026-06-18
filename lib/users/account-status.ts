export type AccountStatus = "active" | "suspended" | "banned" | "frozen" | "deleted";

export const DELETED_EMAIL_DOMAIN = "@removed.jimvio";

export function isDeletedAccountEmail(email: string | null | undefined): boolean {
  return !!email && email.includes(DELETED_EMAIL_DOMAIN);
}

export function tombstoneEmailFor(userId: string): string {
  return `deleted+${userId.slice(0, 8)}${DELETED_EMAIL_DOMAIN}`;
}

export function isAccountAccessBlocked(
  accountStatus: string | null | undefined,
  email: string | null | undefined,
  isActive?: boolean | null,
): boolean {
  if (isDeletedAccountEmail(email)) return true;
  if (isActive === false) return true;
  return accountStatus === "deleted" || accountStatus === "banned" || accountStatus === "suspended" || accountStatus === "frozen";
}
