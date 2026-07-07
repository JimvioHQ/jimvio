"use client";

import { useEffect } from "react";
import { useCommandCenterStore } from "@/lib/store/use-command-center-store";

/** Global ⌘K / Ctrl+K — capture phase so one palette opens platform-wide. */
export function CommandCenterShortcuts() {
  const toggleCommandCenter = useCommandCenterStore((s) => s.toggleCommandCenter);
  const closeCommandCenter = useCommandCenterStore((s) => s.closeCommandCenter);
  const isOpen = useCommandCenterStore((s) => s.isOpen);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && key === "k") {
        e.preventDefault();
        e.stopPropagation();
        toggleCommandCenter();
        return;
      }
      if (key === "escape" && isOpen) {
        e.preventDefault();
        closeCommandCenter();
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [toggleCommandCenter, closeCommandCenter, isOpen]);

  return null;
}
