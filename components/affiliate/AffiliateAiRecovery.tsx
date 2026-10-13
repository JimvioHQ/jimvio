"use client";

import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { AFFILIATE_BTN_PRIMARY, AFFILIATE_BTN_SECONDARY } from "./sections/shared";
import {
  AFFILIATE_PROMOTION_ASSETS,
  affiliateWorkspaceRecoveryCopy,
  beginAffiliateWorkspaceHandoff,
  browserSessionStorage,
  writeAffiliateHandoff,
} from "@/lib/ai/affiliate-workspace";
import { saveCopilotReturnPath } from "@/lib/ai/copilot/session";
import { cn } from "@/lib/utils";

export function AffiliateAiRecovery({
  message,
  productId,
  returnPath,
  pending = false,
  onRetry,
}: {
  message: string;
  productId: string;
  returnPath: string;
  pending?: boolean;
  onRetry?: () => void;
}) {
  const router = useRouter();
  const copy = affiliateWorkspaceRecoveryCopy(message);

  const continueInWorkspace = () => {
    const storage = browserSessionStorage();
    const handoff = beginAffiliateWorkspaceHandoff({
      succeeded: false,
      productId,
      assetTypes: [...AFFILIATE_PROMOTION_ASSETS],
      platform: null,
      returnPath,
      now: Date.now(),
      id: `aff-${productId}-${Date.now()}`,
    });
    if (!handoff || !storage) return;
    writeAffiliateHandoff(handoff, storage);
    saveCopilotReturnPath(returnPath);
    router.push("/ai");
  };

  return (
    <div className="mt-3 rounded-[12px] border border-[#F3D2C4] bg-[#FFF8F5] px-3 py-3" role="status">
      <p className="text-[13px] font-bold text-[#111827]">{copy.title}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-[#6B7280]">{copy.detail}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={continueInWorkspace}
          className={cn(AFFILIATE_BTN_PRIMARY, "h-9 px-3 text-[12px]")}
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          {copy.action}
        </button>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            disabled={pending}
            className={cn(AFFILIATE_BTN_SECONDARY, "h-9 px-3 text-[12px] disabled:opacity-60")}
          >
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}
