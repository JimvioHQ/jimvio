// ============================================================
// CJ VARIANT OPTIONS PARSER
// Converts CJ's raw variantKey strings into structured options
// that can power a real storefront color/size selector.
//
// Stores everything in product_variants.options (JSONB)
// No extra table needed.
// ============================================================

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Structured option for a single variant.
 * Stored in product_variants.options JSONB.
 *
 * Example for "Dark blue-116 (5to6 years)" with keys ["Color","Size"]:
 * {
 *   Color: "Dark blue",
 *   Size: "116",
 *   size_label: "5to6 years",
 *   variant_key: "Dark blue-116 (5to6 years)"   ← kept for debugging
 * }
 */
export interface VariantOptions {
    [key: string]: string;      // Color, Size, etc.
    variant_key: string;        // original CJ string, kept for reference
}

/**
 * Product-level option definitions.
 * Stored in products.source_metadata.options (JSONB).
 * Powers the storefront selector UI.
 *
 * Example:
 * {
 *   keys: ["Color", "Size"],
 *   values: {
 *     Color: ["Dark blue", "Gray"],
 *     Size: [
 *       { value: "104", label: "3to4 years" },
 *       { value: "116", label: "5to6 years" },
 *       { value: "128", label: "7to8 years" }
 *     ]
 *   }
 * }
 */
export interface ProductOptions {
    keys: string[];
    values: {
        [key: string]: string[] | SizeOption[];
    };
}

export interface SizeOption {
    value: string;
    label: string;      // e.g. "5to6 years", "7to8 years"
}

// ── Core Parser ───────────────────────────────────────────────────────────────

/**
 * Parse a CJ variantKey string into structured key-value pairs.
 *
 * CJ format: "{Color}-{Size} ({label})"
 * Examples:
 *   "Dark blue-116 (5to6 years)"  → { Color: "Dark blue", Size: "116", size_label: "5to6 years" }
 *   "Gray-128 (7to8 years)"       → { Color: "Gray",      Size: "128", size_label: "7to8 years" }
 *   "Black"                        → { Color: "Black" }
 *   "Dark blue-116 (5to6 years)"  → with keys ["Color","Size"]
 *
 * @param variantKey  - Raw string from CJ e.g. "Dark blue-116 (5to6 years)"
 * @param optionKeys  - Ordered option dimensions from productKeySet e.g. ["Color","Size"]
 */
export function parseVariantKey(
    variantKey: string,
    optionKeys: string[]
): VariantOptions {
    const result: VariantOptions = { variant_key: variantKey };

    if (!variantKey || optionKeys.length === 0) {
        return result;
    }

    // Extract parenthetical label if present: "116 (5to6 years)" → label="5to6 years"
    const labelMatch = variantKey.match(/\(([^)]+)\)\s*$/);
    const sizeLabel = labelMatch?.[1]?.trim() ?? null;

    // Strip the label from the string before splitting
    const cleanKey = variantKey.replace(/\s*\([^)]+\)\s*$/, "").trim();

    if (optionKeys.length === 1) {
        // Single dimension — whole string is the value
        result[optionKeys[0]] = cleanKey;
        return result;
    }

    if (optionKeys.length === 2) {
        // Two dimensions — split on the LAST hyphen that's followed by a digit or uppercase
        // This handles "Dark blue-116" correctly (not splitting "Dark-blue")
        const splitIndex = findOptionSplitIndex(cleanKey);

        if (splitIndex !== -1) {
            result[optionKeys[0]] = cleanKey.substring(0, splitIndex).trim();
            result[optionKeys[1]] = cleanKey.substring(splitIndex + 1).trim();
        } else {
            // Fallback: can't split, use whole string as first key
            result[optionKeys[0]] = cleanKey;
        }

        // Attach size label if present (useful for display)
        if (sizeLabel) {
            result[`${optionKeys[1].toLowerCase()}_label`] = sizeLabel;
        }

        return result;
    }

    // 3+ dimensions: split on all hyphens (less common in CJ)
    const parts = cleanKey.split("-").map((p) => p.trim());
    optionKeys.forEach((key, i) => {
        if (parts[i]) result[key] = parts[i];
    });

    return result;
}

/**
 * Find the correct split point in a combined "Color-Size" string.
 * Handles cases like "Dark blue-116" where color contains spaces.
 *
 * Strategy: find the last hyphen that is followed by a digit or
 * a known size pattern (number or standard size like S/M/L/XL).
 */
function findOptionSplitIndex(str: string): number {
    // Try: last hyphen followed by a digit (numeric size like 116, 128)
    const numericMatch = str.match(/-(\d)/);
    if (numericMatch) {
        // Use the LAST occurrence of -digit pattern
        const lastIndex = str.lastIndexOf(`-${numericMatch[1]}`);
        // Verify it's actually a numeric size (not a color number like "24K Gold")
        const afterHyphen = str.substring(lastIndex + 1);
        if (/^\d/.test(afterHyphen)) {
            return lastIndex;
        }
    }

    // Try: last hyphen followed by standard clothing sizes
    const sizePattern = /-(XS|S|M|L|XL|XXL|XXXL|2XL|3XL)$/i;
    const sizeMatch = str.match(sizePattern);
    if (sizeMatch) {
        return str.lastIndexOf(`-${sizeMatch[1]}`);
    }

    // Fallback: last hyphen in string
    return str.lastIndexOf("-");
}

// ── Product-Level Options Builder ─────────────────────────────────────────────

/**
 * Build the full product options definition from all variants.
 * This powers the storefront selector (color picker, size dropdown, etc.)
 *
 * @param variants    - Array of CJ variants with variantKey strings
 * @param optionKeys  - From productKeySet e.g. ["Color", "Size"]
 */
export function buildProductOptions(
    variants: Array<{ variantKey: string }>,
    optionKeys: string[]
): ProductOptions {
    const valueMap: { [key: string]: Set<string> } = {};
    const labelMap: { [sizeValue: string]: string } = {};

    // Initialize sets for each key
    optionKeys.forEach((key) => {
        valueMap[key] = new Set<string>();
    });

    // Parse each variant and collect unique values
    for (const variant of variants) {
        const parsed = parseVariantKey(variant.variantKey, optionKeys);

        optionKeys.forEach((key) => {
            const val = parsed[key];
            if (val) valueMap[key].add(val);
        });

        // Collect size labels (e.g. "116" → "5to6 years")
        if (optionKeys.length >= 2) {
            const sizeKey = optionKeys[1];
            const labelKey = `${sizeKey.toLowerCase()}_label`;
            const sizeVal = parsed[sizeKey];
            const sizeLabel = parsed[labelKey];
            if (sizeVal && sizeLabel) {
                labelMap[sizeVal] = sizeLabel;
            }
        }
    }

    // Build the final values object
    const values: ProductOptions["values"] = {};

    optionKeys.forEach((key, index) => {
        const uniqueVals = Array.from(valueMap[key]);

        if (index === 1 && Object.keys(labelMap).length > 0) {
            // Size dimension — include labels
            values[key] = uniqueVals.map((val) => ({
                value: val,
                label: labelMap[val] ?? val,
            })) as SizeOption[];
        } else {
            values[key] = uniqueVals;
        }
    });

    return {
        keys: optionKeys,
        values,
    };
}

// ── Integration: Drop-in replacements for your existing mapper ────────────────

/**
 * Drop-in replacement for the options field in mapCJVariantToJimvio.
 *
 * BEFORE (your current code):
 *   options: { variant_key: cjVariant.variantProperty || cjVariant.variantSku }
 *
 * AFTER:
 *   options: buildVariantOptions(cjVariant.variantProperty, optionKeys)
 */
export function buildVariantOptions(
    variantKey: string | null | undefined,
    optionKeys: string[]
): VariantOptions {
    if (!variantKey) {
        return { variant_key: "" };
    }
    return parseVariantKey(variantKey, optionKeys);
}

/**
 * Call this after mapCJProductToJimvio to inject product-level options
 * into source_metadata. The storefront reads from source_metadata.options.
 *
 * Usage:
 *   const mapped = await mapCJProductToJimvio(...)
 *   const withOptions = injectProductOptions(mapped, cjVariants, productKeySet)
 */
export function injectProductOptions(
    mappedProduct: { source_metadata: Record<string, unknown> },
    variants: Array<{ variantKey: string }>,
    optionKeys: string[]
): typeof mappedProduct {
    const productOptions = buildProductOptions(variants, optionKeys);

    return {
        ...mappedProduct,
        source_metadata: {
            ...mappedProduct.source_metadata,
            options: productOptions,
        },
    };
}

// ── Usage Examples ─────────────────────────────────────────────────────────────

/*

// ── In your route handler (POST /api/cj/import) ────────────────────────────

// Get optionKeys from the CJ detail response
const optionKeys: string[] = detail.data.productProEnSet ?? [];
// e.g. ["Color", "Size"] or ["Color"]

// When mapping variants:
const variantRows = detail.data.variants.map((v) => {
    const cjVariant = detailVariantToCJVariant(v, detail.data.productSku);
    return {
        ...mapCJVariantToJimvio(cjVariant, productId, exchangeRate),
        // ✅ Override options with structured data:
        options: buildVariantOptions(v.variantKey, optionKeys),
        // ✅ Fix name fallback:
        name: v.variantNameEn || v.variantName || v.variantKey || v.variantSku,
    };
});

// When saving the product, inject product-level options:
const cjProductMapped = await mapCJProductToJimvio(supabase, cjProduct, vendorId, exchangeRate);
const withOptions = injectProductOptions(
    cjProductMapped,
    detail.data.variants,   // raw CJ variants with variantKey
    optionKeys
);

const { data, error } = await supabase
    .from("products")
    .upsert({ ...withOptions }, { onConflict: "vendor_id,slug" })
    .select("id")
    .single();

// ── What gets stored ───────────────────────────────────────────────────────

// product_variants.options for "Dark blue-116 (5to6 years)":
// {
//   "Color": "Dark blue",
//   "Size": "116",
//   "size_label": "5to6 years",
//   "variant_key": "Dark blue-116 (5to6 years)"
// }

// product_variants.options for "Gray-128 (7to8 years)":
// {
//   "Color": "Gray",
//   "Size": "128",
//   "size_label": "7to8 years",
//   "variant_key": "Gray-128 (7to8 years)"
// }

// product_variants.options for "Black" (single dimension):
// {
//   "Color": "Black",
//   "variant_key": "Black"
// }

// products.source_metadata.options (product-level definitions):
// {
//   "keys": ["Color", "Size"],
//   "values": {
//     "Color": ["Dark blue", "Gray"],
//     "Size": [
//       { "value": "116", "label": "5to6 years" },
//       { "value": "128", "label": "7to8 years" }
//     ]
//   }
// }

// ── Storefront query to get all variants with options ──────────────────────

// const { data: variants } = await supabase
//   .from("product_variants")
//   .select("id, price, image_url, options, is_active")
//   .eq("product_id", productId)
//   .eq("is_active", true)

// Then on the frontend:
// const selectedVariant = variants.find(v =>
//   v.options.Color === selectedColor &&
//   v.options.Size === selectedSize
// )

*/