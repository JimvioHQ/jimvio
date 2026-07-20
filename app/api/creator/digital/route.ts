import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createVersion, DIGITAL_SUBTYPES, listLibrary, listVersions } from "@/services/creator-economy/digital-products";

export const dynamic = "force-dynamic";
async function user() { const supabase = await createClient(); const { data } = await supabase.auth.getUser(); return data.user; }

export async function GET(req: NextRequest) {
  const current = await user();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const productId = req.nextUrl.searchParams.get("productId");
    return NextResponse.json(productId ? { versions: await listVersions(productId, current.id) } : { library: await listLibrary(current.id) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 400 }); }
}
export async function POST(req: NextRequest) {
  const current = await user();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if (body.action !== "create_version" || !body.productId || !body.version || !body.fileUrl) return NextResponse.json({ error: "productId, version, and fileUrl are required" }, { status: 400 });
    const version = await createVersion({ userId: current.id, productId: body.productId, version: body.version, fileUrl: body.fileUrl, fileSize: body.fileSize, checksum: body.checksum, changelog: body.changelog });
    const subtype = body.subtype;
    if (subtype && !DIGITAL_SUBTYPES.includes(subtype)) return NextResponse.json({ error: "Unsupported digital subtype" }, { status: 400 });
    return NextResponse.json({ version }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 400 }); }
}
