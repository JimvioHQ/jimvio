const SUPPORT_PREFIX = "/help";

/** Launcher is limited to the public Support Center. Cart and checkout stay excluded. */
export function showSupportLauncher(pathname: string) {
  if (pathname === "/checkout" || pathname.startsWith("/checkout/")) return false;
  if (pathname === "/cart" || pathname.startsWith("/cart/")) return false;
  return pathname === SUPPORT_PREFIX || pathname.startsWith(`${SUPPORT_PREFIX}/`);
}
