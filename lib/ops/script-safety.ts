/**
 * Guards for CLI scripts that mutate remote databases.
 * Does not block normal app runtime — only explicit script entrypoints.
 */

const PRODUCTION_PROJECT_REFS = new Set(["vsfhwfimudpdipdkxbww"]);

function projectRefFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  const match = url.match(/https?:\/\/([^.]+)\.supabase\.co/);
  return match?.[1] ?? null;
}

export function resolveScriptProjectRef(): string | null {
  return (
    process.env.SUPABASE_PROJECT_REF?.trim() ||
    projectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) ||
    null
  );
}

export function isProductionScriptTarget(): boolean {
  const ref = resolveScriptProjectRef();
  return ref !== null && PRODUCTION_PROJECT_REFS.has(ref);
}

/**
 * Require ALLOW_PRODUCTION_SCRIPT=1 before running a mutating script against production.
 */
export function assertProductionScriptAllowed(scriptName: string): void {
  if (!isProductionScriptTarget()) return;
  if (process.env.ALLOW_PRODUCTION_SCRIPT === "1") return;

  console.error(
    `[script-safety] Refusing to run ${scriptName} against production project ${resolveScriptProjectRef()}.`,
  );
  console.error(
    "[script-safety] Set ALLOW_PRODUCTION_SCRIPT=1 only when you intentionally target production.",
  );
  process.exit(1);
}

/**
 * Require ALLOW_DESTRUCTIVE_OPS=1 before delete/truncate-style scripts.
 */
export function assertDestructiveScriptAllowed(scriptName: string): void {
  if (process.env.ALLOW_DESTRUCTIVE_OPS === "1") return;

  console.error(
    `[script-safety] Refusing destructive script ${scriptName}. Set ALLOW_DESTRUCTIVE_OPS=1 to proceed.`,
  );
  process.exit(1);
}
