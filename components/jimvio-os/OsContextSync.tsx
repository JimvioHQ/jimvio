"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { OS_NAV_ITEMS } from "@/lib/jimvio-os";
import { pushOsRecent } from "@/lib/jimvio-os/recents";
import { pushLastPage } from "@/lib/jimvio-os/workspace-memory";
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
    const label = match?.label ?? pathname.split("/").filter(Boolean).pop() ?? "Page";
    pushOsRecent({ id: pathname, label, href: pathname });
    pushLastPage({ href: pathname, label });
  }, [pathname]);

  return null;
}
