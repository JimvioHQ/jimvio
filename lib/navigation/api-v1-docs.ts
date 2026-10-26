/**
 * Public description of merchant /api/v1 routes.
 * Copy is limited to the method, path, and scope already declared on each route.
 * This module does not issue keys or document request bodies.
 */

export type ApiV1Doc = {
  method: "GET" | "POST";
  path: string;
  scope: string;
  summary: string;
  idempotencyKey?: boolean;
};

export const API_V1_DOCS: readonly ApiV1Doc[] = [
  {
    method: "GET",
    path: "/api/v1/products",
    scope: "products:read",
    summary: "List linked products for the API key’s merchant.",
  },
  {
    method: "GET",
    path: "/api/v1/orders",
    scope: "orders:read",
    summary: "List merchant-store orders for the API key’s merchant.",
  },
  {
    method: "POST",
    path: "/api/v1/orders",
    scope: "orders:write",
    summary: "Create or ingest an external order.",
    idempotencyKey: true,
  },
  {
    method: "GET",
    path: "/api/v1/orders/:id",
    scope: "orders:read",
    summary: "Read one order by id.",
  },
  {
    method: "GET",
    path: "/api/v1/inventory",
    scope: "inventory:read",
    summary: "Read inventory for linked variants.",
  },
  {
    method: "GET",
    path: "/api/v1/stores",
    scope: "stores:read",
    summary: "List merchant stores.",
  },
  {
    method: "GET",
    path: "/api/v1/jimvio-stores",
    scope: "stores:read",
    summary: "List native Jimvio stores.",
  },
  {
    method: "POST",
    path: "/api/v1/shipping/rates",
    scope: "shipping:read",
    summary: "Quote supplier shipping.",
  },
  {
    method: "POST",
    path: "/api/v1/fulfillments",
    scope: "fulfillment:write",
    summary: "Route an order to a supplier.",
    idempotencyKey: true,
  },
  {
    method: "GET",
    path: "/api/v1/connections",
    scope: "stores:read",
    summary: "Read store and supplier connection status. Credentials and tokens are not returned.",
  },
];
