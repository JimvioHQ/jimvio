
import { NextRequest } from "next/server";
import { getServiceClient, getCJToken, cjFetch } from "@/lib/cj/client";
import { requireAdmin } from "@/lib/auth/api-helpers";

// ─── Types matching the component's CJProduct ─────────────────────────

interface ListV2Product {
    id: string;
    nameEn: string;
    sku: string;
    bigImage: string;
    sellPrice: string;
    nowPrice?: string;
    discountPrice?: string;
    listedNum: number;
    threeCategoryName?: string;
    twoCategoryName?: string;
    oneCategoryName?: string;
    addMarkStatus?: number;
    isVideo?: number;
    productType?: string;
    createAt?: number;
    warehouseInventoryNum?: number;
    verifiedWarehouse?: number;
    deliveryCycle?: string;
}

interface ListV2Response {
    data: {
        pageSize: number;
        pageNumber: number;
        totalRecords: number;
        totalPages: number;
        content: Array<{
            productList: ListV2Product[];
        }>;
    };
}

// ─── Param translation ────────────────────────────────────────────────

function buildListV2Params(sp: URLSearchParams): URLSearchParams {
    const out = new URLSearchParams();

    // Pagination
    const pageNum = sp.get("pageNum") ?? "1";
    const pageSize = sp.get("pageSize") ?? "20";
    out.set("page", pageNum);
    out.set("size", pageSize);

    // Keyword search (component sends as productNameEn)
    const kw = sp.get("productNameEn") ?? sp.get("keyWord");
    if (kw) out.set("keyWord", kw);

    // Direct passthroughs
    const passthrough = ["categoryId", "countryCode", "verifiedWarehouse", "productType", "supplierId"];
    for (const key of passthrough) {
        const v = sp.get(key);
        if (v) out.set(key, v);
    }

    // Price range: minPrice/maxPrice → startSellPrice/endSellPrice
    const minPrice = sp.get("minPrice");
    const maxPrice = sp.get("maxPrice");
    if (minPrice) out.set("startSellPrice", minPrice);
    if (maxPrice) out.set("endSellPrice", maxPrice);

    // Inventory range
    const startInv = sp.get("startInventory");
    const endInv = sp.get("endInventory");
    if (startInv) out.set("startWarehouseInventory", startInv);
    if (endInv) out.set("endWarehouseInventory", endInv);

    // Free shipping flag
    const free = sp.get("isFreeShipping");
    if (free) out.set("addMarkStatus", free);

    // searchType (UI sends 0/1/2/3) → productFlag
    const flag = sp.get("searchType");
    if (flag !== null && flag !== "") out.set("productFlag", flag);

    // Date range: yyyy-MM-dd hh:mm:ss → ms timestamps
    const from = sp.get("createTimeFrom");
    const to = sp.get("createTimeTo");
    if (from) {
        const t = Date.parse(from.replace(" ", "T"));
        if (!Number.isNaN(t)) out.set("timeStart", String(t));
    }
    if (to) {
        const t = Date.parse(to.replace(" ", "T"));
        if (!Number.isNaN(t)) out.set("timeEnd", String(t));
    }

    // Sort: orderBy field name → listV2 numeric id
    const orderBy = sp.get("orderBy");
    if (orderBy === "createAt") out.set("orderBy", "3");
    else if (orderBy === "listedNum") out.set("orderBy", "1");

    const sort = sp.get("sort");
    if (sort === "asc" || sort === "desc") out.set("sort", sort);

    // Include category names in response so the card can show them
    out.set("features", "enable_category");

    return out;
}

// ─── Map listV2 product → component's CJProduct shape ─────────────────

function mapProduct(p: ListV2Product) {
    return {
        pid: p.id,
        productNameEn: p.nameEn,
        productSku: p.sku,
        bigImage: p.bigImage,
        sellPrice: p.sellPrice,
        nowPrice: p.nowPrice ?? p.sellPrice,
        discountPrice: p.discountPrice ?? p.nowPrice ?? p.sellPrice,
        threeCategoryName: p.threeCategoryName,
        categoryName: [p.oneCategoryName, p.twoCategoryName, p.threeCategoryName]
            .filter(Boolean)
            .join(" / ") || undefined,
        addMarkStatus: p.addMarkStatus ?? 0,
        isFreeShipping: p.addMarkStatus === 1,
        listedNum: p.listedNum ?? 0,
        warehouseInventoryNum: p.warehouseInventoryNum,
        verifiedWarehouse: p.verifiedWarehouse,
        deliveryCycle: p.deliveryCycle,
        productType: p.productType ?? "",
        isVideo: p.isVideo,
        createAt: p.createAt,
    };
}

// ─── Route handler ────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<Response> {
    const auth = await requireAdmin();
    if ("error" in auth && auth.error) return auth.error;

    try {
        const supabase = getServiceClient();
        const token = await getCJToken(supabase);

        const sp = req.nextUrl.searchParams;
        const cjParams = buildListV2Params(sp);

        const json = await cjFetch<ListV2Response>(
            `/product/listV2?${cjParams.toString()}`,
            token
        );

        const productList = json.data?.content?.[0]?.productList ?? [];
        const total = json.data?.totalRecords ?? 0;

        return Response.json({
            success: true,
            products: productList.map(mapProduct),
            total,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return Response.json({ success: false, error: message }, { status: 500 });
    }
}