// // app/api/admin/products/bulk-delete/route.ts

// import { NextRequest, NextResponse } from "next/server";
// import { createClient } from "@/lib/supabase/server";
// import { createClient as createAdminClient } from "@supabase/supabase-js";

// export async function DELETE(req: NextRequest) {
//     try {
//         const body = await req.json();
//         const ids: string[] = body?.ids;

//         if (!Array.isArray(ids) || ids.length === 0) {
//             return NextResponse.json(
//                 { error: "No product IDs provided." },
//                 { status: 400 }
//             );
//         }

//         const uuidRegex =
//             /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
//         if (ids.some((id) => !uuidRegex.test(id))) {
//             return NextResponse.json(
//                 { error: "One or more IDs are invalid." },
//                 { status: 400 }
//             );
//         }

//         // ── Auth check ────────────────────────────────────────────────────────
//         const supabase = await createClient();
//         const { data: { user }, error: authError } = await supabase.auth.getUser();

//         if (authError || !user) {
//             return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
//         }

//         // ── Admin role check ──────────────────────────────────────────────────
//         // Schema: public.user_roles (user_id, role user_role enum, is_active bool)
//         const { data: adminRole, error: roleError } = await supabase
//             .from("user_roles")
//             .select("role")
//             .eq("user_id", user.id)
//             .eq("role", "admin")
//             .eq("is_active", true)
//             .maybeSingle();

//         if (roleError) {
//             console.error("[bulk-delete] Role check error:", roleError);
//             return NextResponse.json(
//                 { error: "Failed to verify permissions." },
//                 { status: 500 }
//             );
//         }

//         if (!adminRole) {
//             return NextResponse.json({ error: "Forbidden." }, { status: 403 });
//         }

//         const admin = createAdminClient(
//             process.env.NEXT_PUBLIC_SUPABASE_URL!,
//             process.env.SUPABASE_SERVICE_ROLE_KEY!
//         );

//         const nullifySteps: Array<{ table: string; column: string }> = [
//             { table: "order_items", column: "product_id" },
//             { table: "affiliate_commissions", column: "product_id" },
//             { table: "short_videos", column: "product_id" },
//             { table: "short_video_clicks", column: "product_id" },
//         ];

//         for (const { table, column } of nullifySteps) {
//             const { error } = await admin
//                 .from(table)
//                 .update({ [column]: null })
//                 .in(column, ids);

//             if (error) {
//                 console.error(`[bulk-delete] Failed to nullify ${table}.${column}:`, error);
//                 return NextResponse.json(
//                     { error: `Failed to unlink references in ${table}: ${error.message}` },
//                     { status: 500 }
//                 );
//             }
//         }

//         const { data: product, error: deleteError, count } = await admin
//             .from("products")
//             .delete({ count: "exact" })
//             .in("id", ids);

//         if (deleteError) {
//             console.error("[bulk-delete] Delete error:", deleteError);
//             return NextResponse.json(
//                 { error: deleteError.message },
//                 { status: 500 }
//             );
//         }

//         return NextResponse.json(
//             { success: true, deleted: count ?? ids.length },
//             { status: 200 }
//         );
//     } catch (err) {
//         console.error("[bulk-delete] Unexpected error:", err);
//         return NextResponse.json(
//             { error: "Internal server error." },
//             { status: 500 }
//         );
//     }
// }

// app/api/admin/products/bulk-delete/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { unsubscribeCJProducts } from "@/lib/cj/webhoo-subscription";
import { getOrRefreshAccessToken } from "@/lib/cj/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CJUnsubscribeResult {
    success: boolean;
    requestId?: string;
    error?: string;
}



async function unsubscribeAllCJProducts(
    accessToken: string,
    cjPids: string[]
): Promise<{ failed: string[]; errors: string[] }> {
    const failed: string[] = [];
    const errors: string[] = [];

    // Chunk into groups of 100 (CJ API limit)
    for (let i = 0; i < cjPids.length; i += 100) {
        const chunk = cjPids.slice(i, i + 100);
        try {
            const result: CJUnsubscribeResult = await unsubscribeCJProducts(
                accessToken,
                chunk
            );
            if (!result.success) {
                failed.push(...chunk);
                errors.push(
                    `CJ unsubscribe failed for batch [${i}–${i + chunk.length}]: ${result.error ?? "Unknown error"}`
                );
            }
        } catch (err) {
            failed.push(...chunk);
            errors.push(
                `CJ unsubscribe threw for batch [${i}–${i + chunk.length}]: ${(err as Error).message}`
            );
        }
    }

    return { failed, errors };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
    try {
        const body = await req.json();
        const ids: string[] = body?.ids;

        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json(
                { error: "No product IDs provided." },
                { status: 400 }
            );
        }

        const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (ids.some((id) => !uuidRegex.test(id))) {
            return NextResponse.json(
                { error: "One or more IDs are invalid." },
                { status: 400 }
            );
        }

        // ── Auth check ──────────────────────────────────────────────────────────
        const supabase = await createClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        // ── Admin role check ────────────────────────────────────────────────────
        const { data: adminRole, error: roleError } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "admin")
            .eq("is_active", true)
            .maybeSingle();

        if (roleError) {
            console.error("[bulk-delete] Role check error:", roleError);
            return NextResponse.json(
                { error: "Failed to verify permissions." },
                { status: 500 }
            );
        }

        if (!adminRole) {
            return NextResponse.json({ error: "Forbidden." }, { status: 403 });
        }

        const admin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // ── Detect CJ products among the IDs being deleted ──────────────────────
        // We read source + source_metadata.cj_pid for all products in the batch
        const { data: productRows, error: fetchError } = await admin
            .from("products")
            .select("id, source, source_metadata")
            .in("id", ids);

        if (fetchError) {
            console.error("[bulk-delete] Failed to fetch product sources:", fetchError);
            return NextResponse.json(
                { error: `Failed to fetch product data: ${fetchError.message}` },
                { status: 500 }
            );
        }

        const cjProducts = (productRows ?? []).filter((p) => p.source === "cj");
        const cjPids: string[] = cjProducts
            .map((p) => p.source_metadata?.cj_pid as string)
            .filter(Boolean);

        const cjWarnings: string[] = [];

        if (cjPids.length > 0) {
            const accessToken = await getOrRefreshAccessToken(admin);

            if (!accessToken) {

                console.warn(
                    "[bulk-delete] CJ access token not configured; skipping unsubscribe"
                );
                cjWarnings.push(
                    "CJ access token not configured — products were not unsubscribed from CJ."
                );
            } else {
                console.log(
                    `[bulk-delete] Unsubscribing ${cjPids.length} CJ product(s)...`
                );

                const { failed, errors } = await unsubscribeAllCJProducts(
                    accessToken,
                    cjPids
                );

                if (errors.length > 0) {
                    // Log but don't block deletion — we still want the local records gone
                    console.error(
                        "[bulk-delete] CJ unsubscribe partial failure:",
                        errors
                    );
                    cjWarnings.push(...errors);

                    if (failed.length === cjPids.length) {
                        // Every CJ unsubscribe call failed — surface this clearly
                        return NextResponse.json(
                            {
                                error: "CJ unsubscribe failed for all products. No products were deleted.",
                                details: errors,
                            },
                            { status: 502 }
                        );
                    }
                }
            }
        }

        // ── Nullify FK references before deleting ───────────────────────────────
        const nullifySteps: Array<{ table: string; column: string }> = [
            { table: "order_items", column: "product_id" },
            { table: "affiliate_commissions", column: "product_id" },
            { table: "short_videos", column: "product_id" },
            { table: "short_video_clicks", column: "product_id" },
        ];

        for (const { table, column } of nullifySteps) {
            const { error } = await admin
                .from(table)
                .update({ [column]: null })
                .in(column, ids);

            if (error) {
                console.error(
                    `[bulk-delete] Failed to nullify ${table}.${column}:`,
                    error
                );
                return NextResponse.json(
                    {
                        error: `Failed to unlink references in ${table}: ${error.message}`,
                    },
                    { status: 500 }
                );
            }
        }

        // ── Delete products ──────────────────────────────────────────────────────
        const { error: deleteError, count } = await admin
            .from("products")
            .delete({ count: "exact" })
            .in("id", ids);

        if (deleteError) {
            console.error("[bulk-delete] Delete error:", deleteError);
            return NextResponse.json(
                { error: deleteError.message },
                { status: 500 }
            );
        }

        // ── Respond ─────────────────────────────────────────────────────────────
        return NextResponse.json(
            {
                success: true,
                deleted: count ?? ids.length,
                cj_unsubscribed: cjPids.length,
                // Surface any non-fatal CJ warnings to the client
                ...(cjWarnings.length > 0 && { warnings: cjWarnings }),
            },
            { status: 200 }
        );
    } catch (err) {
        console.error("[bulk-delete] Unexpected error:", err);
        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500 }
        );
    }
}