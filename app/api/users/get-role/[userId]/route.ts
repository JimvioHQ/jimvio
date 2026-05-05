import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { log } from "console";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) { // ← and this
    try {
        const userId = req.nextUrl.searchParams.get("userId");
        console.info(`[GET /api/users/get-role] Fetching roles for userId: ${userId}`);
        // 1. Auth guard
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {w
            return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        // 2. Validate userId
        if (!userId || !UUID_REGEX.test(userId)) {
            return Response.json({ success: false, error: "Missing or invalid userId" }, { status: 400 });
        }

        // 3. Check user exists
        const userExists = await prisma.profiles.findUnique({
            where: { id: userId },
            select: { id: true },
        });

        if (!userExists) {
            return Response.json({ success: false, error: "User not found" }, { status: 404 });
        }

        // 4. Fetch roles
        const roles = await prisma.user_roles.findMany({
            where: { user_id: userId },
            select: {
                role: true,
                vendor: { select: { business_name: true, business_slug: true } },
                creator: { select: { display_name: true, profile_slug: true } },
                affiliate: { select: { display_name: true, profile_slug: true } },
            },
        });

        return Response.json({
            success: true,
            data: roles,
            meta: { count: roles.length, isEmpty: roles.length === 0 },
        }, { status: 200 });

    } catch (error: unknown) {
        console.error("[GET /api/roles]", error instanceof Error ? error.message : error);
        return Response.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}