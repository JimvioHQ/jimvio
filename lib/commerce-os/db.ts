import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Untyped accessor for Commerce OS tables not yet in generated Database types.
 * Avoids "Type instantiation is excessively deep" on new jimvio_* relations.
 *
 * Important: return a concrete builder type (not bare `any`) so that:
 * - `.map` callbacks get contextual `any` element types (noImplicitAny OK)
 * - single-row `data` remains assignable where callers cast/narrow
 */
type CosError = { message: string; code?: string; details?: string } | null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CosListResult = { data: any[] | null; error: CosError; count?: number | null };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CosSingleResult = { data: any | null; error: CosError; count?: number | null };

export type CosQuery = {
  select: (...args: unknown[]) => CosQuery;
  insert: (...args: unknown[]) => CosQuery;
  update: (...args: unknown[]) => CosQuery;
  upsert: (...args: unknown[]) => CosQuery;
  delete: (...args: unknown[]) => CosQuery;
  eq: (...args: unknown[]) => CosQuery;
  neq: (...args: unknown[]) => CosQuery;
  gt: (...args: unknown[]) => CosQuery;
  gte: (...args: unknown[]) => CosQuery;
  lt: (...args: unknown[]) => CosQuery;
  lte: (...args: unknown[]) => CosQuery;
  in: (...args: unknown[]) => CosQuery;
  filter: (...args: unknown[]) => CosQuery;
  not: (...args: unknown[]) => CosQuery;
  is: (...args: unknown[]) => CosQuery;
  order: (...args: unknown[]) => CosQuery;
  limit: (...args: unknown[]) => CosQuery;
  maybeSingle: () => PromiseLike<CosSingleResult>;
  single: () => PromiseLike<CosSingleResult>;
  then: <TResult1 = CosListResult, TResult2 = never>(
    onfulfilled?:
      | ((value: CosListResult) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) => PromiseLike<TResult1 | TResult2>;
};

export function cosTable(_db: SupabaseClient, table: string): CosQuery {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (_db as any).from(table) as CosQuery;
}
