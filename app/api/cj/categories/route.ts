
import { getServiceClient, getCJToken, cjFetch } from "@/lib/cj/client";
import { requireAdmin } from "@/lib/auth/api-helpers";

interface CJCategoryThird {
    categoryId: string;
    categoryName: string;
}

interface CJCategorySecond {
    categorySecondName: string;
    categorySecondList: CJCategoryThird[];
}

interface CJCategoryFirst {
    categoryFirstName: string;
    categoryFirstList: CJCategorySecond[];
}

interface CategoryResponse {
    data: CJCategoryFirst[];
}

export async function GET(): Promise<Response> {
    const auth = await requireAdmin();
    if ("error" in auth && auth.error) return auth.error;

    try {
        const supabase = getServiceClient();
        const token = await getCJToken(supabase);

        const json = await cjFetch<CategoryResponse>("/product/getCategory", token);

        const flat: Array<{
            categoryId: string;
            categoryName: string;
            categoryFirstName: string;
            categorySecondName: string;
        }> = [];

        for (const first of json.data ?? []) {
            for (const second of first.categoryFirstList ?? []) {
                for (const third of second.categorySecondList ?? []) {
                    flat.push({
                        categoryId: third.categoryId,
                        categoryName: third.categoryName,
                        categoryFirstName: first.categoryFirstName,
                        categorySecondName: second.categorySecondName,
                    });
                }
            }
        }

        // Sort alphabetically by leaf name
        flat.sort((a, b) => a.categoryName.localeCompare(b.categoryName));

        return Response.json({ success: true, categories: flat });
    } catch (err) {
        console.error(err);
        const message = err instanceof Error ? err.message : "Unknown error";
        return Response.json(
            { success: false, error: message, categories: [] },
            { status: 500 }
        );
    }
}