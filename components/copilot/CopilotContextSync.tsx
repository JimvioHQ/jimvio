"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { resolveCopilotContext } from "@/lib/ai/copilot/context";
import { useAIStore } from "@/lib/store/use-ai-store";

/** Keeps copilot page context in sync with the current route. */
export function CopilotContextSync() {
  const pathname = usePathname() ?? "/";
  const setPageContext = useAIStore((s) => s.setPageContext);

  useEffect(() => {
    setPageContext(resolveCopilotContext(pathname), pathname);
  }, [pathname, setPageContext]);

  return null;
}
