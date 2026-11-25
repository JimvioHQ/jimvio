import type { StoreConnector } from "./types";
import { getShopifyApiVersionFromEnv } from "@/lib/platform-shopify";

const DS_WEBHOOK_TOPICS = [
  "orders/create",
  "orders/updated",
  "orders/paid",
  "orders/cancelled",
  "products/create",
  "products/update",
  "products/delete",
  "app/uninstalled",
] as const;

function resolveShopifyAppBaseUrl(): string | null {
  const candidates = [
    process.env.SHOPIFY_APP_URL?.trim(),
    process.env.SHOPIFY_OAUTH_REDIRECT_URI?.trim()?.replace(
      /\/api\/dropshipping\/shopify\/oauth\/callback\/?$/,
      ""
    ),
    process.env.NEXT_PUBLIC_SITE_URL?.trim(),
    process.env.NEXT_PUBLIC_APP_URL?.trim(),
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim()}`
      : "",
  ].filter(Boolean) as string[];

  for (const c of candidates) {
    try {
      const u = new URL(c.startsWith("http") ? c : `https://${c}`);
      if (u.protocol === "http:" || u.protocol === "https:") {
        return u.origin;
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

export function getDropshippingShopifyWebhookAddress(): string | null {
  const base = resolveShopifyAppBaseUrl();
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/api/webhooks/dropshipping/shopify`;
}

type ShopifyWebhookRow = {
  id: number;
  address: string;
  topic: string;
};

/**
 * Idempotently register Dropshipping OS Shopify webhooks for a connected store.
 * Does not register duplicates when the same address+topic already exists.
 */
export async function ensureShopifyWebhooksRegistered(params: {
  shopDomain: string;
  accessToken: string;
  apiVersion?: string;
}): Promise<{
  ok: boolean;
  registered: string[];
  skipped: string[];
  error?: string;
  address?: string;
}> {
  const address = getDropshippingShopifyWebhookAddress();
  if (!address) {
    return {
      ok: false,
      registered: [],
      skipped: [],
      error:
        "Webhook registration skipped: set SHOPIFY_APP_URL or NEXT_PUBLIC_SITE_URL for a public HTTPS callback.",
    };
  }
  if (address.includes("localhost") || address.includes("127.0.0.1")) {
    return {
      ok: false,
      registered: [],
      skipped: [],
      error:
        "Webhook registration skipped: localhost callbacks are not valid for Shopify production webhooks.",
      address,
    };
  }

  const domain = params.shopDomain.replace(/^https?:\/\//, "").split("/")[0];
  const apiVersion = params.apiVersion || getShopifyApiVersionFromEnv();
  const base = `https://${domain}/admin/api/${apiVersion}`;

  const listRes = await fetch(`${base}/webhooks.json`, {
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": params.accessToken,
      Accept: "application/json",
    },
  });

  if (!listRes.ok) {
    return {
      ok: false,
      registered: [],
      skipped: [],
      error: `Could not list Shopify webhooks (${listRes.status}).`,
      address,
    };
  }

  const listJson = (await listRes.json()) as { webhooks?: ShopifyWebhookRow[] };
  const existing = listJson.webhooks ?? [];
  const registered: string[] = [];
  const skipped: string[] = [];

  for (const topic of DS_WEBHOOK_TOPICS) {
    const already = existing.some(
      (w) => w.topic === topic && w.address.replace(/\/$/, "") === address.replace(/\/$/, "")
    );
    if (already) {
      skipped.push(topic);
      continue;
    }

    const createRes = await fetch(`${base}/webhooks.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": params.accessToken,
        Accept: "application/json",
      },
      body: JSON.stringify({
        webhook: {
          topic,
          address,
          format: "json",
        },
      }),
    });

    if (createRes.ok) {
      registered.push(topic);
    } else {
      // Do not fail the whole connect — merchant can register manually
      skipped.push(topic);
    }
  }

  return { ok: true, registered, skipped, address };
}

/** Optional helper when a connector instance is already loaded. */
export async function ensureWebhooksForConnector(
  connector: StoreConnector & {
    // Shopify connector has private cfg — use testConnection + domain from store instead
  },
  _unused?: never
): Promise<void> {
  void connector;
  void _unused;
}
