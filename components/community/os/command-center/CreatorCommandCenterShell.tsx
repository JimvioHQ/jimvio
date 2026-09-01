"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useShallow } from "zustand/react/shallow";
import { useClientReady } from "@/lib/community/use-client-ready";
import { useCreatorOSStore } from "@/lib/community/os";
import { useCreatorCommerceStore } from "@/lib/community/commerce";
import {
  deriveAiCtas,
  deriveAiSuggestions,
  deriveBusinessSnapshots,
  deriveCommandCenterMetrics,
  deriveProductivityActions,
  type CommandCenterOverviewInput,
} from "@/lib/community/os/command-center";
import { setCommandSearchContext } from "@/lib/command-center/search-context";
import { useCommandCenterStore } from "@/lib/store/use-command-center-store";
import { CreatorCommandMetrics } from "./CreatorCommandMetrics";
import { AiActionCenter } from "./AiActionCenter";
import { BusinessSnapshots } from "./BusinessSnapshots";
import { CreatorProductivityRail } from "./CreatorProductivityRail";

/**
 * Creator Command Center shell — additive modules for Creator OS.
 * Does not replace CreatorOSDashboard sections.
 */
export function CreatorCommandCenterShell({
  base,
  communityId,
  communitySlug,
  overview,
}: {
  base: string;
  communityId: string;
  communitySlug?: string;
  overview: CommandCenterOverviewInput | null | undefined;
}) {
  const router = useRouter();
  const clientReady = useClientReady();
  const openCommandCenter = useCommandCenterStore((s) => s.openCommandCenter);

  const openTasksRaw = useCreatorOSStore(
    useShallow((s) =>
      s.tasks.filter(
        (t) => t.communityId === communityId && t.status !== "completed"
      )
    )
  );
  const storeItemsRaw = useCreatorCommerceStore(
    useShallow((s) => s.itemsForCommunity(communityId))
  );
  const affiliateRaw = useCreatorCommerceStore(
    useShallow((s) => s.affiliateStats)
  );

  const openTasks = clientReady ? openTasksRaw : [];
  const storeItems = clientReady ? storeItemsRaw : [];
  const affiliateStats = clientReady ? affiliateRaw : [];

  const metrics = useMemo(
    () =>
      deriveCommandCenterMetrics({
        base,
        overview,
        storeItems,
        affiliateStats,
        openTaskCount: openTasks.length,
      }),
    [affiliateStats, base, openTasks.length, overview, storeItems]
  );

  const snapshots = useMemo(
    () =>
      deriveBusinessSnapshots({
        base,
        overview,
        storeItems,
        affiliateStats,
      }),
    [affiliateStats, base, overview, storeItems]
  );

  const suggestions = useMemo(
    () =>
      deriveAiSuggestions({
        base,
        overview,
        storeItems,
        openTaskCount: openTasks.length,
      }),
    [base, openTasks.length, overview, storeItems]
  );

  const ctas = useMemo(() => deriveAiCtas(base), [base]);
  const productivity = useMemo(() => deriveProductivityActions(base), [base]);

  useEffect(() => {
    setCommandSearchContext({
      communityId,
      communitySlug,
      base,
    });
    return () => setCommandSearchContext({});
  }, [base, communityId, communitySlug]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || !e.shiftKey) return;
      const key = e.key.toLowerCase();
      const map: Record<string, string> = {
        p: "/marketplace/new",
        c: `${base}/courses`,
        n: "/owner/communities",
        l: `${base}/live`,
        e: `${base}/events`,
        i: `${base}/members`,
        m: "/ugc/campaign-center/campaigns/new",
        a: `${base}/feed`,
        k: "__search__",
      };
      const target = map[key];
      if (!target) return;
      e.preventDefault();
      if (target === "__search__") {
        openCommandCenter({ query: "", filter: "all" });
        return;
      }
      router.push(target);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [base, openCommandCenter, router]);

  return (
    <div className="space-y-5">
      <CreatorCommandMetrics metrics={metrics} />
      <CreatorProductivityRail actions={productivity} />
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <AiActionCenter suggestions={suggestions} ctas={ctas} />
        </div>
        <div className="lg:col-span-2">
          <BusinessSnapshots snapshots={snapshots} />
        </div>
      </div>
    </div>
  );
}
