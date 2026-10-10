import { NextRequest, NextResponse } from "next/server";
import { parseAiActionBody } from "@/lib/ai/actions";
import { createOwnedCommunity } from "@/lib/community/create-owned-community";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const parsed = parseAiActionBody(await req.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const result = await createOwnedCommunity({
    name: parsed.name,
    description: parsed.description,
    visibility: "public",
    is_private: false,
    is_free: true,
    currency: "USD",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { id, slug, name } = result.community;
  if (!id || !slug) {
    return NextResponse.json({ error: "Could not create community." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    operation: "create_community",
    community: { id, slug, name },
    href: `/communities/${slug}`,
    manageHref: `/owner/communities/${slug}`,
  });
}
