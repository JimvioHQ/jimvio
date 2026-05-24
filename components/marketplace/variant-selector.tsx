
// "use client";

// import React, { useMemo, useRef, useCallback } from "react";
// import { cn } from "@/lib/utils";

// // ─── Shared type ─────────────────────────────────────────────────────────────

// export interface ProductVariant {
//     id: string;
//     name: string;
//     price: number;
//     compare_at_price?: number | null;
//     inventory_quantity: number;
//     image_url?: string | null;
//     options?: Record<string, unknown> | null;
//     is_active: boolean;
//     sku?: string | null;
// }

// interface VariantSelectorProps {
//     variants: ProductVariant[];
//     productName: string;
//     selectedVariantId: string | null;
//     onSelect: (variant: ProductVariant) => void;
//     /** Used to compute "+$X" deltas. Defaults to the cheapest variant. */
//     basePrice?: number;
//     /** Pass your existing currency formatter. */
//     formatPrice?: (n: number) => string;
// }

// // ─── Color resolution ────────────────────────────────────────────────────────

// const COLOR_MAP: Record<string, string> = {
//     black: "#18181b", white: "#f4f4f5", red: "#ef4444", blue: "#3b82f6",
//     green: "#22c55e", yellow: "#eab308", orange: "#f97316", purple: "#a855f7",
//     pink: "#ec4899", gray: "#71717a", grey: "#71717a", navy: "#1e3a5f",
//     brown: "#92400e", beige: "#d4b896", gold: "#f59e0b", silver: "#94a3b8",
//     teal: "#14b8a6", cyan: "#06b6d4", indigo: "#6366f1", violet: "#8b5cf6",
//     rose: "#f43f5e", lime: "#84cc16", emerald: "#10b981", coral: "#ff6b6b",
//     mint: "#98d8c8", maroon: "#800000", burgundy: "#800020", turquoise: "#40e0d0",
//     lavender: "#e6e6fa", charcoal: "#36454f", ivory: "#fffff0", tan: "#d2b48c",
//     "light blue": "#93c5fd", "light green": "#86efac", "light pink": "#fbcfe8",
//     "milk tea": "#c8a882", "sky blue": "#87ceeb", "dark blue": "#1e3a8a",
//     "dark green": "#14532d", "dark red": "#7f1d1d", "rose gold": "#b76e79",
//     "space gray": "#4a4a4f", "olive green": "#556b2f",
// };

// const MULTI_WORD_COLORS = Object.keys(COLOR_MAP).filter((k) => k.includes(" "));

// /** Exact-only match for token-by-token parsing. False positives here corrupt axis detection. */
// function exactColorMatch(token: string): string | null {
//     const lower = token.toLowerCase().trim();
//     if (COLOR_MAP[lower]) return COLOR_MAP[lower];
//     if (/^#[0-9a-f]{3,8}$/i.test(lower)) return lower;
//     return null;
// }

// /** Word-boundary match for resolving a color label to a swatch hex. */
// function resolveColorLabel(label: string): string | null {
//     const lower = label.toLowerCase().trim();
//     if (COLOR_MAP[lower]) return COLOR_MAP[lower];
//     if (/^#[0-9a-f]{3,8}$/i.test(lower)) return lower;
//     for (const [key, hex] of Object.entries(COLOR_MAP)) {
//         if (new RegExp(`\\b${key.replace(/\s/g, "\\s+")}\\b`, "i").test(label)) return hex;
//     }
//     return null;
// }

// // ─── Parsing ─────────────────────────────────────────────────────────────────

// interface ParsedVariant extends ProductVariant {
//     axes: Record<string, string>;
//     suffix: string;
// }

// function commonPrefixLength(names: string[]): number {
//     if (names.length < 2) return 0;
//     const split = names.map((n) => n.split(/\s+/));
//     let len = split[0].length;
//     for (let i = 1; i < split.length; i++) {
//         let j = 0;
//         while (j < len && j < split[i].length
//             && split[0][j].toLowerCase() === split[i][j].toLowerCase()) j++;
//         len = j;
//     }
//     return len;
// }

// function parseCJSuffix(suffix: string): Record<string, string> {
//     if (!suffix) return {};
//     const lower = suffix.toLowerCase();
//     const axes: Record<string, string> = {};

//     let colorToken: string | null = null;
//     let remaining = suffix;

//     // 1. Multi-word colors with word boundaries
//     for (const mc of MULTI_WORD_COLORS) {
//         const re = new RegExp(`\\b${mc.replace(/\s/g, "\\s+")}\\b`, "i");
//         const m = lower.match(re);
//         if (m && m.index !== undefined) {
//             colorToken = mc.replace(/\b\w/g, (c) => c.toUpperCase());
//             remaining = (suffix.slice(0, m.index) + suffix.slice(m.index + m[0].length)).trim();
//             break;
//         }
//     }

//     // 2. Token-by-token — exact color match only
//     const tokens = remaining.split(/[\s\-_/]+/).filter(Boolean);
//     const modeTokens: string[] = [];
//     for (const token of tokens) {
//         if (!colorToken && exactColorMatch(token)) colorToken = token;
//         else modeTokens.push(token);
//     }

//     if (modeTokens.length > 0) axes["Mode"] = modeTokens.join(" ");
//     if (colorToken) axes["Color"] = colorToken;
//     return axes;
// }

// function sanitizeOptions(opts: Record<string, unknown> | null | undefined): Record<string, string> | null {
//     if (!opts || typeof opts !== "object" || Array.isArray(opts)) return null;
//     const out: Record<string, string> = {};
//     for (const [k, v] of Object.entries(opts)) {
//         if (k === "variant_key") continue;
//         if (typeof v !== "string") continue;
//         const trimmed = v.trim();
//         if (!trimmed || trimmed === "[]" || trimmed === "{}") continue;
//         out[k] = trimmed;
//     }
//     return Object.keys(out).length > 0 ? out : null;
// }

// function parseVariants(variants: ProductVariant[]): ParsedVariant[] {
//     const active = variants.filter((v) => v.is_active);
//     if (active.length === 0) return [];
//     if (active.length === 1) return active.map((v) => ({ ...v, axes: {}, suffix: "" }));

//     const prefixLen = commonPrefixLength(active.map((v) => v.name ?? ""));

//     return active.map((v) => {
//         const words = (v.name ?? "").split(/\s+/);
//         const suffix = words.slice(prefixLen).join(" ").trim();
//         const realOptions = sanitizeOptions(v.options as Record<string, unknown>);
//         const axes = realOptions ?? parseCJSuffix(suffix);
//         return { ...v, axes, suffix };
//     });
// }

// // ─── Main component ──────────────────────────────────────────────────────────

// export function VariantSelector({
//     variants,
//     selectedVariantId,
//     onSelect,
//     basePrice,
//     formatPrice = (n) => `$${n.toFixed(2)}`,
// }: VariantSelectorProps) {
//     const parsed = useMemo(() => parseVariants(variants), [variants]);

//     const axisKeys = useMemo(() => {
//         const priority = ["Color", "Size", "Material", "Style", "Mode"];
//         const seen = new Set<string>();
//         const keys: string[] = [];
//         for (const p of priority) {
//             if (parsed.some((v) => p in v.axes)) { seen.add(p); keys.push(p); }
//         }
//         for (const v of parsed) for (const k of Object.keys(v.axes)) {
//             if (!seen.has(k)) { seen.add(k); keys.push(k); }
//         }
//         return keys;
//     }, [parsed]);

//     const selectedVariant = parsed.find((v) => v.id === selectedVariantId) ?? null;
//     const currentSelections = selectedVariant?.axes ?? {};

//     const axisValues = useMemo(() => {
//         const map: Record<string, string[]> = {};
//         for (const key of axisKeys) {
//             const seen = new Set<string>();
//             for (const v of parsed) {
//                 const val = v.axes[key];
//                 if (val && !seen.has(val)) { seen.add(val); (map[key] ??= []).push(val); }
//             }
//         }
//         return map;
//     }, [axisKeys, parsed]);

//     /** Returns `available` (in stock anywhere) and `inCurrentCombo` (in stock with other axes locked). */
//     const optionState = useCallback((key: string, value: string) => {
//         const matches = parsed.filter((v) => v.axes[key] === value);
//         const available = matches.some((v) => v.inventory_quantity > 0);
//         const inCurrentCombo = matches.some((v) =>
//             v.inventory_quantity > 0 &&
//             Object.entries(currentSelections)
//                 .filter(([k]) => k !== key)
//                 .every(([k, val]) => v.axes[k] === val)
//         );
//         return { available, inCurrentCombo };
//     }, [parsed, currentSelections]);

//     const findVariantFor = useCallback((selections: Record<string, string>, axisChanged: string) => {
//         const exact = parsed.find((v) =>
//             Object.entries(selections).every(([k, val]) => v.axes[k] === val)
//         );
//         if (exact) return exact;
//         const sameAxis = parsed.filter((v) => v.axes[axisChanged] === selections[axisChanged]);
//         const otherKeys = Object.keys(selections).filter((k) => k !== axisChanged);
//         return (
//             sameAxis.find((v) => v.inventory_quantity > 0 &&
//                 otherKeys.every((k) => v.axes[k] === selections[k])) ??
//             sameAxis.find((v) => v.inventory_quantity > 0) ??
//             sameAxis[0] ?? null
//         );
//     }, [parsed]);

//     const handleOptionClick = useCallback((key: string, value: string) => {
//         if (currentSelections[key] === value) return; // no-op
//         const next = { ...currentSelections, [key]: value };
//         const match = findVariantFor(next, key);
//         if (match) onSelect(match);
//     }, [currentSelections, findVariantFor, onSelect]);

//     // ── Min price across variants → used for "+$X" deltas ───────────────────
//     const minPrice = useMemo(() => {
//         if (basePrice !== undefined) return basePrice;
//         return parsed.reduce((m, v) => Math.min(m, v.price), Infinity);
//     }, [basePrice, parsed]);

//     const hasPriceVariation = useMemo(() => {
//         if (parsed.length < 2) return false;
//         return new Set(parsed.map((v) => v.price)).size > 1;
//     }, [parsed]);

//     const minPriceForValue = useCallback((key: string, value: string): number | null => {
//         const matches = parsed.filter((v) => v.axes[key] === value);
//         if (matches.length === 0) return null;
//         return matches.reduce((m, v) => Math.min(m, v.price), Infinity);
//     }, [parsed]);

//     // ── Keyboard nav within each axis ───────────────────────────────────────
//     const groupRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
//     const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>, key: string) => {
//         if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) return;
//         const group = groupRefs.current.get(key);
//         if (!group) return;
//         const buttons = Array.from(group.querySelectorAll<HTMLButtonElement>("button:not([disabled])"));
//         const idx = buttons.findIndex((b) => b === document.activeElement);
//         if (idx === -1) return;
//         e.preventDefault();
//         let next = idx;
//         if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (idx + 1) % buttons.length;
//         if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (idx - 1 + buttons.length) % buttons.length;
//         if (e.key === "Home") next = 0;
//         if (e.key === "End") next = buttons.length - 1;
//         buttons[next]?.focus();
//     }, []);

//     // ── Flat fallback (no axes detectable) ──────────────────────────────────
//     if (axisKeys.length === 0) {
//         if (parsed.length <= 1) return null;
//         return (
//             <div role="radiogroup" aria-label="Variant">
//                 <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
//                     Variant
//                 </p>
//                 <div className="flex flex-wrap gap-2">
//                     {parsed.map((v, i) => (
//                         <OptionButton
//                             key={v.id}
//                             value={v.suffix || v.name}
//                             selected={v.id === selectedVariantId}
//                             available={v.inventory_quantity > 0}
//                             inCurrentCombo
//                             priceDelta={hasPriceVariation ? v.price - minPrice : null}
//                             formatPrice={formatPrice}
//                             tabbable={selectedVariantId ? v.id === selectedVariantId : i === 0}
//                             onClick={() => onSelect(v)}
//                         />
//                     ))}
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div className="space-y-4">
//             {axisKeys.map((key) => {
//                 const values = axisValues[key] ?? [];
//                 const currentVal = currentSelections[key];
//                 const isColorAxis = key === "Color";
//                 const tabbableIdx = currentVal
//                     ? values.findIndex((v) => v === currentVal)
//                     : 0;

//                 return (
//                     <div
//                         key={key}
//                         role="radiogroup"
//                         aria-label={key}
//                         onKeyDown={(e) => handleKeyDown(e, key)}
//                         ref={(el) => {
//                             groupRefs.current.set(key, el);
//                             return () => { groupRefs.current.delete(key); };
//                         }}
//                     >
//                         <div className="flex items-center gap-2 mb-2">
//                             <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
//                                 {key}
//                             </span>
//                             {currentVal && (
//                                 <span className="text-[11px] font-medium text-[var(--color-text-primary)]">
//                                     — {currentVal}
//                                 </span>
//                             )}
//                         </div>

//                         <div className="flex flex-wrap gap-2">
//                             {values.map((val, idx) => {
//                                 const selected = currentVal === val;
//                                 const { available, inCurrentCombo } = optionState(key, val);
//                                 const valMin = minPriceForValue(key, val);
//                                 const priceDelta = hasPriceVariation && valMin !== null
//                                     ? valMin - minPrice
//                                     : null;
//                                 const imageForVal = parsed.find(
//                                     (v) => v.axes[key] === val && v.image_url
//                                 )?.image_url ?? null;
//                                 const tabbable = idx === tabbableIdx;

//                                 return isColorAxis ? (
//                                     <ColorSwatch
//                                         key={val}
//                                         value={val}
//                                         imageUrl={imageForVal}
//                                         selected={selected}
//                                         available={available}
//                                         inCurrentCombo={inCurrentCombo}
//                                         tabbable={tabbable}
//                                         onClick={() => handleOptionClick(key, val)}
//                                     />
//                                 ) : (
//                                     <OptionButton
//                                         key={val}
//                                         value={val}
//                                         selected={selected}
//                                         available={available}
//                                         inCurrentCombo={inCurrentCombo}
//                                         priceDelta={priceDelta}
//                                         formatPrice={formatPrice}
//                                         tabbable={tabbable}
//                                         onClick={() => handleOptionClick(key, val)}
//                                     />
//                                 );
//                             })}
//                         </div>
//                     </div>
//                 );
//             })}

//             {selectedVariant && (
//                 <VariantStockBadge quantity={selectedVariant.inventory_quantity} />
//             )}
//         </div>
//     );
// }

// // ─── Option button ───────────────────────────────────────────────────────────

// function OptionButton({
//     value, selected, available, inCurrentCombo, priceDelta, formatPrice, tabbable, onClick,
// }: {
//     value: string;
//     selected: boolean;
//     available: boolean;
//     inCurrentCombo: boolean;
//     priceDelta: number | null;
//     formatPrice: (n: number) => string;
//     tabbable: boolean;
//     onClick: () => void;
// }) {
//     const reallyDisabled = !available;
//     const warn = available && !inCurrentCombo && !selected;

//     return (
//         <button
//             type="button"
//             role="radio"
//             aria-checked={selected}
//             tabIndex={tabbable ? 0 : -1}
//             onClick={onClick}
//             disabled={reallyDisabled}
//             aria-label={priceDelta && priceDelta > 0
//                 ? `${value}, ${formatPrice(priceDelta)} more`
//                 : value}
//             className={cn(
//                 "relative px-3.5 py-2 rounded-lg text-[12px] font-semibold border transition-all duration-150 inline-flex items-center gap-1.5",
//                 "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-1",
//                 selected
//                     ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white shadow-sm"
//                     : reallyDisabled
//                         ? "border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] cursor-not-allowed opacity-50"
//                         : warn
//                             ? "border-dashed border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]"
//                             : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
//             )}
//         >
//             <span>{value}</span>
//             {priceDelta !== null && priceDelta > 0 && (
//                 <span className={cn(
//                     "text-[10px] font-medium tabular-nums",
//                     selected ? "text-white/80" : "text-[var(--color-text-muted)]"
//                 )}>
//                     +{formatPrice(priceDelta)}
//                 </span>
//             )}
//             {reallyDisabled && (
//                 <span className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
//                     <span className="absolute w-[90%] h-px rotate-[-15deg] bg-current opacity-40" />
//                 </span>
//             )}
//         </button>
//     );
// }

// // ─── Color swatch ────────────────────────────────────────────────────────────

// function ColorSwatch({
//     value, imageUrl, selected, available, inCurrentCombo, tabbable, onClick,
// }: {
//     value: string;
//     imageUrl: string | null;
//     selected: boolean;
//     available: boolean;
//     inCurrentCombo: boolean;
//     tabbable: boolean;
//     onClick: () => void;
// }) {
//     const hex = !imageUrl ? resolveColorLabel(value) : null;
//     const isLight = hex ? isLightColor(hex) : false;
//     const reallyDisabled = !available;
//     const warn = available && !inCurrentCombo && !selected;

//     return (
//         <button
//             type="button"
//             role="radio"
//             aria-checked={selected}
//             aria-label={value}
//             title={value}
//             tabIndex={tabbable ? 0 : -1}
//             onClick={onClick}
//             disabled={reallyDisabled}
//             className={cn(
//                 "relative h-10 w-10 rounded-full transition-all duration-150 flex items-center justify-center overflow-hidden",
//                 "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2",
//                 selected
//                     ? "ring-2 ring-[var(--color-accent)] ring-offset-2 ring-offset-[var(--color-bg)] scale-110"
//                     : reallyDisabled
//                         ? "opacity-40 cursor-not-allowed ring-1 ring-[var(--color-border)]"
//                         : warn
//                             ? "ring-1 ring-dashed ring-[var(--color-border)] hover:ring-[var(--color-accent)] hover:scale-105"
//                             : "ring-1 ring-[var(--color-border)] hover:ring-[var(--color-accent)] hover:scale-105"
//             )}
//             style={
//                 !imageUrl && hex
//                     ? { backgroundColor: hex, boxShadow: isLight ? "inset 0 0 0 1px rgba(0,0,0,0.08)" : undefined }
//                     : !imageUrl
//                         ? { background: "var(--color-surface-secondary)" }
//                         : undefined
//             }
//         >
//             {imageUrl && (
//                 // eslint-disable-next-line @next/next/no-img-element
//                 <img
//                     src={imageUrl}
//                     alt=""
//                     className="h-full w-full object-cover"
//                     loading="lazy"
//                     decoding="async"
//                 />
//             )}
//             {!imageUrl && !hex && (
//                 <span className="text-[9px] font-bold text-[var(--color-text-primary)]">
//                     {value.slice(0, 2).toUpperCase()}
//                 </span>
//             )}
//             {reallyDisabled && (
//                 <span className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-full overflow-hidden" aria-hidden>
//                     <span className="absolute w-full h-px rotate-45 bg-rose-400 opacity-70" />
//                 </span>
//             )}
//         </button>
//     );
// }

// function isLightColor(hex: string): boolean {
//     if (hex.length < 7) return false;
//     const r = parseInt(hex.slice(1, 3), 16);
//     const g = parseInt(hex.slice(3, 5), 16);
//     const b = parseInt(hex.slice(5, 7), 16);
//     return (r * 299 + g * 587 + b * 114) / 1000 > 180;
// }

// // ─── Stock badge ─────────────────────────────────────────────────────────────

// export function VariantStockBadge({ quantity }: { quantity: number }) {
//     if (quantity <= 0) {
//         return (
//             <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1.5">
//                 <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
//                 Out of stock
//             </p>
//         );
//     }
//     if (quantity <= 5) {
//         return (
//             <p className="text-[11px] font-semibold text-amber-500 flex items-center gap-1.5">
//                 <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
//                 Only {quantity} left
//             </p>
//         );
//     }
//     return (
//         <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
//             <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
//             In stock
//         </p>
//     );
// }

"use client";

import React, { useMemo, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductVariant {
    id: string;
    name: string;
    price: number;
    compare_at_price?: number | null;
    inventory_quantity: number;
    image_url?: string | null;
    /**
     * Structured axis map, e.g. { Color: "Black", Size: "XL" }.
     * When provided, the heuristic parser is skipped entirely.
     */
    options?: Record<string, string> | null;
    is_active: boolean;
    sku?: string | null;
}

interface VariantSelectorProps {
    variants: ProductVariant[];
    selectedVariantId: string | null;
    onSelect: (variant: ProductVariant) => void;
    /** Overrides the computed minimum price for delta display. */
    basePrice?: number;
    /** Pass your own currency formatter. Defaults to plain USD. */
    formatPrice?: (n: number) => string;
    /** Max option buttons shown before collapsing into a scroll area. */
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
    // Word-boundary scan for multi-word entries
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

// ─── Structured-data extraction (no heuristics) ───────────────────────────────

/**
 * Sanitizes v.options into a clean string map.
 * Returns null if options are absent, empty, or non-string-valued.
 */
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

interface ParsedVariant extends ProductVariant {
    axes: Record<string, string>;
    /** True when axes came from structured data, false = name-derived fallback. */
    axesReliable: boolean;
}

function parseVariants(variants: ProductVariant[]): ParsedVariant[] {
    const active = variants.filter((v) => v.is_active);

    return active.map((v) => {
        const structured = extractOptions(v.options);

        if (structured) {
            return { ...v, axes: structured, axesReliable: true };
        }

        // ── Name-derived fallback ──────────────────────────────────────────────
        // We do NOT try to parse Color / Mode from free text here.
        // Instead we expose the whole suffix as a single "Variant" label,
        // so the caller sees flat buttons rather than misclassified swatches.
        if (process.env.NODE_ENV === "development") {
            console.warn(
                `[VariantSelector] Variant "${v.name}" (id: ${v.id}) has no structured options. ` +
                `Falling back to flat variant display. ` +
                `Fix by populating the "options" field with { Color: "...", Size: "...", ... }.`
            );
        }

        return { ...v, axes: {}, axesReliable: false };
    });
}

// ─── Availability map ─────────────────────────────────────────────────────────

interface OptionAvailability {
    available: boolean;   // in stock in at least one variant
    inCombo: boolean;     // in stock with the current selections on other axes
}

function buildAvailabilityMap(
    parsed: ParsedVariant[],
    currentSelections: Record<string, string>
): Record<string, Record<string, OptionAvailability>> {
    const map: Record<string, Record<string, OptionAvailability>> = {};

    // Collect all axis keys + values
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
            const available = matches.some((v) => v.inventory_quantity > 0);
            const inCombo = matches.some(
                (v) =>
                    v.inventory_quantity > 0 &&
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
    // 1. Exact match across all axes
    const exact = parsed.find((v) =>
        Object.entries(selections).every(([k, val]) => v.axes[k] === val)
    );
    if (exact) return exact;

    // 2. Same changed axis, in-stock, other axes preserved
    const sameAxis = parsed.filter((v) => v.axes[changedKey] === selections[changedKey]);
    const otherKeys = Object.keys(selections).filter((k) => k !== changedKey);
    return (
        sameAxis.find(
            (v) =>
                v.inventory_quantity > 0 &&
                otherKeys.every((k) => v.axes[k] === selections[k])
        ) ??
        sameAxis.find((v) => v.inventory_quantity > 0) ??
        sameAxis[0] ??
        null
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

const AXIS_PRIORITY = ["Color", "Size", "Material", "Style", "Storage", "Mode"];

export function VariantSelector({
    variants,
    selectedVariantId,
    onSelect,
    basePrice,
    formatPrice = (n) => `$${n.toFixed(2)}`,
    maxVisibleOptions = 8,
}: VariantSelectorProps) {
    const parsed = useMemo(() => parseVariants(variants), [variants]);

    // ── Derive ordered axis keys ─────────────────────────────────────────────
    const axisKeys = useMemo(() => {
        const seen = new Set<string>();
        const keys: string[] = [];
        for (const p of AXIS_PRIORITY) {
            if (parsed.some((v) => p in v.axes)) {
                seen.add(p);
                keys.push(p);
            }
        }
        for (const v of parsed) {
            for (const k of Object.keys(v.axes)) {
                if (!seen.has(k)) {
                    seen.add(k);
                    keys.push(k);
                }
            }
        }
        return keys;
    }, [parsed]);

    const selectedVariant = parsed.find((v) => v.id === selectedVariantId) ?? null;
    const currentSelections = selectedVariant?.axes ?? {};

    // ── Availability map (memoized, not recomputed per-button) ───────────────
    const availabilityMap = useMemo(
        () => buildAvailabilityMap(parsed, currentSelections),
        [parsed, currentSelections]
    );

    // ── Axis values ──────────────────────────────────────────────────────────
    const axisValues = useMemo(() => {
        const map: Record<string, string[]> = {};
        for (const key of axisKeys) {
            const seen = new Set<string>();
            for (const v of parsed) {
                const val = v.axes[key];
                if (val && !seen.has(val)) {
                    seen.add(val);
                    (map[key] ??= []).push(val);
                }
            }
        }
        return map;
    }, [axisKeys, parsed]);

    // ── Price delta helpers ──────────────────────────────────────────────────
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

    // ── Click handler ────────────────────────────────────────────────────────
    const handleOptionClick = useCallback(
        (key: string, value: string) => {
            if (!availabilityMap[key]?.[value]?.available) return; // guard disabled
            if (currentSelections[key] === value) return;           // guard same
            const next = { ...currentSelections, [key]: value };
            const match = resolveVariant(parsed, next, key);
            if (match) onSelect(match);
        },
        [availabilityMap, currentSelections, parsed, onSelect]
    );

    // ── Keyboard nav ─────────────────────────────────────────────────────────
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
            let next =
                e.key === "ArrowRight" || e.key === "ArrowDown" ? (idx + 1) % buttons.length :
                    e.key === "ArrowLeft" || e.key === "ArrowUp" ? (idx - 1 + buttons.length) % buttons.length :
                        e.key === "Home" ? 0 : last;
            buttons[next]?.focus();
        },
        []
    );

    // ── Flat fallback (no structured axes) ───────────────────────────────────
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
                        {/* Axis label */}
                        <div className="flex items-baseline gap-2 mb-2.5">
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                                {key}
                            </span>
                            {currentVal && (
                                <span className="text-[11px] font-medium text-[var(--color-text-primary)]">
                                    {currentVal}
                                </span>
                            )}
                        </div>

                        {/* Option row — scroll instead of wrap when overflow */}
                        <div
                            role="radiogroup"
                            aria-label={key}
                            ref={(el) => { groupRefs.current.set(key, el); }}
                            onKeyDown={(e) => handleKeyDown(e, key)}
                            className={cn(
                                "flex gap-2",
                                isColorAxis
                                    ? "flex-wrap"                                   // swatches: wrap naturally
                                    : values.length > maxVisibleOptions
                                        ? "overflow-x-auto pb-1 scrollbar-thin"       // many options: scroll row
                                        : "flex-wrap"                                  // few options: wrap
                            )}
                        >
                            {values.map((val, idx) => {
                                const selected = currentVal === val;
                                const avail = availabilityMap[key]?.[val] ?? { available: false, inCombo: false };
                                const valMinPrice = minPriceForAxisValue(key, val);
                                const priceDelta =
                                    hasPriceVariation && valMinPrice !== null ? valMinPrice - minPrice : null;
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

// ─── Flat variant group (no structured axes) ──────────────────────────────────

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

    return (
        <div role="radiogroup" aria-label="Variant">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-2.5">
                Variant
            </p>
            {/* Scroll row when there are many flat variants */}
            <div
                className={cn(
                    "flex gap-2",
                    parsed.length > maxVisible
                        ? "overflow-x-auto pb-1 scrollbar-thin"
                        : "flex-wrap"
                )}
            >
                {parsed.map((v, i) => (
                    <OptionButton
                        key={v.id}
                        value={v.name}
                        selected={v.id === selectedVariantId}
                        available={v.inventory_quantity > 0}
                        inCurrentCombo
                        priceDelta={hasPriceVariation ? v.price - minPrice : null}
                        formatPrice={formatPrice}
                        tabbable={i === tabbableIdx}
                        onClick={() => onSelect(v)}
                    />
                ))}
            </div>
        </div>
    );
}

// ─── Option button ────────────────────────────────────────────────────────────

function OptionButton({
    value,
    selected,
    available,
    inCurrentCombo,
    priceDelta,
    formatPrice,
    tabbable,
    onClick,
}: {
    value: string;
    selected: boolean;
    available: boolean;
    inCurrentCombo: boolean;
    priceDelta: number | null;
    formatPrice: (n: number) => string;
    tabbable: boolean;
    onClick: () => void;
}) {
    const disabled = !available;
    // Warn = exists in some combo but not the current one
    const warn = available && !inCurrentCombo && !selected;

    return (
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={
                priceDelta && priceDelta > 0
                    ? `${value}, ${formatPrice(priceDelta)} more`
                    : value
            }
            tabIndex={tabbable ? 0 : -1}
            disabled={disabled}
            onClick={onClick}
            className={cn(
                // Layout — shrink-0 prevents the button from squishing in scroll rows
                "relative shrink-0 inline-flex items-center gap-1.5",
                "px-3.5 py-2 rounded-lg text-[12px] font-semibold",
                "border transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-1",
                selected
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white shadow-sm"
                    : disabled
                        ? "border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] cursor-not-allowed opacity-50"
                        : warn
                            ? "border-dashed border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]"
                            : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            )}
        >
            <span className="whitespace-nowrap">{value}</span>

            {priceDelta !== null && priceDelta > 0 && (
                <span
                    className={cn(
                        "text-[10px] font-medium tabular-nums whitespace-nowrap",
                        selected ? "text-white/80" : "text-[var(--color-text-muted)]"
                    )}
                >
                    +{formatPrice(priceDelta)}
                </span>
            )}

            {/* Strikethrough overlay for disabled */}
            {disabled && (
                <span
                    aria-hidden
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                    <span className="absolute w-[90%] h-px rotate-[-15deg] bg-current opacity-40" />
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
            aria-label={value}
            title={value}
            tabIndex={tabbable ? 0 : -1}
            disabled={disabled}
            onClick={onClick}
            className={cn(
                "relative h-8 w-8 rounded-full transition-all duration-150 overflow-hidden",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2",
                selected
                    ? "ring-2 ring-[var(--color-accent)] ring-offset-2 ring-offset-[var(--color-bg)] scale-110"
                    : disabled
                        ? "opacity-40 cursor-not-allowed ring-1 ring-[var(--color-border)]"
                        : warn
                            ? "ring-1 ring-dashed ring-[var(--color-border)] hover:ring-[var(--color-accent)] hover:scale-105"
                            : "ring-1 ring-[var(--color-border)] hover:ring-[var(--color-accent)] hover:scale-105"
            )}
            style={
                imageUrl
                    ? undefined
                    : hex
                        ? {
                            backgroundColor: hex,
                            boxShadow: light ? "inset 0 0 0 1px rgba(0,0,0,0.10)" : undefined,
                        }
                        : { background: "var(--color-surface-secondary)" }
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

            {/* Unknown color — show initials as last resort, full name in title */}
            {!imageUrl && !hex && (
                <span
                    aria-hidden
                    className="absolute inset-0 flex items-center justify-center text-[8px] font-bold leading-none text-[var(--color-text-primary)] bg-[var(--color-surface-secondary)]"
                >
                    {value.slice(0, 3).toUpperCase()}
                </span>
            )}

            {disabled && (
                <span
                    aria-hidden
                    className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-full overflow-hidden"
                >
                    <span className="absolute w-full h-px rotate-45 bg-rose-400 opacity-70" />
                </span>
            )}
        </button>
    );
}

// ─── Stock badge ──────────────────────────────────────────────────────────────

export function VariantStockBadge({ quantity }: { quantity: number }) {
    if (quantity <= 0) {
        return (
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-500">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                Out of stock
            </p>
        );
    }
    if (quantity <= 5) {
        return (
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-500">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                Only {quantity} left
            </p>
        );
    }
    return (
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            In stock
        </p>
    );
}