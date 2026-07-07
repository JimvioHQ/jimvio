"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { resolveSuperAppContext } from "@/lib/jimvio-super-app";
import { useSuperAppStore } from "@/lib/store/use-super-app-store";

export function SuperAppContextSync() {
  const pathname = usePathname();
  const hydrate = useSuperAppStore((s) => s.hydrate);
  const setContext = useSuperAppStore((s) => s.setContext);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (pathname) setContext(resolveSuperAppContext(pathname));
  }, [pathname, setContext]);

  return null;
}
