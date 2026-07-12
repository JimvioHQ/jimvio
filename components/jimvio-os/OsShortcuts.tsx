"use client";

import { useEffect } from "react";
import { useJimvioOsStore } from "@/lib/store/use-jimvio-os-store";

/** Toggle Jimvio OS with Ctrl+. / Cmd+. — does not conflict with ⌘K command center. */
export function OsShortcuts() {
  const toggleOs = useJimvioOsStore((s) => s.toggleOs);
  const closeOs = useJimvioOsStore((s) => s.closeOs);
  const isOpen = useJimvioOsStore((s) => s.isOpen);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ".") {
        e.preventDefault();
        toggleOs();
        return;
      }
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        closeOs();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [toggleOs, closeOs, isOpen]);

  return null;
}
