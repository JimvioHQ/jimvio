"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { OS_NAV_ITEMS } from "@/lib/jimvio-os";
import { pushOsRecent } from "@/lib/jimvio-os/recents";
import { useJimvioOsStore } from "@/lib/store/use-jimvio-os-store";

/** Track recent pages for OS sidebar — client only, no API calls. */
export function OsContextSync() {
  const pathname = usePathname();
  const hydrate = useJimvioOsStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!pathname) return;
    const match = OS_NAV_ITEMS.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    );
    pushOsRecent({
      id: pathname,
      label: match?.label ?? pathname.split("/").filter(Boolean).pop() ?? "Page",
      href: pathname,
    });
  }, [pathname]);

  return null;
}
