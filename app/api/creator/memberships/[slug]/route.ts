import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  cancelSubscription,
  changePlan,
  ensureDefaultTiers,
  getBillingHistory,
  listMembersForOwner,
  listMembershipTiers,
  startTrial,
  upsertMembershipTiers,
  type PlanType,
} from "@/services/creator-economy/memberships";

export const dynamic = "force-dynamic";

async function resolveCommunity(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("communities")
    .select("id, owner_id, slug, name")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return data;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const community = await resolveCommunity(slug);
  if (!community) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const view = req.nextUrl.searchParams.get("view") || "tiers";

  try {
    if (view === "tiers") {
      let tiers = await listMembershipTiers(community.id);
      if (tiers.length === 0 && user?.id === community.owner_id) {
        tiers = await ensureDefaultTiers(community.id, user.id);
      }
      return NextResponse.json({ tiers, community });
    }

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (view === "members") {
      if (user.id !== community.owner_id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const members = await listMembersForOwner(community.id, user.id);
      return NextResponse.json({ members });
    }

    if (view === "billing") {
      const asOwner = req.nextUrl.searchParams.get("as") === "owner";
      const history = await getBillingHistory({
        userId: user.id,
        communityId: community.id,
        asOwner: asOwner && user.id === community.owner_id,
      });
      return NextResponse.json({ history });
    }

    return NextResponse.json({ error: "Unknown view" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const community = await resolveCommunity(slug);
  if (!community) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    action?: string;
    tiers?: unknown;
    planType?: PlanType;
    tierId?: string;
    immediate?: boolean;
  };

  try {
    switch (body.action) {
      case "ensure_tiers": {
        if (user.id !== community.owner_id) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const tiers = await ensureDefaultTiers(community.id, user.id);
        return NextResponse.json({ tiers });
      }
      case "upsert_tiers": {
        if (user.id !== community.owner_id) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        if (!Array.isArray(body.tiers)) {
          return NextResponse.json({ error: "tiers required" }, { status: 400 });
        }
        const tiers = await upsertMembershipTiers(
          community.id,
          user.id,
          body.tiers as Parameters<typeof upsertMembershipTiers>[2]
        );
        return NextResponse.json({ tiers });
      }
      case "start_trial": {
        const membership = await startTrial({
          userId: user.id,
          communityId: community.id,
          tierId: body.tierId ?? null,
        });
        return NextResponse.json({ membership });
      }
      case "change_plan": {
        if (!body.planType) {
          return NextResponse.json({ error: "planType required" }, { status: 400 });
        }
        const membership = await changePlan({
          userId: user.id,
          communityId: community.id,
          toPlan: body.planType,
          toTierId: body.tierId ?? null,
        });
        return NextResponse.json({ membership });
      }
      case "cancel": {
        const membership = await cancelSubscription({
          userId: user.id,
          communityId: community.id,
          immediate: Boolean(body.immediate),
        });
        return NextResponse.json({ membership });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 }
    );
  }
}
