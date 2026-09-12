/** Professional policy templates — clearly templates, not merchant-specific facts. */

export const POLICY_TEMPLATES: Record<
  string,
  { title: string; bodyHtml: (storeName: string) => string }
> = {
  terms: {
    title: "Terms of service",
    bodyHtml: (n) =>
      `<p><em>Template — customize for ${n}.</em></p><p>By placing an order on this storefront you agree to the store policies published here. Product availability, pricing, and fulfillment details are provided at checkout.</p><p>For questions, use the Contact page.</p>`,
  },
  privacy: {
    title: "Privacy policy",
    bodyHtml: (n) =>
      `<p><em>Template — customize for ${n}.</em></p><p>We use order and contact details only to fulfill purchases and provide customer support. We do not sell personal information.</p><p>Contact the store for privacy requests.</p>`,
  },
  "refund-policy": {
    title: "Refund policy",
    bodyHtml: (n) =>
      `<p><em>Template — customize for ${n}.</em></p><p>If an item arrives damaged or not as described, contact us through the Contact page. Approved refunds follow the store's review process.</p>`,
  },
  "shipping-policy": {
    title: "Shipping policy",
    bodyHtml: (n) =>
      `<p><em>Template — customize for ${n}.</em></p><p>Orders ship as quickly as possible. Delivery times vary by destination and carrier. Tracking is provided when available.</p>`,
  },
  contact: {
    title: "Contact",
    bodyHtml: (n) =>
      `<p><em>Template — customize for ${n}.</em></p><p>Questions about products or orders? Reach us using the contact details in the store footer or reply to your order confirmation email.</p>`,
  },
  about: {
    title: "About",
    bodyHtml: (n) =>
      `<p><em>Template — customize for ${n}.</em></p><p>Welcome to ${n}. We curate products and fulfill orders with care.</p>`,
  },
};
