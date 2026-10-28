type DbError = { message?: string; code?: string } | null;

/** True only when the media tables are missing. A unique violation names the table and is not this case. */
export function ingestUnavailable(error: DbError): boolean {
  if (!error) return false;
  if (error.code === "23505") return false;
  const text = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    text.includes("media_ingest") ||
    text.includes("media_sources") ||
    text.includes("media_external") ||
    text.includes("media_image_rights") ||
    text.includes("media_articles")
  );
}
