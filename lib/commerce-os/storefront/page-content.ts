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
  address?: string | null;
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
  const address = contact?.address?.trim() || "";

  switch (handle) {
    case "about":
      return `<h2>About ${name}</h2><p>${name} selects products for this storefront and presents them with the price and availability shown on each product page.</p><p>The store owner can replace this introduction with the story, selection, and customer commitment they want customers to read.</p><p>This starting text does not describe a specific history, location, award, or reputation.</p>`;
    case "contact": {
      const lines = [
        `<h2>Contact ${name}</h2>`,
        `<p>Questions about a product or an order can be sent to ${name}.</p>`,
      ];
      if (email) {
        lines.push(
          `<p>Email: <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>`,
        );
      }
      if (phone) {
        lines.push(`<p>Phone: ${escapeHtml(phone)}</p>`);
      }
      if (address) {
        lines.push(`<p>Address: ${escapeHtml(address)}</p>`);
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
      return `<h2>Shipping</h2><p>Shipping from ${name} depends on the destination, the items ordered, and the carrier used for that order.</p><h2>Order processing</h2><p>Replace this section with how ${name} prepares orders. Do not promise a processing time until it is true for this store.</p><h2>Delivery estimates</h2><p>Delivery times are not guaranteed on this page. Estimates belong here only after the store configures them.</p><h2>Shipping charges</h2><p>The amount charged is the rate shown at checkout for the customer's destination. This page does not promise free shipping or worldwide coverage.</p><h2>Tracking</h2><p>When a tracking number exists, it appears on the order in the customer account. Until then, tracking is not available.</p><h2>Delays and support</h2><p>If a shipment is delayed, contact ${name} with the order number. Applicable law and the store's own terms control what happens next.</p>`;
    case "refund-policy":
      return `<h2>Refunds</h2><p>Refunds and returns for ${name} depend on the store's review of the order and on applicable law. Complete the sections below before publishing a commitment.</p><h2>Eligibility</h2><p>Merchant to complete: who may request a return, and which orders qualify.</p><h2>Return requests</h2><p>If an item arrives damaged or is not what you ordered, contact the store with your order number.</p><h2>Product condition</h2><p>Merchant to complete: the condition required for a return.</p><h2>Refund processing</h2><p>The store decides eligibility. This page does not promise an instant, automatic, or unconditional refund, a return window, or free return shipping.</p><h2>Exclusions</h2><p>Merchant to complete: items that cannot be returned.</p><h2>Customer support</h2><p>Use the contact details published by ${name}. Cancellation of an unpaid order follows the status shown on that order.</p>`;
    case "privacy":
      return `<h2>Privacy</h2><p>${name} uses the details customers submit to fulfill purchases and answer customer requests. This page is a starting template. It is not a claim of legal compliance.</p><h2>Information collected</h2><p>Account details, order details, and the contact information submitted at checkout.</p><h2>Use of information</h2><p>To process orders, provide support, and operate this storefront.</p><h2>Sharing</h2><p>Payment providers, shipping carriers, and suppliers involved in fulfilling an order may receive the details needed for that purpose.</p><h2>Retention</h2><p>Merchant to complete: how long order and contact records are kept. This page does not claim a specific retention period.</p><h2>Security</h2><p>Access to store data is limited to the people and services needed to operate the store. This page does not claim a certification.</p><h2>Customer choices</h2><p>Customers can contact the store about the details it holds for their orders.</p><h2>Contact</h2><p>Use the contact details ${name} has published.</p>`;
    case "terms":
      return `<h2>Terms</h2><p>Placing an order with ${name} means the customer accepts the policies published on this storefront and the price, availability, and shipping details shown at checkout. This template is a starting point for the store to edit. It is not legal advice and does not guarantee compliance.</p><h2>Orders</h2><p>An order is placed when checkout creates it. Payment is confirmed only after the payment provider confirms it.</p><h2>Pricing</h2><p>The price charged is the price shown at checkout.</p><h2>Product availability</h2><p>An item can become unavailable after it is added to the cart. Checkout validates availability again.</p><h2>Acceptable use</h2><p>Customers may not use the storefront to place fraudulent orders or interfere with the service.</p><h2>Liability</h2><p>Merchant to complete: the limits the store wants to state. This page does not add delivery guarantees or refund promises.</p><h2>Contact</h2><p>Use the contact details published by ${name}.</p>`;
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
      return "Terms and Conditions";
    default:
      return handle;
  }
}

export const DEFAULT_STORE_PAGE_HANDLES: StorePageHandle[] = [
  "about",
  "contact",
  "privacy",
  "refund-policy",
  "shipping-policy",
  "terms",
];

export function missingDefaultStorePageHandles(existingHandles: string[]): StorePageHandle[] {
  const have = new Set(existingHandles);
  return DEFAULT_STORE_PAGE_HANDLES.filter((handle) => !have.has(handle));
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
