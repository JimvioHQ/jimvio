const SUPPORT_PREFIX = "/help";

function normalizePath(pathname: string) {
  const path = pathname.split("?")[0]?.split("#")[0] ?? "";
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path || "/";
}

/** Launcher is limited to the public Support Center. Cart and checkout stay excluded. */
export function showSupportLauncher(pathname: string) {
  const path = normalizePath(pathname);
  if (path === "/checkout" || path.startsWith("/checkout/")) return false;
  if (path === "/cart" || path.startsWith("/cart/")) return false;
  return path === SUPPORT_PREFIX || path.startsWith(`${SUPPORT_PREFIX}/`);
}
