import type { PreviewDevice } from "@/lib/commerce-os/builder/preview-viewport";
import {
  previewShowDesktopNav,
  previewShowMobileNav,
} from "@/lib/commerce-os/builder/preview-viewport";

/** Production uses CSS breakpoints; builder preview forces an explicit device. */
export function storefrontDesktopNavClass(previewDevice?: PreviewDevice): string {
  if (!previewDevice) return "hidden lg:flex";
  return previewShowDesktopNav(previewDevice) ? "flex" : "hidden";
}

export function storefrontMobileNavClass(
  previewDevice?: PreviewDevice,
  style: "bottom" | "drawer" | "hidden" = "bottom"
): string {
  if (style === "hidden" || style === "drawer") return "hidden";
  if (!previewDevice) return "fixed inset-x-0 bottom-0 z-40 lg:hidden";
  return previewShowMobileNav(previewDevice) ? "sticky bottom-0 z-40" : "hidden";
}

export function storefrontDesktopSearchClass(previewDevice?: PreviewDevice): string {
  if (!previewDevice) return "hidden min-w-0 max-w-md flex-1 lg:flex";
  return previewShowDesktopNav(previewDevice)
    ? "flex min-w-0 max-w-md flex-1"
    : "hidden";
}

export function storefrontMobileSearchIconClass(previewDevice?: PreviewDevice): string {
  const base =
    "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--store-border,rgba(0,0,0,0.08))] text-sm text-[var(--store-text)]";
  if (!previewDevice) return `${base} lg:hidden`;
  return previewShowDesktopNav(previewDevice) ? "hidden" : base;
}

/** Hamburger is for drawer/hidden mobile chrome — bottom nav already covers Home/Categories/Search/Account. */
export function storefrontShowHeaderMenu(
  previewDevice?: PreviewDevice,
  mobileNavStyle: "bottom" | "drawer" | "hidden" = "bottom"
): boolean {
  if (mobileNavStyle === "bottom") return false;
  if (!previewDevice) return true;
  return !previewShowDesktopNav(previewDevice);
}

export function storefrontHeaderMenuButtonClass(previewDevice?: PreviewDevice): string {
  const base =
    "grid h-10 w-10 place-items-center rounded-full border border-[var(--store-border,rgba(0,0,0,0.08))] text-[var(--store-text,#111827)]";
  if (!previewDevice) return `${base} lg:hidden`;
  return base;
}
