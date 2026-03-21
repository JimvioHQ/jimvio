import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cloudinaryService, type CloudinaryFolder } from "@/services/media/cloudinary";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { folder } = await req.json() as { folder: CloudinaryFolder };

    const validFolders: CloudinaryFolder[] = [
      "jimvio/products",
      "jimvio/avatars",
      "jimvio/banners",
      "jimvio/clips",
      "jimvio/community",
      "jimvio/campaigns",
    ];

    if (!validFolders.includes(folder)) {
      return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
    }

    const signature = await cloudinaryService.generateUploadSignature(folder);
    return NextResponse.json({ success: true, data: signature });
  } catch {
    return NextResponse.json({ error: "Failed to generate signature" }, { status: 500 });
  }
}
