"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

// ─── Shared type (import this in product-detail-physical + product-action-module) ──

export interface ProductVariant {
    id: string;
    name: string;
    price: number;
    compare_at_price?: number | null;
    inventory_quantity: number;
    image_url?: string | null;
    /** CJ always stores {"variant_key":"[]"} — treated as empty */
    options?: Record<string, string> | null;
    is_active: boolean;
    sku?: string | null;
}

interface VariantSelectorProps {
    variants: ProductVariant[];
    /** The full product name — used to strip the prefix from CJ variant names */
    productName: string;
    selectedVariantId: string | null;
    onSelect: (variant: ProductVariant) => void;
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
    "light blue": "#93c5fd", "light green": "#86efac", "milk tea": "#c8a882",
    "light pink": "#fbcfe8",
};

function resolveColor(token: string): string | null {
    const lower = token.toLowerCase().trim();
    // Exact match first
    if (COLOR_MAP[lower]) return COLOR_MAP[lower];
    // Substring match
    for (const [key, hex] of Object.entries(COLOR_MAP)) {
        if (lower.includes(key)) return hex;
    }
    if (/^#[0-9a-f]{3,8}$/i.test(lower)) return lower;
    return null;
}

// ─── CJ name parser ───────────────────────────────────────────────────────────
//
// CJ variant names look like:
//   "Wireless Bluetooth Vertical Mouse Rechargeable Black"
//   "Wireless Bluetooth Vertical Mouse Dual Mode White"
//   "Wireless Bluetooth Vertical Mouse Dual Mode Light Blue"
//
// Strategy:
//   1. Strip the product name prefix (longest common prefix across all variants)
//   2. What remains is the "suffix" — e.g. "Rechargeable Black", "Dual Mode Light Blue"
//   3. Identify known multi-word color tokens first (light blue, light green, milk tea…)
//   4. Split remaining tokens into non-color (Mode) and color (Color) axes

const MULTI_WORD_COLORS = [
    "light blue", "light green", "light pink", "milk tea", "sky blue",
    "dark blue", "dark green", "dark red", "dark gray", "dark grey",
    "rose gold", "space gray", "olive green",
];

interface ParsedVariant extends ProductVariant {
    axes: Record<string, string>;
    /** Suffix after stripping product name prefix */
    suffix: string;
}

function commonPrefixLength(names: string[]): number {
    if (names.length === 0) return 0;
    const first = names[0].split(" ");
    let len = first.length;
    for (const name of names.slice(1)) {
        const parts = name.split(" ");
        let i = 0;
        while (i < len && i < parts.length && first[i].toLowerCase() === parts[i].toLowerCase()) i++;
        len = i;
    }
    return len;
}

function parseCJSuffix(suffix: string): Record<string, string> {
    if (!suffix) return {};

    const lower = suffix.toLowerCase();
    const axes: Record<string, string> = {};

    // 1. Extract multi-word color tokens
    let colorToken: string | null = null;
    let remaining = suffix;

    for (const mc of MULTI_WORD_COLORS) {
        const idx = lower.indexOf(mc);
        if (idx !== -1) {
            // Capitalise each word
            colorToken = mc.replace(/\b\w/g, (c) => c.toUpperCase());
            remaining = (suffix.slice(0, idx) + suffix.slice(idx + mc.length)).trim();
            break;
        }
    }

    // 2. Split remainder into tokens
    const tokens = remaining.split(/\s+/).filter(Boolean);

    const modeTokens: string[] = [];

    for (const token of tokens) {
        if (!colorToken && resolveColor(token)) {
            colorToken = token;
        } else {
            modeTokens.push(token);
        }
    }

    if (modeTokens.length > 0) axes["Mode"] = modeTokens.join(" ");
    if (colorToken) axes["Color"] = colorToken;

    return axes;
}

function parseVariants(variants: ProductVariant[], productName: string): ParsedVariant[] {
    const active = variants.filter((v) => v.is_active);
    if (active.length === 0) return [];

    // Detect common prefix length across all variant names
    const names = active.map((v) => v.name ?? "");
    const prefixLen = commonPrefixLength(names);

    return active.map((v) => {
        const words = (v.name ?? "").split(" ");
        const suffix = words.slice(prefixLen).join(" ").trim();

        // Try options JSONB (only if it has real keys — not "variant_key")
        const opts = v.options;
        const hasRealOptions =
            opts &&
            typeof opts === "object" &&
            !Array.isArray(opts) &&
            Object.keys(opts).some(
                (k) => k !== "variant_key" && opts[k] && opts[k] !== "[]"
            );

        const axes = hasRealOptions
            ? (opts as Record<string, string>)
            : parseCJSuffix(suffix);

        return { ...v, axes, suffix };
    });
}

// ─── VariantSelector ──────────────────────────────────────────────────────────

export function VariantSelector({
    variants,
    productName,
    selectedVariantId,
    onSelect,
}: VariantSelectorProps) {
    const parsed = useMemo(
        () => parseVariants(variants, productName),
        [variants, productName]
    );

    // Collect axis keys in stable order (Mode before Color if both present)
    const axisKeys = useMemo(() => {
        const priority = ["Mode", "Color", "Size", "Material"];
        const seen = new Set<string>();
        const keys: string[] = [];

        // Priority axes first
        for (const p of priority) {
            if (parsed.some((v) => p in v.axes)) {
                seen.add(p);
                keys.push(p);
            }
        }
        // Any remaining axes
        parsed.forEach((v) =>
            Object.keys(v.axes).forEach((k) => {
                if (!seen.has(k)) { seen.add(k); keys.push(k); }
            })
        );
        return keys;
    }, [parsed]);

    const selectedVariant = parsed.find((v) => v.id === selectedVariantId) ?? null;
    const currentSelections: Record<string, string> = selectedVariant?.axes ?? {};

    // Unique values per axis, preserving insertion order
    const axisValues = useMemo(() => {
        const map: Record<string, string[]> = {};
        axisKeys.forEach((key) => {
            const seen = new Set<string>();
            parsed.forEach((v) => {
                const val = v.axes[key];
                if (val && !seen.has(val)) { seen.add(val); (map[key] ??= []).push(val); }
            });
        });
        return map;
    }, [axisKeys, parsed]);

    function handleOptionClick(key: string, value: string) {
        const next = { ...currentSelections, [key]: value };

        // Exact match across all selected axes
        let match = parsed.find((v) =>
            Object.entries(next).every(([k, val]) => v.axes[k] === val)
        );
        // Best partial match — at least the clicked axis, prefer in-stock
        if (!match) {
            match =
                parsed.find((v) => v.axes[key] === value && v.inventory_quantity > 0) ??
                parsed.find((v) => v.axes[key] === value);
        }
        if (match) onSelect(match);
    }

    function isAvailable(key: string, value: string): boolean {
        const partial = { ...currentSelections, [key]: value };
        return parsed.some(
            (v) =>
                v.inventory_quantity > 0 &&
                Object.entries(partial).every(([k, val]) => v.axes[k] === val)
        );
    }

    // Flat fallback: no axes parsed (shouldn't happen with real CJ data)
    if (axisKeys.length === 0) {
        if (parsed.length <= 1) return null;
        return (
            <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
                    Variant
                </p>
                <div className="flex flex-wrap gap-2">
                    {parsed.map((v) => (
                        <OptionButton
                            key={v.id}
                            value={v.suffix || v.name}
                            selected={v.id === selectedVariantId}
                            available={v.inventory_quantity > 0}
                            onClick={() => onSelect(v)}
                        />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {axisKeys.map((key) => {
                const values = axisValues[key] ?? [];
                const currentVal = currentSelections[key];
                const isColorAxis = key === "Color";

                return (
                    <div key={key}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                                {key}
                            </span>
                            {currentVal && (
                                <span className="text-[11px] font-medium text-[var(--color-text-primary)]">
                                    — {currentVal}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {values.map((val) => {
                                const selected = currentVal === val;
                                const available = isAvailable(key, val);

                                return isColorAxis ? (
                                    <ColorSwatch
                                        key={val}
                                        value={val}
                                        selected={selected}
                                        available={available}
                                        onClick={() => handleOptionClick(key, val)}
                                    />
                                ) : (
                                    <OptionButton
                                        key={val}
                                        value={val}
                                        selected={selected}
                                        available={available}
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

// ─── Option button ────────────────────────────────────────────────────────────

function OptionButton({
    value, selected, available, onClick,
}: {
    value: string; selected: boolean; available: boolean; onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!available}
            className={cn(
                "relative px-3.5 py-2 rounded-lg text-[12px] font-semibold border transition-all duration-150",
                selected
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white shadow-sm"
                    : available
                        ? "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] cursor-not-allowed opacity-50"
            )}
        >
            {value}
            {!available && (
                <span className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
                    <span className="absolute w-full h-px rotate-[-20deg] opacity-30" style={{ background: "var(--color-text-muted)" }} />
                </span>
            )}
        </button>
    );
}

// ─── Color swatch ─────────────────────────────────────────────────────────────

function ColorSwatch({
    value, selected, available, onClick,
}: {
    value: string; selected: boolean; available: boolean; onClick: () => void;
}) {
    const hex = resolveColor(value);
    const isLight = hex ? isLightColor(hex) : false;

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!available}
            title={value}
            aria-label={value}
            className={cn(
                "relative h-9 w-9 rounded-full border-2 transition-all duration-150 flex items-center justify-center",
                selected
                    ? "border-[var(--color-accent)] scale-110 shadow-md"
                    : available
                        ? "border-[var(--color-border)] hover:border-[var(--color-accent)] hover:scale-105"
                        : "border-[var(--color-border)] opacity-40 cursor-not-allowed"
            )}
            style={
                hex
                    ? { backgroundColor: hex, boxShadow: isLight ? "inset 0 0 0 1px rgba(0,0,0,0.08)" : undefined }
                    : { background: "var(--color-surface-secondary)" }
            }
        >
            {/* Fallback initials if color unresolvable */}
            {!hex && (
                <span className="text-[8px] font-bold text-[var(--color-text-primary)]">
                    {value.slice(0, 2).toUpperCase()}
                </span>
            )}
            {/* Selected ring */}
            {selected && (
                <span className="absolute -inset-[3px] rounded-full border-2 border-[var(--color-accent)] pointer-events-none" />
            )}
            {/* Unavailable slash */}
            {!available && (
                <span className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-full overflow-hidden">
                    <span className="absolute w-full h-px rotate-45 bg-red-400 opacity-70" />
                </span>
            )}
        </button>
    );
}

function isLightColor(hex: string): boolean {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}

// ─── Stock badge ──────────────────────────────────────────────────────────────

export function VariantStockBadge({ quantity }: { quantity: number }) {
    if (quantity <= 0) {
        return (
            <p className="text-[11px] font-semibold text-red-500 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                Out of stock
            </p>
        );
    }
    if (quantity <= 5) {
        return (
            <p className="text-[11px] font-semibold text-amber-500 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                Only {quantity} left
            </p>
        );
    }
    return (
        <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            In stock
        </p>
    );
}