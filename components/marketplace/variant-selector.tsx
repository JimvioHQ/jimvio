"use client";

import React, { useMemo, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductVariant {
    id: string;
    name: string;
    price: number;
    compare_at_price?: number | null;
    inventory_quantity: number;
    image_url?: string | null;
    options?: Record<string, string> | null;
    is_active: boolean;
    sku?: string | null;
}

interface VariantSelectorProps {
    variants: ProductVariant[];
    selectedVariantId: string | null;
    onSelect: (variant: ProductVariant) => void;
    basePrice?: number;
    currency?: string;
    /**
     * Optional override for price formatting.
     * If omitted, the user's preferred currency from CurrencyContext is used automatically.
     */
    formatPrice?: (n: number) => string;
    maxVisibleOptions?: number;
}

// ─── Color map ────────────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, string> = {
    black: "#18181b", white: "#f4f4f5", red: "#ef4444", blue: "#3b82f6",
    green: "#22c55e", yellow: "#eab308", orange: "#f97316", purple: "#a855f7",
    pink: "#ec4899", gray: "#71717a", grey: "#71717a", navy: "#1e3a5f",
    brown: "#92400e", beige: "#d4b896", gold: "#f59e0b", silver: "#94a3b8",
    teal: "#14b8a6", cyan: "#06b6d4", indigo: "#6366f1", violet: "#8b5cf6",
    rose: "#f43f5e", lime: "#84cc16", emerald: "#10b981", coral: "#ff6b6b",
    mint: "#98d8c8", maroon: "#800000", burgundy: "#800020", turquoise: "#40e0d0",
    lavender: "#e6e6fa", charcoal: "#36454f", ivory: "#fffff0", tan: "#d2b48c",
    midnight: "#191970", titanium: "#878681", "space gray": "#4a4a4f",
    "light blue": "#93c5fd", "light green": "#86efac", "light pink": "#fbcfe8",
    "milk tea": "#c8a882", "sky blue": "#87ceeb", "dark blue": "#1e3a8a",
    "dark green": "#14532d", "dark red": "#7f1d1d", "rose gold": "#b76e79",
    "olive green": "#556b2f", "natural titanium": "#c2b49a",
    "black titanium": "#2a2927", "white titanium": "#e8e5e0",
};

function resolveColorHex(label: string): string | null {
    const lower = label.toLowerCase().trim();
    if (COLOR_MAP[lower]) return COLOR_MAP[lower];
    if (/^#[0-9a-f]{3,8}$/i.test(lower)) return lower;
    for (const [key, hex] of Object.entries(COLOR_MAP)) {
        if (new RegExp(`\\b${key.replace(/\s+/g, "\\s+")}\\b`, "i").test(lower))
            return hex;
    }
    return null;
}

function isLightColor(hex: string): boolean {
    const clean = hex.replace("#", "");
    if (clean.length < 6) return false;
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}

// ─── Structured-data extraction ───────────────────────────────────────────────

function extractOptions(
    raw: Record<string, string> | null | undefined
): Record<string, string> | null {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
        if (k === "variant_key") continue;
        if (typeof v !== "string") continue;
        const trimmed = v.trim();
        if (!trimmed || trimmed === "[]" || trimmed === "{}") continue;
        out[k] = trimmed;
    }
    return Object.keys(out).length > 0 ? out : null;
}

const KNOWN_COLOR_LABELS = Object.keys(COLOR_MAP).sort((a, b) => b.length - a.length);

function titleCaseWords(s: string): string {
    return s.replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

/** Parse a short label like "Blue 2PCS", "Black", or "Dark blue-116". */
function parseShortVariantLabel(label: string): Record<string, string> {
    const axes: Record<string, string> = {};
    let rest = label.trim();
    if (!rest) return axes;

    const packMatch = rest.match(/\s+(\d+\s*PCS?)\s*$/i);
    if (packMatch) {
        axes.Pack = packMatch[1].replace(/\s+/g, "").toUpperCase();
        rest = rest.slice(0, packMatch.index).trim();
    }

    for (const color of KNOWN_COLOR_LABELS) {
        const re = new RegExp(`\\b${color.replace(/\s+/g, "\\s+")}\\b`, "i");
        const match = rest.match(re);
        if (match) {
            axes.Color = titleCaseWords(match[0]);
            rest = rest.replace(re, "").trim();
            break;
        }
    }

    if (!axes.Color && rest) {
        const dashParts = rest.split(/[-–—]/).map((p) => p.trim()).filter(Boolean);
        if (dashParts.length >= 2) {
            axes.Color = titleCaseWords(dashParts[0]);
            axes.Size = dashParts.slice(1).join("-");
        } else if (rest.length <= 40) {
            axes.Style = titleCaseWords(rest);
        }
    }

    return axes;
}

function tryParseVariantOptions(
    options: Record<string, string> | null | undefined,
    name: string
): Record<string, string> | null {
    const structured = extractOptions(options);
    if (structured) return structured;

    const variantKey =
        options && typeof options.variant_key === "string" ? options.variant_key.trim() : "";
    if (variantKey && variantKey.length <= 80 && variantKey !== name) {
        const fromKey = parseShortVariantLabel(variantKey);
        if (Object.keys(fromKey).length > 0) return fromKey;
    }

    return null;
}

function inferAxesFromVariantNames(
    variants: ProductVariant[]
): Map<string, Record<string, string>> {
    const result = new Map<string, Record<string, string>>();
    if (variants.length === 0) return result;

    const names = variants.map((v) => v.name.trim()).filter(Boolean);
    const prefix =
        names.length > 1 ? longestCommonWordPrefix(names) : "";

    const suffixById = new Map<string, string>();
    for (const v of variants) {
        const name = v.name.trim();
        let suffix = prefix && name.startsWith(prefix)
            ? name.slice(prefix.length).replace(/^[\s,\-–—]+/, "").trim()
            : name;
        if (!suffix) suffix = name;
        suffixById.set(v.id, suffix);
    }

    const parsedById = new Map<string, Record<string, string>>();
    for (const v of variants) {
        const suffix = suffixById.get(v.id) ?? v.name;
        parsedById.set(v.id, parseShortVariantLabel(suffix));
    }

    const axisValues: Record<string, Set<string>> = {};
    for (const axes of parsedById.values()) {
        for (const [key, val] of Object.entries(axes)) {
            if (!val) continue;
            (axisValues[key] ??= new Set()).add(val);
        }
    }

    const hasPackAxis = (axisValues.Pack?.size ?? 0) > 1;
    if (hasPackAxis) {
        for (const v of variants) {
            const axes = parsedById.get(v.id) ?? {};
            if (!axes.Pack) axes.Pack = "1PC";
            parsedById.set(v.id, axes);
        }
    }

    for (const v of variants) {
        const axes = parsedById.get(v.id) ?? {};
        const cleaned = Object.fromEntries(
            Object.entries(axes).filter(([key, val]) => {
                if (!val) return false;
                return (axisValues[key]?.size ?? 0) > 1;
            })
        );
        if (Object.keys(cleaned).length > 0) result.set(v.id, cleaned);
    }

    return result;
}

interface ParsedVariant extends ProductVariant {
    axes: Record<string, string>;
    axesReliable: boolean;
}

function parseVariants(variants: ProductVariant[]): ParsedVariant[] {
    const active = variants.filter((v) => v.is_active);

    const firstPass = active.map((v) => {
        const structured = tryParseVariantOptions(v.options, v.name);
        if (structured) return { ...v, axes: structured, axesReliable: true };
        return { ...v, axes: {}, axesReliable: false };
    });

    const needsInference = firstPass.filter((v) => !v.axesReliable);
    if (needsInference.length === 0) return firstPass;

    const inferred = inferAxesFromVariantNames(needsInference);

    return firstPass.map((v) => {
        if (v.axesReliable) return v;
        const axes = inferred.get(v.id);
        if (axes && Object.keys(axes).length > 0) {
            return { ...v, axes, axesReliable: true };
        }
        return v;
    });
}

// ─── Availability map ─────────────────────────────────────────────────────────

interface OptionAvailability {
    available: boolean;
    inCombo: boolean;
}

function buildAvailabilityMap(
    parsed: ParsedVariant[],
    currentSelections: Record<string, string>
): Record<string, Record<string, OptionAvailability>> {
    const map: Record<string, Record<string, OptionAvailability>> = {};
    const axes: Record<string, Set<string>> = {};
    for (const v of parsed) {
        for (const [k, val] of Object.entries(v.axes)) {
            (axes[k] ??= new Set()).add(val);
        }
    }
    for (const [key, vals] of Object.entries(axes)) {
        map[key] = {};
        for (const val of vals) {
            const matches = parsed.filter((v) => v.axes[key] === val);
            const available = matches.length > 0;
            const inCombo = matches.some((v) =>
                Object.entries(currentSelections)
                    .filter(([k]) => k !== key)
                    .every(([k, s]) => v.axes[k] === s)
            );
            map[key][val] = { available, inCombo };
        }
    }
    return map;
}

// ─── Variant resolution ───────────────────────────────────────────────────────

function resolveVariant(
    parsed: ParsedVariant[],
    selections: Record<string, string>,
    changedKey: string
): ParsedVariant | null {
    const exact = parsed.find((v) =>
        Object.entries(selections).every(([k, val]) => v.axes[k] === val)
    );
    if (exact) return exact;
    const sameAxis = parsed.filter((v) => v.axes[changedKey] === selections[changedKey]);
    const otherKeys = Object.keys(selections).filter((k) => k !== changedKey);
    return (
        sameAxis.find((v) => otherKeys.every((k) => v.axes[k] === selections[k])) ??
        sameAxis[0] ??
        null
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

const AXIS_PRIORITY = ["Color", "Size", "Pack", "Material", "Style", "Storage", "Mode"];

export function VariantSelector({
    variants,
    selectedVariantId,
    onSelect,
    basePrice,
    currency,
    formatPrice: formatPriceProp,
    maxVisibleOptions = 8,
}: VariantSelectorProps) {

    const { formatMoney } = useCurrency();
    const formatPrice = formatPriceProp ?? ((amount: number) => formatMoney(amount, currency ?? "USD"));

    const visibleVariants = useMemo(
        () => variants.filter((v) => v.is_active),
        [variants]
    );

    const parsed = useMemo(() => parseVariants(visibleVariants), [visibleVariants]);

    const axisKeys = useMemo(() => {
        const seen = new Set<string>();
        const keys: string[] = [];
        for (const p of AXIS_PRIORITY) {
            if (parsed.some((v) => p in v.axes)) { seen.add(p); keys.push(p); }
        }
        for (const v of parsed) {
            for (const k of Object.keys(v.axes)) {
                if (!seen.has(k)) { seen.add(k); keys.push(k); }
            }
        }
        return keys;
    }, [parsed]);

    const selectedVariant = parsed.find((v) => v.id === selectedVariantId) ?? null;
    const currentSelections = selectedVariant?.axes ?? {};

    const availabilityMap = useMemo(
        () => buildAvailabilityMap(parsed, currentSelections),
        [parsed, currentSelections]
    );

    const axisValues = useMemo(() => {
        const map: Record<string, string[]> = {};
        for (const key of axisKeys) {
            const seen = new Set<string>();
            for (const v of parsed) {
                const val = v.axes[key];
                if (val && !seen.has(val)) { seen.add(val); (map[key] ??= []).push(val); }
            }
        }
        return map;
    }, [axisKeys, parsed]);

    const minPrice = useMemo(() => {
        if (basePrice !== undefined) return basePrice;
        if (parsed.length === 0) return 0;
        return parsed.reduce((m, v) => Math.min(m, v.price), parsed[0].price);
    }, [basePrice, parsed]);

    const hasPriceVariation = useMemo(
        () => new Set(parsed.map((v) => v.price)).size > 1,
        [parsed]
    );

    const minPriceForAxisValue = useCallback(
        (key: string, value: string): number | null => {
            const matches = parsed.filter((v) => v.axes[key] === value);
            if (matches.length === 0) return null;
            return matches.reduce((m, v) => Math.min(m, v.price), matches[0].price);
        },
        [parsed]
    );

    const handleOptionClick = useCallback(
        (key: string, value: string) => {
            if (!availabilityMap[key]?.[value]?.available) return;
            if (currentSelections[key] === value) return;
            const next = { ...currentSelections, [key]: value };
            const match = resolveVariant(parsed, next, key);
            if (match) onSelect(match);
        },
        [availabilityMap, currentSelections, parsed, onSelect]
    );

    const groupRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLDivElement>, key: string) => {
            if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) return;
            const group = groupRefs.current.get(key);
            if (!group) return;
            const buttons = Array.from(
                group.querySelectorAll<HTMLButtonElement>("button:not([disabled])")
            );
            const idx = buttons.findIndex((b) => b === document.activeElement);
            if (idx === -1) return;
            e.preventDefault();
            const last = buttons.length - 1;
            const next =
                e.key === "ArrowRight" || e.key === "ArrowDown" ? (idx + 1) % buttons.length
                    : e.key === "ArrowLeft" || e.key === "ArrowUp" ? (idx - 1 + buttons.length) % buttons.length
                        : e.key === "Home" ? 0 : last;
            buttons[next]?.focus();
        },
        []
    );

    if (axisKeys.length === 0) {
        if (parsed.length <= 1) return null;
        return (
            <FlatVariantGroup
                parsed={parsed}
                selectedVariantId={selectedVariantId}
                hasPriceVariation={hasPriceVariation}
                minPrice={minPrice}
                formatPrice={formatPrice}
                maxVisible={maxVisibleOptions}
                onSelect={onSelect}
            />
        );
    }

    return (
        <div className="space-y-5">
            {axisKeys.map((key) => {
                const values = axisValues[key] ?? [];
                const currentVal = currentSelections[key];
                const isColorAxis = key === "Color";
                const tabbableIdx = currentVal ? values.indexOf(currentVal) : 0;

                return (
                    <div key={key}>
                        {/* ── Axis label ── */}
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                {key}
                            </span>
                            {currentVal ? (
                                <>
                                    <span className="text-muted-foreground/40 text-[10px]" aria-hidden>·</span>
                                    <span className="text-[12px] font-semibold text-foreground">
                                        {currentVal}
                                    </span>
                                    {/* Pill badge reinforcing the selection */}
                                    <span className="inline-flex items-center gap-1 ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full bg-foreground/8 text-foreground/60 border border-border/60">
                                        <svg aria-hidden width="9" height="9" viewBox="0 0 10 10" fill="none">
                                            <path d="M2 5l2.5 2.5 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        Selected
                                    </span>
                                </>
                            ) : (
                                <span className="ml-auto text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                    Choose one
                                </span>
                            )}
                        </div>

                        {/* ── Option row ── */}
                        <div
                            role="radiogroup"
                            aria-label={key}
                            ref={(el) => { groupRefs.current.set(key, el); }}
                            onKeyDown={(e) => handleKeyDown(e, key)}
                            className={cn(
                                "flex gap-2",
                                isColorAxis
                                    ? "flex-wrap"
                                    : values.length > maxVisibleOptions
                                        ? "overflow-x-auto pb-1 scrollbar-thin"
                                        : "flex-wrap"
                            )}
                        >
                            {values.map((val, idx) => {
                                const selected = currentVal === val;
                                const avail = availabilityMap[key]?.[val] ?? { available: false, inCombo: false };
                                const valMinPrice = minPriceForAxisValue(key, val);
                                const priceDelta =
                                    hasPriceVariation && valMinPrice !== null
                                        ? valMinPrice - minPrice
                                        : null;
                                const imageForVal =
                                    parsed.find((v) => v.axes[key] === val && v.image_url)?.image_url ?? null;

                                return isColorAxis ? (
                                    <ColorSwatch
                                        key={val}
                                        value={val}
                                        imageUrl={imageForVal}
                                        selected={selected}
                                        available={avail.available}
                                        inCurrentCombo={avail.inCombo}
                                        tabbable={idx === tabbableIdx}
                                        onClick={() => handleOptionClick(key, val)}
                                    />
                                ) : (
                                    <OptionButton
                                        key={val}
                                        value={val}
                                        selected={selected}
                                        available={avail.available}
                                        inCurrentCombo={avail.inCombo}
                                        priceDelta={priceDelta}
                                        formatPrice={formatPrice}
                                        tabbable={idx === tabbableIdx}
                                        onClick={() => handleOptionClick(key, val)}
                                    />
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            {selectedVariant && (
                <VariantStockBadge quantity={selectedVariant.inventory_quantity} />
            )}
        </div>
    );
}

// ─── Flat variant group ───────────────────────────────────────────────────────

/**
 * Derives a short display label from a long variant name.
 *
 * Strategy (in order):
 * 1. If all names share a long common prefix, strip it and return the suffix.
 * 2. If the name contains a parenthesised part, use that: "XL Torch (Blue)" → "Blue"
 * 3. If the name has a comma-separated tail that differs across variants, use that.
 * 4. Fall back to the last word group (≤ 3 words) after the last comma or dash.
 * 5. Hard-truncate to 28 chars with an ellipsis if nothing short is found.
 */
function longestCommonWordPrefix(strs: string[]): string {
    if (strs.length === 0) return "";
    // Start with the shortest string as the candidate — avoids early termination
    let prefix = strs.reduce((a, b) => (a.length <= b.length ? a : b));
    for (const s of strs) {
        while (prefix && !s.startsWith(prefix)) {
            // Trim back to the previous word boundary
            const cut = prefix.lastIndexOf(" ");
            prefix = cut > 0 ? prefix.slice(0, cut) : "";
        }
        if (!prefix) return "";
    }
    return prefix;
}

function deriveShortLabel(name: string, allNames: string[]): string {
    // 1. Common prefix stripping
    if (allNames.length > 1) {
        const prefix = longestCommonWordPrefix(allNames);
        if (prefix && prefix.length > 10) {
            const suffix = name.slice(prefix.length).replace(/^[\s,\-–—]+/, "").trim();
            if (suffix.length > 0 && suffix.length <= 50) return suffix;
        }
    }

    // 2. Parenthesised part
    const paren = name.match(/\(([^)]+)\)$/);
    if (paren) return paren[1].trim();

    // 3. Last comma segment
    const parts = name.split(",");
    if (parts.length > 1) {
        const tail = parts[parts.length - 1].trim();
        if (tail.length > 0 && tail.length <= 30) return tail;
    }

    // 4. Last dash segment
    const dashes = name.split(/[-–—]/);
    if (dashes.length > 1) {
        const tail = dashes[dashes.length - 1].trim();
        if (tail.length > 0 && tail.length <= 30) return tail;
    }

    // 5. Hard truncate
    return name.length > 28 ? name.slice(0, 27) + "…" : name;
}

function FlatVariantGroup({
    parsed,
    selectedVariantId,
    hasPriceVariation,
    minPrice,
    formatPrice,
    maxVisible,
    onSelect,
}: {
    parsed: ParsedVariant[];
    selectedVariantId: string | null;
    hasPriceVariation: boolean;
    minPrice: number;
    formatPrice: (n: number) => string;
    maxVisible: number;
    onSelect: (v: ProductVariant) => void;
}) {
    const selectedIdx = parsed.findIndex((v) => v.id === selectedVariantId);
    const tabbableIdx = selectedIdx >= 0 ? selectedIdx : 0;
    const allNames = parsed.map((v) => v.name);

    return (
        <div role="radiogroup" aria-label="Variant">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Variant
            </p>
            <div
                className={cn(
                    "flex gap-2",
                    parsed.length > maxVisible
                        ? "overflow-x-auto pb-1 scrollbar-thin"
                        : "flex-wrap"
                )}
            >
                {parsed.map((v, i) => {
                    const shortLabel = deriveShortLabel(v.name, allNames);
                    return (
                        <OptionButton
                            key={v.id}
                            value={shortLabel}
                            fullLabel={v.name}
                            selected={v.id === selectedVariantId}
                            available={true}
                            inCurrentCombo={true}
                            priceDelta={hasPriceVariation ? v.price - minPrice : null}
                            formatPrice={formatPrice}
                            tabbable={i === tabbableIdx}
                            onClick={() => onSelect(v)}
                        />
                    );
                })}
            </div>
        </div>
    );
}

// ─── Option button ────────────────────────────────────────────────────────────

function OptionButton({
    value,
    fullLabel,
    selected,
    available,
    inCurrentCombo,
    priceDelta,
    formatPrice,
    tabbable,
    onClick,
}: {
    value: string;
    fullLabel?: string;
    selected: boolean;
    available: boolean;
    inCurrentCombo: boolean;
    priceDelta: number | null;
    formatPrice: (n: number) => string;
    tabbable: boolean;
    onClick: () => void;
}) {
    const disabled = !available;
    const warn = available && !inCurrentCombo && !selected;
    const tooltipLabel = fullLabel && fullLabel !== value ? fullLabel : undefined;

    return (
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={
                disabled
                    ? `${fullLabel ?? value} – unavailable`
                    : priceDelta && priceDelta > 0
                        ? `${fullLabel ?? value}, ${formatPrice(priceDelta)} more`
                        : fullLabel ?? value
            }
            title={tooltipLabel}
            tabIndex={tabbable ? 0 : -1}
            disabled={disabled}
            onClick={onClick}
            className={cn(
                "relative shrink-0 inline-flex items-center gap-1.5",
                "h-9 px-3.5 rounded-lg text-[12px] font-medium",
                "border transition-all duration-150 select-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-1",
                // Selected — solid fill + glow ring, unmistakable
                selected && [
                    "border-foreground bg-foreground text-background pl-2.5",
                    "shadow-[0_0_0_3px_hsl(var(--foreground)/0.12)]",
                ],
                // Available, in combo
                !selected && !disabled && !warn && [
                    "border-border bg-background text-foreground",
                    "hover:border-foreground/50 hover:bg-muted/40 cursor-pointer",
                ],
                // Available but not in current combo — dashed border hint
                !selected && warn && [
                    "border-dashed border-border/70 bg-background text-muted-foreground",
                    "hover:border-foreground/40 hover:text-foreground cursor-pointer",
                ],
                // Disabled / out of stock
                disabled && [
                    "border-border/50 bg-muted/30 text-muted-foreground/50",
                    "cursor-not-allowed line-through decoration-muted-foreground/40",
                ],
            )}
        >
            {selected && (
                <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0 opacity-90">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )}
            <span className="whitespace-nowrap">{value}</span>

            {priceDelta !== null && priceDelta > 0 && (
                <span
                    className={cn(
                        "text-[10px] tabular-nums whitespace-nowrap",
                        selected ? "text-background/70" : "text-muted-foreground"
                    )}
                >
                    +{formatPrice(priceDelta)}
                </span>
            )}

            {/* Diagonal strikethrough for unavailable */}
            {disabled && (
                <span
                    aria-hidden
                    className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden rounded-lg"
                >
                    <span className="absolute w-[110%] h-px rotate-[-12deg] bg-muted-foreground/25" />
                </span>
            )}
        </button>
    );
}

// ─── Color swatch ─────────────────────────────────────────────────────────────

function ColorSwatch({
    value,
    imageUrl,
    selected,
    available,
    inCurrentCombo,
    tabbable,
    onClick,
}: {
    value: string;
    imageUrl: string | null;
    selected: boolean;
    available: boolean;
    inCurrentCombo: boolean;
    tabbable: boolean;
    onClick: () => void;
}) {
    const hex = imageUrl ? null : resolveColorHex(value);
    const light = hex ? isLightColor(hex) : false;
    const disabled = !available;
    const warn = available && !inCurrentCombo && !selected;

    return (
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={disabled ? `${value} – unavailable` : value}
            title={value}
            tabIndex={tabbable ? 0 : -1}
            disabled={disabled}
            onClick={onClick}
            className={cn(
                "relative h-8 w-8 rounded-full transition-all duration-150 overflow-hidden",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2",
                // Selected ring
                selected && "ring-2 ring-foreground ring-offset-2 scale-110",
                // Available, in combo
                !selected && !disabled && !warn && [
                    "ring-1 ring-border/60 hover:ring-foreground/50 hover:scale-105 cursor-pointer",
                ],
                // Available, warn (out of current combo)
                !selected && warn && [
                    "ring-1 ring-dashed ring-border/50 opacity-60",
                    "hover:ring-foreground/40 hover:opacity-90 hover:scale-105 cursor-pointer",
                ],
                // Disabled
                disabled && "opacity-35 cursor-not-allowed ring-1 ring-border/40",
            )}
            style={
                imageUrl
                    ? undefined
                    : hex
                        ? {
                            backgroundColor: hex,
                            boxShadow: light ? "inset 0 0 0 1px rgba(0,0,0,0.10)" : undefined,
                        }
                        : { background: "var(--muted)" }
            }
        >
            {imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                />
            )}

            {/* Initials fallback for unknown colors */}
            {!imageUrl && !hex && (
                <span
                    aria-hidden
                    className="absolute inset-0 flex items-center justify-center text-[8px] font-bold leading-none text-foreground bg-muted"
                >
                    {value.slice(0, 3).toUpperCase()}
                </span>
            )}

            {/* Selected checkmark */}
            {selected && (
                <span
                    aria-hidden
                    className="absolute inset-0 flex items-center justify-center"
                >
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                        <path
                            d="M2 5.5l2.5 2.5 4.5-4.5"
                            stroke={light ? "rgba(0,0,0,0.7)" : "white"}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </span>
            )}

            {/* Disabled strikethrough */}
            {disabled && (
                <span
                    aria-hidden
                    className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-full overflow-hidden"
                >
                    <span className="absolute w-full h-px rotate-45 bg-rose-400/70" />
                </span>
            )}
        </button>
    );
}

// ─── Stock badge ──────────────────────────────────────────────────────────────

export function VariantStockBadge({ quantity }: { quantity: number }) {
    if (quantity <= 0) {
        return (
            <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                Out of stock
            </p>
        );
    }
    if (quantity <= 5) {
        return (
            <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
                </span>
                Only {quantity} left in stock
            </p>
        );
    }
    return (
        <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
            In stock
        </p>
    );
}