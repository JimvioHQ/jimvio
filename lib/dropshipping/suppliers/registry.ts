import type { SupabaseClient } from "@supabase/supabase-js";
import { CjSupplierConnector } from "./cj-connector";
import type { SupplierCode, SupplierConnector } from "./types";

const registry = new Map<SupplierCode, (db: SupabaseClient) => SupplierConnector>();

registry.set("cj", (db) => new CjSupplierConnector(db));

export function registerSupplier(
  code: SupplierCode,
  factory: (db: SupabaseClient) => SupplierConnector
): void {
  registry.set(code, factory);
}

export function getSupplierConnector(
  code: SupplierCode,
  db: SupabaseClient
): SupplierConnector {
  const factory = registry.get(code);
  if (!factory) {
    throw new Error(
      `Supplier "${code}" is not configured. Add a connector implementation before enabling it.`
    );
  }
  return factory(db);
}

export function listRegisteredSuppliers(): SupplierCode[] {
  return [...registry.keys()];
}

export type { SupplierConnector, SupplierCode };
