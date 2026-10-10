/** The only customer-facing Jimvio support and contact address. */
export const JIMVIO_SUPPORT_EMAIL = "info@jimvio.com";

const OBSOLETE_SUPPORT_ADDRESSES = new Set([
  "support@jimvio.com",
  "hello@jimvio.com",
  "contact@jimvio.com",
]);

export function customerSupportEmail() {
  return JIMVIO_SUPPORT_EMAIL;
}

/**
 * Recipient for support notifications.
 * Empty values and retired public aliases fold into info@jimvio.com.
 * A different configured inbox is left unchanged.
 */
export function supportNotificationRecipient(configured: string | null | undefined) {
  const value = configured?.trim().toLowerCase() ?? "";
  if (!value.includes("@") || OBSOLETE_SUPPORT_ADDRESSES.has(value)) return JIMVIO_SUPPORT_EMAIL;
  return configured!.trim();
}
