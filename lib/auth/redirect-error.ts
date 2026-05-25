export function isNextRedirectError(err: unknown): boolean {
  if (err === null || typeof err !== "object") return false
  const d = (err as { digest?: unknown }).digest
  return typeof d === "string" && d.startsWith("NEXT_REDIRECT")
}

export function isNextNotFoundError(err: unknown): boolean {
  if (err === null || typeof err !== "object") return false
  const d = (err as { digest?: unknown }).digest
  return d === "NEXT_NOT_FOUND"
}

export function isNextNavigationError(err: unknown): boolean {
  return isNextRedirectError(err) || isNextNotFoundError(err)
}

export function rethrowIfNextRedirect(err: unknown): void {
  if (isNextRedirectError(err)) throw err
}

export function rethrowIfNextNavigation(err: unknown): void {
  if (isNextNavigationError(err)) throw err
}