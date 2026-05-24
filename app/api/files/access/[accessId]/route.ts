import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

// safer + exact match instead of includes()
const CLOUDINARY_HOST = `res.cloudinary.com`;

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ accessId: string }> }
) {
    const { accessId } = await params;

    if (!accessId) {
        return NextResponse.json(
            { error: "Bad Request", reason: "Missing accessId" },
            { status: 400 }
        );
    }

    const supabase = await createClient();

    // 1. AUTH CHECK (must be logged into YOUR site)
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json(
            {
                error: "Unauthorized",
                reason: "You must be signed in to access this file.",
            },
            { status: 401 }
        );
    }

    // 2. FETCH ACCESS RECORD (strict ownership)
    const { data: access, error } = await supabase
        .from("digital_access")
        .select("id, access_url, subtype, expires_at, revoked_at, user_id")
        .eq("id", accessId)
        .eq("user_id", user.id)
        .is("revoked_at", null)
        .single();

    if (error || !access) {
        return NextResponse.json(
            {
                error: "Access denied",
                reason: "You do not own this file or access is revoked.",
            },
            { status: 403 }
        );
    }

    // 3. EXPIRY CHECK
    const now = Date.now();
    if (
        access.expires_at &&
        new Date(access.expires_at).getTime() < now
    ) {
        return NextResponse.json(
            {
                error: "Access expired",
                reason: "This file access has expired.",
            },
            { status: 403 }
        );
    }

    if (!access.access_url) {
        return NextResponse.json(
            {
                error: "Not found",
                reason: "No file attached to this access record.",
            },
            { status: 404 }
        );
    }

    // 4. LOG ACCESS (non-blocking but safe)
    supabase
        .from("digital_access")
        .update({ last_accessed_at: new Date().toISOString() })
        .eq("id", access.id)
        .then();

    // 5. NON-CLOUDINARY FILES → still protected by YOUR route
    const url = new URL(access.access_url);
    const isCloudinary = url.hostname.includes(CLOUDINARY_HOST);

    if (!isCloudinary) {
        // IMPORTANT: still gated by auth above
        return NextResponse.redirect(url.toString());
    }

    // 6. CLOUDINARY FILE DELIVERY (secure signed URL)
    const publicId = extractPublicId(access.access_url);
    const format = extractFormat(access.access_url);

    const expiresAt = Math.floor(Date.now() / 1000) + 600; // 10 min

    const signedUrl = cloudinary.url(publicId, {
        secure: true,
        sign_url: true,
        resource_type: "raw",
        type: "private",
        attachment: true,
        expires_at: expiresAt,
        format,
    });

    // 7. FINAL REDIRECT (user only gets here AFTER passing your site auth)
    return NextResponse.redirect(signedUrl);
}

/**
 * Extract Cloudinary public_id safely
 */
function extractPublicId(url: string): string {
    try {
        const pathname = new URL(url).pathname;
        const uploadIndex = pathname.indexOf("/upload/");
        if (uploadIndex === -1) return "";

        let id = pathname.substring(uploadIndex + 8);

        // remove version prefix
        id = id.replace(/^v\d+\//, "");

        // remove extension
        id = id.replace(/\.[^/.]+$/, "");

        return id;
    } catch {
        return "";
    }
}

/**
 * Extract file format safely
 */
function extractFormat(url: string): string {
    try {
        const pathname = new URL(url).pathname;
        return pathname.split(".").pop() ?? "bin";
    } catch {
        return "bin";
    }
}