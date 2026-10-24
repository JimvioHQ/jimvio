import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { mayServeExistingDownload } from "@/lib/digital-products/trust/policy";
import { getDeliveryGate } from "@/lib/digital-products/trust/service";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOrderPaymentComplete } from "@/lib/payments/order-payment-utils";

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
    
    const { data: access, error } = await supabase
        .from("digital_access")
        .select("id, access_url, subtype, expires_at, revoked_at, user_id, product_id, order_id")
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

    if (access.order_id) {
        const admin = createAdminClient();
        const { data: linkedOrder, error: orderError } = await admin
            .from("orders")
            .select("status, payment_status, total_amount")
            .eq("id", access.order_id)
            .maybeSingle();
        if (orderError || !linkedOrder) {
            return NextResponse.json(
                { error: "Access denied", reason: "Delivery status could not be confirmed." },
                { status: 403 },
            );
        }
        const cancelled = String(linkedOrder.status || "").toLowerCase() === "cancelled";
        const paid = !cancelled && (
            isOrderPaymentComplete(linkedOrder.payment_status)
            || Number(linkedOrder.total_amount) === 0
        );
        if (!paid) {
            return NextResponse.json(
                {
                    error: "Access denied",
                    reason: cancelled ? "This order is cancelled." : "Payment has not been confirmed.",
                },
                { status: 403 },
            );
        }
    }

    if (access.product_id) {
        const gate = await getDeliveryGate(access.product_id).catch(() => null);
        if (!gate) {
            return NextResponse.json(
                { error: "Access denied", reason: "Delivery status could not be confirmed." },
                { status: 403 },
            );
        }
        if (gate.schemaReady) {
            const decision = mayServeExistingDownload({
                hasEntitlement: true,
                verificationState: gate.verificationState,
                fulfillment: gate.fulfillment,
                acquisitionModel: gate.acquisitionModel,
                enforcementBlocksDelivery: gate.enforcementBlocksDelivery,
                scanStatus: gate.scanStatus as never,
            });
            if (!decision.allowed) {
                return NextResponse.json(
                    { error: "Access denied", reason: decision.reason },
                    { status: 403 },
                );
            }
        }
    }

    // 4. LOG ACCESS (non-blocking but safe)
    supabase
        .from("digital_access")
        .update({ last_accessed_at: new Date().toISOString() })
        .eq("id", access.id)
        .then();

    // 5. NON-CLOUDINARY FILES → still protected by YOUR route
    try {
        const admin = createAdminClient();
        const since = new Date(Date.now() - 60_000).toISOString();
        const { count } = await admin
            .from("digital_download_events")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .gte("created_at", since);
        if ((count ?? 0) >= 30) {
            return NextResponse.json(
                { error: "Too many requests", reason: "Download limit reached. Try again in a minute." },
                { status: 429 },
            );
        }
        if (access.product_id) {
            await admin.from("digital_download_events").insert({
                access_id: access.id,
                user_id: user.id,
                product_id: access.product_id,
                user_agent: req.headers.get("user-agent")?.slice(0, 180) || null,
            });
        }
    } catch {
        // Download audit is best-effort and must not reveal the file URL.
    }

    let url: URL;
    try {
        url = new URL(access.access_url);
    } catch {
        return NextResponse.json({ error: "Not found", reason: "The stored file reference is not valid." }, { status: 404 });
    }
    if (url.protocol !== "https:") {
        return NextResponse.json({ error: "Not found", reason: "The stored file reference is not valid." }, { status: 404 });
    }
    const isCloudinary = url.hostname.includes(CLOUDINARY_HOST);
    const asset = isCloudinary ? parseCloudinaryAsset(access.access_url) : null;

    if (!asset) {
        return NextResponse.redirect(url.toString());
    }

    const expiresAt = Math.floor(Date.now() / 1000) + 600; // 10 min

    const signedUrl = cloudinary.url(asset.publicId, {
        secure: true,
        sign_url: true,
        resource_type: asset.resourceType,
        type: asset.type,
        attachment: true,
        expires_at: expiresAt,
        format: asset.format,
    });

    // 7. FINAL REDIRECT (user only gets here AFTER passing your site auth)
    return NextResponse.redirect(signedUrl);
}

function parseCloudinaryAsset(raw: string): {
    publicId: string;
    format: string;
    type: "upload" | "private" | "authenticated";
    resourceType: "image" | "video" | "raw";
} | null {
    try {
        const pathname = new URL(raw).pathname;
        const match = pathname.match(/\/(image|video|raw)\/(upload|private|authenticated)\//);
        if (!match || match.index == null) return null;
        const resourceType = match[1] as "image" | "video" | "raw";
        const type = match[2] as "upload" | "private" | "authenticated";
        let id = pathname.slice(match.index + match[0].length).replace(/^v\d+\//, "");
        const format = id.includes(".") ? (id.split(".").pop() || "bin") : "bin";
        id = id.replace(/\.[^/.]+$/, "");
        if (!id) return null;
        return { publicId: id, format, type, resourceType };
    } catch {
        return null;
    }
}