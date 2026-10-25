/**
 * Supabase query builders are PromiseLike: they have `then` and do not have `catch`.
 * Calling `.catch()` on the builder throws before the query runs.
 */

export type QueryResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

export async function awaitQueryResult<T>(
  query: PromiseLike<QueryResult<T>>,
): Promise<QueryResult<T>> {
  try {
    const result = await query;
    if (!result || typeof result !== "object") {
      return { data: null, error: { message: "unavailable" } };
    }
    return {
      data: result.data ?? null,
      error: result.error ?? null,
    };
  } catch {
    return { data: null, error: { message: "unavailable" } };
  }
}
