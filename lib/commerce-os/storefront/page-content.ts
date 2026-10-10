/** Professional storefront page defaults.
 * Saved merchant copy always wins. Known seed placeholders render the default
 * without rewriting the stored page.
 */

export type StorePageHandle =
  | "about"
  | "contact"
  | "shipping-policy"
  | "refund-policy"
  | "privacy"
  | "terms";

export type StorePageContact = {
  email?: string | null;
  phone?: string | null;
};

const POLICY_HANDLES = new Set<string>([
  "about",
  "contact",
  "shipping-policy",
  "refund-policy",
  "privacy",
  "terms",
]);

export function isStorePolicyHandle(handle: string): handle is StorePageHandle {
  return POLICY_HANDLES.has(handle);
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when the stored HTML is empty or one of the original seed placeholders. */
export function isPlaceholderStorePageHtml(html: string | null | undefined): boolean {
  const text = stripHtml(html || "");
  if (!text) return true;
  if (/coming soon/i.test(text)) return true;
  if (/^contact us for support\.?$/i.test(text)) return true;
  if (/^welcome to [^.]+\.?$/i.test(text)) return true;
  return false;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function defaultStorePageHtml(
  handle: StorePageHandle,
  storeName: string,
  contact?: StorePageContact,
): string {
  const name = escapeHtml(storeName.trim() || "this store");
  const email = contact?.email?.trim() || "";
  const phone = contact?.phone?.trim() || "";

  switch (handle) {
    case "about":
      return `<p>Welcome to ${name}.</p><p>${name} offers products through this storefront. Each product page shows the item, the price, and whether it can be purchased.</p><p>This introduction does not describe a specific history, location, award, or reputation. The store owner can replace it with their own story.</p>`;
    case "contact": {
      const lines = [`<p>Questions about a product or an order can be sent to ${name}.</p>`];
      if (email) {
        lines.push(
          `<p>Email: <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>`,
        );
      }
      if (phone) {
        lines.push(`<p>Phone: ${escapeHtml(phone)}</p>`);
      }
      if (!email && !phone) {
        lines.push(
          "<p>A public email address and phone number have not been added yet.</p>",
        );
      }
      lines.push(
        "<p>This page does not promise a reply time. Use your order number when you write about a purchase.</p>",
      );
      return lines.join("");
    }
    case "shipping-policy":
      return `<p>Shipping from ${name} depends on the destination, the items ordered, and the carrier the store uses.</p><p>Delivery times are not guaranteed on this page. When the store adds a tracking number, it appears on the order in your account.</p><p>Applicable law and the store's own shipping terms control what happens if a shipment is delayed.</p>`;
    case "refund-policy":
      return `<p>Refunds and returns for ${name} depend on the store's review of the order and on applicable law.</p><p>If an item arrives damaged or is not what you ordered, contact the store with your order number. The store decides eligibility. This page does not promise an instant, automatic, or unconditional refund.</p><p>Cancellation of an unpaid order follows the status shown on that order.</p>`;
    case "privacy":
      return `<p>${name} uses the contact and order details you submit to fulfill purchases and answer customer requests.</p><p>This page does not claim a certification or a specific retention period. For a privacy request, use the contact details the store has published.</p>`;
    case "terms":
      return `<p>Placing an order with ${name} means you accept the policies published on this storefront and the price, availability, and shipping details shown at checkout.</p><p>Those details can change when the store updates a product or a policy. This page does not add delivery guarantees, refund promises, or other benefits beyond the store's published policies and applicable law.</p>`;
    default:
      return `<p>${name}</p>`;
  }
}

export function defaultStorePageTitle(handle: StorePageHandle): string {
  switch (handle) {
    case "about":
      return "About";
    case "contact":
      return "Contact";
    case "shipping-policy":
      return "Shipping policy";
    case "refund-policy":
      return "Refund policy";
    case "privacy":
      return "Privacy policy";
    case "terms":
      return "Terms of service";
    default:
      return handle;
  }
}

export function resolveStorePageHtml(input: {
  handle: string;
  storeName: string;
  savedHtml?: string | null;
  contact?: StorePageContact;
}): { html: string; usingDefault: boolean } {
  const saved = input.savedHtml?.trim() || "";
  if (saved && !isPlaceholderStorePageHtml(saved)) {
    return { html: saved, usingDefault: false };
  }
  if (!isStorePolicyHandle(input.handle)) {
    return {
      html: saved || "<p>This page has no published content yet.</p>",
      usingDefault: !saved,
    };
  }
  return {
    html: defaultStorePageHtml(input.handle, input.storeName, input.contact),
    usingDefault: true,
  };
}
