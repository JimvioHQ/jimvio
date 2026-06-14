// "use client";

// import { useEffect, useState, useMemo, useCallback } from "react";
// import { createPortal } from "react-dom";
// import Image from "next/image";
// import { X, ShoppingCart, AlertCircle, Ruler } from "lucide-react";
// import { LocalizedPrice } from "@/components/currency/localized-price";
// import { cn, isRenderableImageSrc } from "@/lib/utils";

// /* ──────────────────────────────────────────────
//    Types
// ────────────────────────────────────────────── */
// interface Variant {
//   id: string;
//   name: string;
//   sku: string | null;
//   price: number;
//   compare_at_price: number | null;
//   inventory_quantity: number | null;
//   image_url: string | null;
//   options: Record<string, string> | null;
//   is_active: boolean;
// }

// interface Props {
//   open: boolean;
//   onClose: () => void;
//   onSelect: (variantId: string) => void | Promise<void>;
//   variants: Variant[];
//   productName: string;
//   productImage: string | null;
//   currency?: string;
//   loadingVariantId?: string | null;
// }

// /* ──────────────────────────────────────────────
//    Color resolution
// ────────────────────────────────────────────── */
// const COLOR_MAP: Record<string, string> = {
//   black: "#1a1a1a", white: "#f5f5f5", red: "#ef4444", blue: "#3b82f6",
//   green: "#22c55e", yellow: "#eab308", orange: "#f97316", purple: "#a855f7",
//   pink: "#ec4899", gray: "#6b7280", grey: "#6b7280", brown: "#92400e",
//   navy: "#1e3a5f", beige: "#d4b896", cream: "#fdf3e3", tan: "#c8a882",
//   gold: "#d4a017", silver: "#c0c0c0", khaki: "#c3b091", maroon: "#7f1d1d",
//   teal: "#14b8a6", cyan: "#06b6d4", lime: "#84cc16", indigo: "#6366f1",
//   violet: "#7c3aed", rose: "#f43f5e", coral: "#f97060", mint: "#6ee7b7",
//   burgundy: "#800020", olive: "#6b7c32", lavender: "#c4b5fd", magenta: "#d946ef",
//   turquoise: "#2dd4bf", ivory: "#fffff0", charcoal: "#374151", nude: "#e8c9a0",
//   camel: "#c19a6b", rust: "#b45309", sage: "#84a98c", blush: "#ffb3b3",
//   denim: "#1560bd", stone: "#b2a89a", sand: "#c2b280", mocha: "#7b4f3a",
// };

// const LIGHT_COLORS = new Set([
//   "#f5f5f5", "#fdf3e3", "#fffff0", "#ffb3b3", "#c4b5fd", "#e8c9a0",
// ]);

// function resolveColor(val: string): string | null {
//   const lower = val.toLowerCase().trim();
//   if (COLOR_MAP[lower]) return COLOR_MAP[lower];
//   if (/^#[0-9a-f]{3,6}$/i.test(val.trim())) return val.trim();
//   // partial match
//   for (const [key, hex] of Object.entries(COLOR_MAP)) {
//     if (lower.includes(key)) return hex;
//   }
//   return null;
// }

// function isColorAxis(key: string): boolean {
//   const k = key.toLowerCase();
//   return k.includes("color") || k.includes("colour") || k === "finish" || k === "shade";
// }

// function isSizeAxis(key: string): boolean {
//   const k = key.toLowerCase();
//   return k === "size" || k === "taille" || k === "größe" || k === "dimensione";
// }

// /* ──────────────────────────────────────────────
//    Derive option axes from variants
//    e.g. { Color: ["Black","Tan","Navy"], Size: ["S","M","L","XL"] }
// ────────────────────────────────────────────── */
// function deriveAxes(variants: Variant[]): Map<string, string[]> {
//   const axes = new Map<string, string[]>();
//   for (const v of variants) {
//     if (!v.options) continue;
//     for (const [key, val] of Object.entries(v.options)) {
//       if (!axes.has(key)) axes.set(key, []);
//       const arr = axes.get(key)!;
//       if (!arr.includes(val)) arr.push(val);
//     }
//   }
//   return axes;
// }

// /* find variant matching current selections */
// function resolveVariant(
//   variants: Variant[],
//   selections: Record<string, string>
// ): Variant | null {
//   return (
//     variants.find((v) => {
//       if (!v.options) return false;
//       return Object.entries(selections).every(
//         ([k, val]) => v.options?.[k] === val
//       );
//     }) ?? null
//   );
// }

// /* given partial selections, which values for `axis` are out of stock? */
// function unavailableValues(
//   variants: Variant[],
//   axis: string,
//   currentSelections: Record<string, string>
// ): Set<string> {
//   const oos = new Set<string>();
//   const axes = deriveAxes(variants);
//   const values = axes.get(axis) ?? [];
//   for (const val of values) {
//     const testSel = { ...currentSelections, [axis]: val };
//     const match = resolveVariant(variants, testSel);
//     if (
//       match &&
//       match.inventory_quantity !== null &&
//       match.inventory_quantity <= 0
//     ) {
//       oos.add(val);
//     }
//     if (!match) oos.add(val); // no variant exists for this combo
//   }
//   return oos;
// }

// /* ──────────────────────────────────────────────
//    Sub-components
// ────────────────────────────────────────────── */

// function DragHandle() {
//   return (
//     <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
//       <div
//         className="w-9 h-1 rounded-full"
//         style={{ background: "var(--color-border, rgba(0,0,0,0.15))" }}
//       />
//     </div>
//   );
// }

// function ColorSwatchBtn({
//   value,
//   hex,
//   selected,
//   unavailable,
//   onClick,
// }: {
//   value: string;
//   hex: string;
//   selected: boolean;
//   unavailable: boolean;
//   onClick: () => void;
// }) {
//   const isLight = LIGHT_COLORS.has(hex);
//   return (
//     <button
//       type="button"
//       onClick={onClick}
//       disabled={unavailable}
//       title={value}
//       aria-label={`${value}${unavailable ? " (sold out)" : ""}`}
//       aria-pressed={selected}
//       className={cn(
//         "relative flex-shrink-0 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]",
//         unavailable ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:scale-110 active:scale-95"
//       )}
//       style={{ width: 32, height: 32 }}
//     >
//       {/* ring when selected */}
//       {selected && (
//         <span
//           className="absolute inset-0 rounded-full pointer-events-none"
//           style={{
//             boxShadow: "0 0 0 2px #fff, 0 0 0 3.5px #fd5000",
//           }}
//         />
//       )}
//       <span
//         className="block w-full h-full rounded-full"
//         style={{
//           background: hex,
//           border: isLight
//             ? "1.5px solid rgba(0,0,0,0.14)"
//             : "1.5px solid transparent",
//         }}
//       />
//       {/* sold-out slash */}
//       {unavailable && (
//         <span
//           className="absolute inset-0 flex items-center justify-center rounded-full overflow-hidden"
//           aria-hidden
//         >
//           <span
//             className="block w-[65%] h-px"
//             style={{
//               background: "rgba(120,120,120,0.6)",
//               transform: "rotate(-45deg)",
//             }}
//           />
//         </span>
//       )}
//     </button>
//   );
// }

// function SizeChipBtn({
//   value,
//   selected,
//   unavailable,
//   onClick,
// }: {
//   value: string;
//   selected: boolean;
//   unavailable: boolean;
//   onClick: () => void;
// }) {
//   return (
//     <button
//       type="button"
//       onClick={onClick}
//       disabled={unavailable}
//       aria-label={`${value}${unavailable ? " (sold out)" : ""}`}
//       aria-pressed={selected}
//       className={cn(
//         "relative h-10 rounded-xl text-[13px] font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]",
//         unavailable
//           ? "cursor-not-allowed"
//           : "cursor-pointer active:scale-95"
//       )}
//       style={{
//         border: selected
//           ? "1.5px solid #fd5000"
//           : "1px solid var(--color-border, rgba(0,0,0,0.12))",
//         background: selected
//           ? "#fd5000"
//           : unavailable
//             ? "var(--color-surface-secondary, #f5f5f5)"
//             : "var(--color-surface, #fff)",
//         color: selected
//           ? "#fff"
//           : unavailable
//             ? "var(--color-text-muted, #9ca3af)"
//             : "var(--color-text-primary)",
//         opacity: unavailable && !selected ? 0.5 : 1,
//       }}
//     >
//       {value}
//       {/* strike-through for unavailable */}
//       {unavailable && (
//         <span
//           className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-xl overflow-hidden"
//           aria-hidden
//         >
//           <span
//             className="block w-[55%] h-px"
//             style={{
//               background: "rgba(120,120,120,0.45)",
//               transform: "rotate(-25deg)",
//             }}
//           />
//         </span>
//       )}
//     </button>
//   );
// }

// function GenericChipBtn({
//   value,
//   selected,
//   unavailable,
//   onClick,
// }: {
//   value: string;
//   selected: boolean;
//   unavailable: boolean;
//   onClick: () => void;
// }) {
//   return (
//     <button
//       type="button"
//       onClick={onClick}
//       disabled={unavailable}
//       aria-pressed={selected}
//       className={cn(
//         "h-9 px-3.5 rounded-xl text-[12px] font-semibold transition-all duration-150 whitespace-nowrap focus:outline-none",
//         unavailable ? "cursor-not-allowed opacity-40" : "cursor-pointer active:scale-95"
//       )}
//       style={{
//         border: selected
//           ? "1.5px solid #fd5000"
//           : "1px solid var(--color-border, rgba(0,0,0,0.12))",
//         background: selected ? "#fd5000" : "var(--color-surface, #fff)",
//         color: selected ? "#fff" : "var(--color-text-primary)",
//       }}
//     >
//       {value}
//     </button>
//   );
// }

// function DiscountBadge({
//   price,
//   compareAt,
// }: {
//   price: number;
//   compareAt: number | null;
// }) {
//   if (!compareAt || Number(compareAt) <= Number(price)) return null;
//   const pct = Math.round(
//     ((Number(compareAt) - Number(price)) / Number(compareAt)) * 100
//   );
//   return (
//     <span
//       className="inline-flex items-center text-[11px] font-semibold px-1.5 py-0.5 rounded-md"
//       style={{ background: "rgba(253,80,0,0.1)", color: "#fd5000" }}
//     >
//       −{pct}%
//     </span>
//   );
// }

// /* ──────────────────────────────────────────────
//    Main component
// ────────────────────────────────────────────── */
// export function VariantPickerDialog({
//   open,
//   onClose,
//   onSelect,
//   variants,
//   productName,
//   productImage,
//   currency,
//   loadingVariantId,
// }: Props) {
//   const [mounted, setMounted] = useState(false);
//   const [selections, setSelections] = useState<Record<string, string>>({});

//   useEffect(() => setMounted(true), []);

//   /* derive axes once */
//   const axes = useMemo(() => deriveAxes(variants), [variants]);

//   /* initialise selections to first in-stock value per axis */
//   useEffect(() => {
//     if (!open) return;
//     const initial: Record<string, string> = {};
//     for (const [key, values] of axes.entries()) {
//       // pick first value that has at least one in-stock variant
//       const pick = values.find((val) => {
//         const match = variants.find(
//           (v) =>
//             v.options?.[key] === val &&
//             v.is_active &&
//             (v.inventory_quantity === null || v.inventory_quantity > 0)
//         );
//         return !!match;
//       });
//       if (pick) initial[key] = pick;
//       else if (values[0]) initial[key] = values[0];
//     }
//     setSelections(initial);
//   }, [open, axes, variants]);

//   /* keyboard */
//   useEffect(() => {
//     if (!open) return;
//     const onKey = (e: KeyboardEvent) => {
//       if (e.key === "Escape") onClose();
//     };
//     document.addEventListener("keydown", onKey);
//     const prev = document.body.style.overflow;
//     document.body.style.overflow = "hidden";
//     return () => {
//       document.removeEventListener("keydown", onKey);
//       document.body.style.overflow = prev;
//     };
//   }, [open, onClose]);

//   const resolvedVariant = useMemo(
//     () => resolveVariant(variants, selections),
//     [variants, selections]
//   );

//   const select = useCallback((key: string, val: string) => {
//     setSelections((prev) => ({ ...prev, [key]: val }));
//   }, []);

//   const handleConfirm = () => {
//     if (!resolvedVariant) return;
//     onSelect(resolvedVariant.id);
//   };

//   const isOutOfStock =
//     resolvedVariant !== null &&
//     resolvedVariant.inventory_quantity !== null &&
//     resolvedVariant.inventory_quantity <= 0;

//   const isLowStock =
//     resolvedVariant !== null &&
//     resolvedVariant.inventory_quantity !== null &&
//     resolvedVariant.inventory_quantity > 0 &&
//     resolvedVariant.inventory_quantity <= 5;

//   const isLoading = !!(
//     resolvedVariant && loadingVariantId === resolvedVariant.id
//   );

//   /* fallback: no axes — flat list */
//   const hasAxes = axes.size > 0;

//   /* thumb image: prefer selected variant image */
//   const thumbSrc =
//     (resolvedVariant?.image_url && isRenderableImageSrc(resolvedVariant.image_url)
//       ? resolvedVariant.image_url
//       : null) ??
//     (productImage && isRenderableImageSrc(productImage) ? productImage : null);

//   if (!open || !mounted) return null;

//   /* ─── sort axes: color first, size second, rest alphabetical ─── */
//   const sortedAxes = [...axes.entries()].sort(([a], [b]) => {
//     const aIsColor = isColorAxis(a) ? 0 : isSizeAxis(a) ? 1 : 2;
//     const bIsColor = isColorAxis(b) ? 0 : isSizeAxis(b) ? 1 : 2;
//     return aIsColor - bIsColor;
//   });

//   const dialog = (
//     <div
//       className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center"
//       role="dialog"
//       aria-modal="true"
//       aria-label={`Select options for ${productName}`}
//       onClick={onClose}
//     >
//       {/* Backdrop */}
//       <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

//       {/* Sheet */}
//       <div
//         onClick={(e) => e.stopPropagation()}
//         className="relative w-full sm:max-w-sm flex flex-col rounded-t-2xl sm:rounded-2xl"
//         style={{
//           background: "var(--color-surface, #fff)",
//           border: "0.5px solid var(--color-border, rgba(0,0,0,0.08))",
//           boxShadow: "0 -4px 40px rgba(0,0,0,0.12)",
//           maxHeight: "90vh",
//         }}
//       >
//         {/* drag handle (mobile) */}
//         <DragHandle />

//         {/* ── Header ── */}
//         <div
//           className="flex items-center gap-3 px-4 pb-3 pt-1 flex-shrink-0"
//           style={{ borderBottom: "0.5px solid var(--color-border, rgba(0,0,0,0.08))" }}
//         >
//           {/* thumb — updates to selected variant image */}
//           <div
//             className="relative h-12 w-12 flex-shrink-0 rounded-xl overflow-hidden"
//             style={{ background: "var(--color-surface-secondary, #f5f5f5)" }}
//           >
//             {thumbSrc ? (
//               <Image src={thumbSrc} alt="" fill sizes="48px" className="object-cover" />
//             ) : (
//               <div className="w-full h-full" style={{ background: "var(--color-surface-secondary)" }} />
//             )}
//           </div>

//           <div className="flex-1 min-w-0">
//             <p
//               className="text-[11px] font-medium leading-none mb-1"
//               style={{ color: "var(--color-text-muted)" }}
//             >
//               {productName}
//             </p>
//             {/* price updates live */}
//             {resolvedVariant ? (
//               <div className="flex items-baseline gap-1.5 flex-wrap">
//                 <LocalizedPrice
//                   amount={Number(resolvedVariant.price)}
//                   currency={currency}
//                   className="text-[15px] font-bold"
//                 />
//                 {resolvedVariant.compare_at_price &&
//                   Number(resolvedVariant.compare_at_price) > Number(resolvedVariant.price) && (
//                     <LocalizedPrice
//                       amount={Number(resolvedVariant.compare_at_price)}
//                       currency={currency}
//                       className="text-[12px] line-through"
//                     />
//                   )}
//                 <DiscountBadge
//                   price={resolvedVariant.price}
//                   compareAt={resolvedVariant.compare_at_price}
//                 />
//               </div>
//             ) : (
//               <p className="text-[13px] font-semibold" style={{ color: "var(--color-text-muted)" }}>
//                 Select options
//               </p>
//             )}
//           </div>

//           <button
//             type="button"
//             onClick={onClose}
//             aria-label="Close"
//             className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center"
//             style={{
//               background: "var(--color-surface-secondary, #f5f5f5)",
//               border: "0.5px solid var(--color-border)",
//             }}
//           >
//             <X className="h-3.5 w-3.5" style={{ color: "var(--color-text-muted)" }} />
//           </button>
//         </div>

//         {/* ── Option axes ── */}
//         <div className="flex-1 overflow-y-auto min-h-0">
//           {!hasAxes ? (
//             <div className="flex flex-col items-center justify-center py-12 gap-3">
//               <AlertCircle className="h-7 w-7" style={{ color: "var(--color-text-muted)" }} />
//               <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
//                 No options available
//               </p>
//             </div>
//           ) : (
//             <div className="px-4 py-4 space-y-5">
//               {sortedAxes.map(([key, values]) => {
//                 const currentVal = selections[key];
//                 const oos = unavailableValues(variants, key, selections);
//                 const isColor = isColorAxis(key);
//                 const isSize = isSizeAxis(key);

//                 return (
//                   <div key={key}>
//                     {/* axis label */}
//                     <div className="flex items-center justify-between mb-3">
//                       <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
//                         {key}
//                         {currentVal && (
//                           <span
//                             className="ml-1.5 normal-case tracking-normal font-semibold"
//                             style={{ color: "var(--color-text-primary)" }}
//                           >
//                             — {currentVal}
//                           </span>
//                         )}
//                       </p>
//                       {/* size guide hint */}
//                       {isSize && (
//                         <button
//                           type="button"
//                           className="flex items-center gap-1 text-[11px] font-medium"
//                           style={{ color: "var(--color-text-muted)" }}
//                         >
//                           <Ruler className="h-3 w-3" />
//                           Size guide
//                         </button>
//                       )}
//                     </div>

//                     {/* color swatches */}
//                     {isColor && (
//                       <div className="flex flex-wrap gap-2.5 items-center">
//                         {values.map((val) => {
//                           const hex = resolveColor(val);
//                           if (!hex) {
//                             // fallback to chip if not a color
//                             return (
//                               <GenericChipBtn
//                                 key={val}
//                                 value={val}
//                                 selected={currentVal === val}
//                                 unavailable={oos.has(val)}
//                                 onClick={() => select(key, val)}
//                               />
//                             );
//                           }
//                           return (
//                             <ColorSwatchBtn
//                               key={val}
//                               value={val}
//                               hex={hex}
//                               selected={currentVal === val}
//                               unavailable={oos.has(val)}
//                               onClick={() => select(key, val)}
//                             />
//                           );
//                         })}
//                       </div>
//                     )}

//                     {/* size chips — 4-col grid */}
//                     {isSize && (
//                       <div className="grid grid-cols-4 gap-2">
//                         {values.map((val) => (
//                           <SizeChipBtn
//                             key={val}
//                             value={val}
//                             selected={currentVal === val}
//                             unavailable={oos.has(val)}
//                             onClick={() => select(key, val)}
//                           />
//                         ))}
//                       </div>
//                     )}

//                     {/* generic — horizontal wrap */}
//                     {!isColor && !isSize && (
//                       <div className="flex flex-wrap gap-2">
//                         {values.map((val) => (
//                           <GenericChipBtn
//                             key={val}
//                             value={val}
//                             selected={currentVal === val}
//                             unavailable={oos.has(val)}
//                             onClick={() => select(key, val)}
//                           />
//                         ))}
//                       </div>
//                     )}
//                   </div>
//                 );
//               })}

//               {/* ── Stock / selection status ── */}
//               {resolvedVariant && (
//                 <div
//                   className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
//                   style={{ background: "var(--color-surface-secondary, #f9f9f9)" }}
//                 >
//                   {isOutOfStock ? (
//                     <>
//                       <span
//                         className="h-2 w-2 rounded-full flex-shrink-0"
//                         style={{ background: "#ef4444" }}
//                       />
//                       <p className="text-[12px] font-medium" style={{ color: "#b91c1c" }}>
//                         Out of stock for this combination
//                       </p>
//                     </>
//                   ) : isLowStock ? (
//                     <>
//                       <span
//                         className="h-2 w-2 rounded-full flex-shrink-0"
//                         style={{ background: "#f59e0b" }}
//                       />
//                       <p className="text-[12px] font-medium" style={{ color: "#92400e" }}>
//                         Only {resolvedVariant.inventory_quantity} left — order soon
//                       </p>
//                     </>
//                   ) : (
//                     <>
//                       <span
//                         className="h-2 w-2 rounded-full flex-shrink-0"
//                         style={{ background: "#22c55e" }}
//                       />
//                       <p className="text-[12px] font-medium" style={{ color: "var(--color-text-muted)" }}>
//                         In stock and ready to ship
//                       </p>
//                     </>
//                   )}
//                 </div>
//               )}
//             </div>
//           )}
//         </div>

//         {/* ── Footer ── */}
//         <div
//           className="px-4 pt-3 pb-5 flex-shrink-0 space-y-2"
//           style={{ borderTop: "0.5px solid var(--color-border, rgba(0,0,0,0.08))" }}
//         >
//           {/* selection summary line */}
//           {resolvedVariant && (
//             <div className="flex items-center gap-2 px-0.5">
//               {/* show resolved color swatch */}
//               {(() => {
//                 const colorKey = sortedAxes.find(([k]) => isColorAxis(k))?.[0];
//                 const colorVal = colorKey ? selections[colorKey] : null;
//                 const hex = colorVal ? resolveColor(colorVal) : null;
//                 return hex ? (
//                   <span
//                     className="h-3.5 w-3.5 rounded-full flex-shrink-0"
//                     style={{
//                       background: hex,
//                       border: LIGHT_COLORS.has(hex) ? "1px solid rgba(0,0,0,0.15)" : "1px solid transparent",
//                     }}
//                   />
//                 ) : null;
//               })()}
//               <p className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>
//                 {Object.values(selections).join(" · ")}
//               </p>
//             </div>
//           )}

//           <button
//             type="button"
//             onClick={handleConfirm}
//             disabled={!resolvedVariant || isOutOfStock || isLoading}
//             className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-[14px] font-semibold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed"
//             style={{
//               background:
//                 !resolvedVariant || isOutOfStock
//                   ? "var(--color-surface-secondary)"
//                   : "#fd5000",
//               color:
//                 !resolvedVariant || isOutOfStock
//                   ? "var(--color-text-muted)"
//                   : "#fff",
//               boxShadow:
//                 resolvedVariant && !isOutOfStock
//                   ? "0 4px 16px rgba(253,80,0,0.2)"
//                   : "none",
//             }}
//           >
//             {isLoading ? (
//               <>
//                 <span
//                   className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
//                 />
//                 Adding…
//               </>
//             ) : isOutOfStock ? (
//               "Out of stock"
//             ) : !resolvedVariant ? (
//               "Select options"
//             ) : (
//               <>
//                 <ShoppingCart className="h-4 w-4" />
//                 Add to cart
//                 <span className="opacity-70 font-normal text-[13px]">
//                   ·{" "}
//                   <LocalizedPrice
//                     amount={Number(resolvedVariant.price)}
//                     currency={currency}
//                   />
//                 </span>
//               </>
//             )}
//           </button>
//         </div>
//       </div>
//     </div>
//   );

//   return createPortal(dialog, document.body);
// }

"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X, ShoppingCart, AlertCircle, Ruler, TrendingUp } from "lucide-react";
import { LocalizedPrice } from "@/components/currency/localized-price";
import { cn, isRenderableImageSrc, getEffectiveCompareAtPrice, getProductDiscountPercent, type ProductDiscountFields } from "@/lib/utils";
import { filterStorefrontVariants } from "@/lib/products/storefront-variants";

/* ──────────────────────────────────────────────
   Types
────────────────────────────────────────────── */
export interface Variant {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  compare_at_price: number | null;
  inventory_quantity: number | null;
  image_url: string | null;
  options: Record<string, string> | null;
  is_active: boolean;
  // schema fields
  weight?: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  volume?: number | null;
  source?: "vendor" | "shopify" | "cj" | string | null;
  affiliate_price?: number | null;
  affiliate_commission_rate?: number | null;
  cj_vid?: string | null;
  cj_pid?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (variantId: string) => void | Promise<void>;
  variants: Variant[];
  productName: string;
  productImage: string | null;
  currency?: string;
  loadingVariantId?: string | null;
  // pass product-level affiliate rate as fallback
  productAffiliateRate?: number | null;
  productAffiliateEnabled?: boolean;
  productDiscount?: ProductDiscountFields;
  /** When true (default), zero-stock variants are hidden instead of shown disabled. */
  trackInventory?: boolean;
}

/* ──────────────────────────────────────────────
   Color resolution
────────────────────────────────────────────── */
const COLOR_MAP: Record<string, string> = {
  black: "#1a1a1a", white: "#f5f5f5", red: "#ef4444", blue: "#3b82f6",
  green: "#22c55e", yellow: "#eab308", orange: "#f97316", purple: "#a855f7",
  pink: "#ec4899", gray: "#6b7280", grey: "#6b7280", brown: "#92400e",
  navy: "#1e3a5f", beige: "#d4b896", cream: "#fdf3e3", tan: "#c8a882",
  gold: "#d4a017", silver: "#c0c0c0", khaki: "#c3b091", maroon: "#7f1d1d",
  teal: "#14b8a6", cyan: "#06b6d4", lime: "#84cc16", indigo: "#6366f1",
  violet: "#7c3aed", rose: "#f43f5e", coral: "#f97060", mint: "#6ee7b7",
  burgundy: "#800020", olive: "#6b7c32", lavender: "#c4b5fd", magenta: "#d946ef",
  turquoise: "#2dd4bf", ivory: "#fffff0", charcoal: "#374151", nude: "#e8c9a0",
  camel: "#c19a6b", rust: "#b45309", sage: "#84a98c", blush: "#ffb3b3",
  denim: "#1560bd", stone: "#b2a89a", sand: "#c2b280", mocha: "#7b4f3a",
};

const LIGHT_COLORS = new Set([
  "#f5f5f5", "#fdf3e3", "#fffff0", "#ffb3b3", "#c4b5fd", "#e8c9a0",
]);

function resolveColor(val: string): string | null {
  const lower = val.toLowerCase().trim();
  if (COLOR_MAP[lower]) return COLOR_MAP[lower];
  if (/^#[0-9a-f]{3,6}$/i.test(val.trim())) return val.trim();
  for (const [key, hex] of Object.entries(COLOR_MAP)) {
    if (lower.includes(key)) return hex;
  }
  return null;
}

function isColorAxis(key: string): boolean {
  const k = key.toLowerCase();
  return k.includes("color") || k.includes("colour") || k === "finish" || k === "shade";
}

function isSizeAxis(key: string): boolean {
  const k = key.toLowerCase();
  return k === "size" || k === "taille" || k === "größe" || k === "dimensione";
}

/* ──────────────────────────────────────────────
   Option axis helpers
────────────────────────────────────────────── */
function deriveAxes(variants: Variant[]): Map<string, string[]> {
  const axes = new Map<string, string[]>();
  for (const v of variants) {
    if (!v.options) continue;
    for (const [key, val] of Object.entries(v.options)) {
      if (!axes.has(key)) axes.set(key, []);
      const arr = axes.get(key)!;
      if (!arr.includes(val)) arr.push(val);
    }
  }
  return axes;
}

function resolveVariant(
  variants: Variant[],
  selections: Record<string, string>
): Variant | null {
  return (
    variants.find((v) => {
      if (!v.options) return false;
      return Object.entries(selections).every(([k, val]) => v.options?.[k] === val);
    }) ?? null
  );
}

function unavailableValues(
  variants: Variant[],
  axis: string,
  currentSelections: Record<string, string>
): Set<string> {
  const unavailable = new Set<string>();
  const axes = deriveAxes(variants);
  const values = axes.get(axis) ?? [];
  for (const val of values) {
    const testSel = { ...currentSelections, [axis]: val };
    const match = resolveVariant(variants, testSel);
    if (!match) unavailable.add(val);
  }
  return unavailable;
}

/* ──────────────────────────────────────────────
   Dimension display helper (CJ variants)
────────────────────────────────────────────── */
function hasDimensions(v: Variant): boolean {
  return !!(v.weight || v.length || v.width || v.height);
}

function DimensionsRow({ v }: { v: Variant }) {
  if (!hasDimensions(v)) return null;
  const parts: string[] = [];
  if (v.weight) parts.push(`${v.weight}kg`);
  if (v.length && v.width && v.height)
    parts.push(`${v.length}×${v.width}×${v.height}cm`);
  if (!parts.length) return null;
  return (
    <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
      {parts.join(" · ")}
    </p>
  );
}

/* ──────────────────────────────────────────────
   Sub-components
────────────────────────────────────────────── */
function DragHandle() {
  return (
    <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
      <div
        className="w-9 h-1 rounded-full"
        style={{ background: "var(--color-border, rgba(0,0,0,0.15))" }}
      />
    </div>
  );
}

function ColorSwatchBtn({
  value, hex, selected, unavailable, onClick,
}: {
  value: string; hex: string; selected: boolean;
  unavailable: boolean; onClick: () => void;
}) {
  const isLight = LIGHT_COLORS.has(hex);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={unavailable}
      title={value}
      aria-label={`${value}${unavailable ? " (sold out)" : ""}`}
      aria-pressed={selected}
      className={cn(
        "relative flex-shrink-0 transition-all duration-150 focus:outline-none",
        "focus-visible:ring-2 focus-visible:ring-[#fd5000]",
        unavailable
          ? "opacity-40 cursor-not-allowed"
          : "cursor-pointer hover:scale-110 active:scale-95"
      )}
      style={{ width: 32, height: 32 }}
    >
      {selected && (
        <span
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ boxShadow: "0 0 0 2px #fff, 0 0 0 3.5px #fd5000" }}
        />
      )}
      <span
        className="block w-full h-full rounded-full"
        style={{
          background: hex,
          border: isLight ? "1.5px solid rgba(0,0,0,0.14)" : "1.5px solid transparent",
        }}
      />
      {unavailable && (
        <span
          className="absolute inset-0 flex items-center justify-center rounded-full overflow-hidden"
          aria-hidden
        >
          <span
            className="block w-[65%] h-px"
            style={{ background: "rgba(120,120,120,0.6)", transform: "rotate(-45deg)" }}
          />
        </span>
      )}
    </button>
  );
}

function SizeChipBtn({
  value, selected, unavailable, onClick,
}: {
  value: string; selected: boolean; unavailable: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={unavailable}
      aria-label={`${value}${unavailable ? " (sold out)" : ""}`}
      aria-pressed={selected}
      className={cn(
        "relative h-10 rounded-xl text-[13px] font-semibold transition-all duration-150",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]",
        unavailable ? "cursor-not-allowed" : "cursor-pointer active:scale-95"
      )}
      style={{
        border: selected
          ? "1.5px solid #fd5000"
          : "1px solid var(--color-border, rgba(0,0,0,0.12))",
        background: selected
          ? "#fd5000"
          : unavailable
            ? "var(--color-surface-secondary, #f5f5f5)"
            : "var(--color-surface, #fff)",
        color: selected ? "#fff" : unavailable
          ? "var(--color-text-muted)" : "var(--color-text-primary)",
        opacity: unavailable && !selected ? 0.5 : 1,
      }}
    >
      {value}
      {unavailable && (
        <span
          className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-xl overflow-hidden"
          aria-hidden
        >
          <span
            className="block w-[55%] h-px"
            style={{ background: "rgba(120,120,120,0.45)", transform: "rotate(-25deg)" }}
          />
        </span>
      )}
    </button>
  );
}

function GenericChipBtn({
  value, selected, unavailable, onClick,
}: {
  value: string; selected: boolean; unavailable: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={unavailable}
      aria-pressed={selected}
      className={cn(
        "h-9 px-3.5 rounded-xl text-[12px] font-semibold transition-all duration-150",
        "whitespace-nowrap focus:outline-none",
        unavailable ? "cursor-not-allowed opacity-40" : "cursor-pointer active:scale-95"
      )}
      style={{
        border: selected
          ? "1.5px solid #fd5000"
          : "1px solid var(--color-border, rgba(0,0,0,0.12))",
        background: selected ? "#fd5000" : "var(--color-surface, #fff)",
        color: selected ? "#fff" : "var(--color-text-primary)",
      }}
    >
      {value}
    </button>
  );
}

function DiscountBadge({ price, compareAt, productDiscount }: { price: number; compareAt: number | null; productDiscount?: ProductDiscountFields }) {
  const pct = productDiscount
    ? getProductDiscountPercent({ ...productDiscount, price, compare_at_price: compareAt })
    : 0;
  if (pct <= 0) return null;
  return (
    <span
      className="inline-flex items-center text-[11px] font-semibold px-1.5 py-0.5 rounded-md"
      style={{ background: "rgba(253,80,0,0.1)", color: "#fd5000" }}
    >
      −{pct}%
    </span>
  );
}

function AffiliateBadge({ rate }: { rate: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
      style={{ background: "rgba(99,102,241,0.08)", color: "#6366f1" }}
    >
      <TrendingUp className="h-2.5 w-2.5" />
      {rate}% commission
    </span>
  );
}

/* ──────────────────────────────────────────────
   Main component
────────────────────────────────────────────── */
export function VariantPickerDialog({
  open,
  onClose,
  onSelect,
  variants,
  productName,
  productImage,
  currency,
  loadingVariantId,
  productAffiliateRate,
  productAffiliateEnabled,
  productDiscount,
  trackInventory = true,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [selections, setSelections] = useState<Record<string, string>>({});

  const visibleVariants = useMemo(
    () => filterStorefrontVariants(variants, trackInventory),
    [variants, trackInventory]
  );

  useEffect(() => setMounted(true), []);

  const axes = useMemo(() => deriveAxes(visibleVariants), [visibleVariants]);

  // initialise selections: first value per axis
  useEffect(() => {
    if (!open) return;
    const initial: Record<string, string> = {};
    for (const [key, values] of axes.entries()) {
      const pick = values.find((val) =>
        visibleVariants.some((v) => v.options?.[key] === val && v.is_active)
      );
      initial[key] = pick ?? values[0] ?? "";
    }
    setSelections(initial);
  }, [open, axes, visibleVariants]);

  // keyboard + scroll lock
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const resolvedVariant = useMemo(
    () => resolveVariant(visibleVariants, selections),
    [visibleVariants, selections]
  );

  const select = useCallback((key: string, val: string) => {
    setSelections((prev) => ({ ...prev, [key]: val }));
  }, []);

  const handleConfirm = () => {
    if (!resolvedVariant) return;
    onSelect(resolvedVariant.id);
  };

  const isOutOfStock =
    resolvedVariant !== null &&
    resolvedVariant.inventory_quantity !== null &&
    resolvedVariant.inventory_quantity <= 0;

  const isLowStock =
    resolvedVariant !== null &&
    resolvedVariant.inventory_quantity !== null &&
    resolvedVariant.inventory_quantity > 0 &&
    resolvedVariant.inventory_quantity <= 5;

  const isLoading = !!(resolvedVariant && loadingVariantId === resolvedVariant.id);

  const hasAxes = axes.size > 0;

  // effective affiliate rate: variant-level overrides product-level
  const effectiveAffiliateRate = useMemo(() => {
    if (!productAffiliateEnabled) return null;
    const variantRate =
      resolvedVariant?.affiliate_commission_rate != null
        ? Number(resolvedVariant.affiliate_commission_rate)
        : null;
    if (variantRate && variantRate > 0) return variantRate;
    if (productAffiliateRate && Number(productAffiliateRate) > 0)
      return Number(productAffiliateRate);
    return null;
  }, [resolvedVariant, productAffiliateRate, productAffiliateEnabled]);

  // use affiliate_price if set and lower than regular price
  const effectivePrice = useMemo(() => {
    if (!resolvedVariant) return null;
    const ap = resolvedVariant.affiliate_price;
    if (ap && Number(ap) > 0 && Number(ap) < Number(resolvedVariant.price)) {
      return Number(ap);
    }
    return Number(resolvedVariant.price);
  }, [resolvedVariant]);

  // thumb: resolved variant image > product image
  const thumbSrc =
    (resolvedVariant?.image_url && isRenderableImageSrc(resolvedVariant.image_url)
      ? resolvedVariant.image_url
      : null) ??
    (productImage && isRenderableImageSrc(productImage) ? productImage : null);

  // sorted axes: color → size → rest
  const sortedAxes = useMemo(
    () =>
      [...axes.entries()].sort(([a], [b]) => {
        const rank = (k: string) =>
          isColorAxis(k) ? 0 : isSizeAxis(k) ? 1 : 2;
        return rank(a) - rank(b);
      }),
    [axes]
  );

  // whether any CJ variant has dimension data to show size guide
  const showSizeGuide = useMemo(
    () => visibleVariants.some((v) => v.source === "cj" && hasDimensions(v)),
    [visibleVariants]
  );

  if (!open || !mounted) return null;

  const dialog = (
    <div
      className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Select options for ${productName}`}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

      {/* Sheet */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-sm flex flex-col rounded-t-2xl sm:rounded-2xl"
        style={{
          background: "var(--color-surface, #fff)",
          border: "0.5px solid var(--color-border, rgba(0,0,0,0.08))",
          boxShadow: "0 -4px 40px rgba(0,0,0,0.12)",
          maxHeight: "90vh",
        }}
      >
        <DragHandle />

        {/* ── Header ── */}
        <div
          className="flex items-center gap-3 px-4 pb-3 pt-1 flex-shrink-0"
          style={{ borderBottom: "0.5px solid var(--color-border, rgba(0,0,0,0.08))" }}
        >
          {/* thumb — updates to resolved variant image */}
          <div
            className="relative h-12 w-12 flex-shrink-0 rounded-xl overflow-hidden"
            style={{ background: "var(--color-surface-secondary, #f5f5f5)" }}
          >
            {thumbSrc ? (
              <Image src={thumbSrc} alt="" fill sizes="48px" className="object-cover" />
            ) : (
              <div className="w-full h-full" style={{ background: "var(--color-surface-secondary)" }} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p
              className="text-[11px] font-medium leading-none mb-1.5 truncate"
              style={{ color: "var(--color-text-muted)" }}
            >
              {productName}
            </p>

            {/* live price */}
            {resolvedVariant ? (
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <LocalizedPrice
                  amount={effectivePrice!}
                  currency={currency}
                  className="text-[15px] font-bold"
                />
                {(() => {
                  const effectiveCompareAt = productDiscount
                    ? getEffectiveCompareAtPrice({
                        ...productDiscount,
                        price: Number(resolvedVariant.price),
                        compare_at_price: resolvedVariant.compare_at_price,
                      })
                    : null;
                  return effectiveCompareAt ? (
                    <LocalizedPrice
                      amount={effectiveCompareAt}
                      currency={currency}
                      className="text-[12px] line-through"
                    />
                  ) : null;
                })()}
                <DiscountBadge
                  price={resolvedVariant.price}
                  compareAt={resolvedVariant.compare_at_price}
                  productDiscount={productDiscount}
                />
              </div>
            ) : (
              <p className="text-[13px] font-semibold" style={{ color: "var(--color-text-muted)" }}>
                Select options
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center"
            style={{
              background: "var(--color-surface-secondary, #f5f5f5)",
              border: "0.5px solid var(--color-border)",
            }}
          >
            <X className="h-3.5 w-3.5" style={{ color: "var(--color-text-muted)" }} />
          </button>
        </div>

        {/* ── Option axes ── */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {!hasAxes ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <AlertCircle className="h-7 w-7" style={{ color: "var(--color-text-muted)" }} />
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                No options available
              </p>
            </div>
          ) : (
            <div className="px-4 py-4 space-y-5">
              {sortedAxes.map(([key, values]) => {
                const currentVal = selections[key];
                const oos = unavailableValues(visibleVariants, key, selections);
                const isColor = isColorAxis(key);
                const isSize = isSizeAxis(key);

                return (
                  <div key={key}>
                    {/* axis label row */}
                    <div className="flex items-center justify-between mb-3">
                      <p
                        className="text-[11px] font-semibold uppercase tracking-wider"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {key}
                        {currentVal && (
                          <span
                            className="ml-1.5 normal-case tracking-normal font-semibold"
                            style={{ color: "var(--color-text-primary)" }}
                          >
                            — {currentVal}
                          </span>
                        )}
                      </p>
                      {isSize && showSizeGuide && (
                        <button
                          type="button"
                          className="flex items-center gap-1 text-[11px] font-medium"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          <Ruler className="h-3 w-3" />
                          Size guide
                        </button>
                      )}
                    </div>

                    {/* color swatches */}
                    {isColor && (
                      <div className="flex flex-wrap gap-2.5 items-center">
                        {values.map((val) => {
                          const hex = resolveColor(val);
                          if (!hex) {
                            return (
                              <GenericChipBtn
                                key={val}
                                value={val}
                                selected={currentVal === val}
                                unavailable={oos.has(val)}
                                onClick={() => select(key, val)}
                              />
                            );
                          }
                          return (
                            <ColorSwatchBtn
                              key={val}
                              value={val}
                              hex={hex}
                              selected={currentVal === val}
                              unavailable={oos.has(val)}
                              onClick={() => select(key, val)}
                            />
                          );
                        })}
                      </div>
                    )}

                    {/* size chips */}
                    {isSize && (
                      <div className="grid grid-cols-4 gap-2">
                        {values.map((val) => (
                          <SizeChipBtn
                            key={val}
                            value={val}
                            selected={currentVal === val}
                            unavailable={oos.has(val)}
                            onClick={() => select(key, val)}
                          />
                        ))}
                      </div>
                    )}

                    {/* generic chips */}
                    {!isColor && !isSize && (
                      <div className="flex flex-wrap gap-2">
                        {values.map((val) => (
                          <GenericChipBtn
                            key={val}
                            value={val}
                            selected={currentVal === val}
                            unavailable={oos.has(val)}
                            onClick={() => select(key, val)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* ── Resolved variant detail row ── */}
              {resolvedVariant && (
                <div className="space-y-2">
                  {/* dimensions (CJ products) */}
                  {hasDimensions(resolvedVariant) && (
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-xl"
                      style={{ background: "var(--color-surface-secondary, #f9f9f9)" }}
                    >
                      <Ruler className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--color-text-muted)" }} />
                      <DimensionsRow v={resolvedVariant} />
                    </div>
                  )}

                  {/* affiliate commission badge */}
                  {effectiveAffiliateRate && (
                    <div className="flex">
                      <AffiliateBadge rate={effectiveAffiliateRate} />
                    </div>
                  )}

                  {/* stock status */}
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                    style={{ background: "var(--color-surface-secondary, #f9f9f9)" }}
                  >
                    {isOutOfStock ? (
                      <>
                        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: "#ef4444" }} />
                        <p className="text-[12px] font-medium" style={{ color: "#b91c1c" }}>
                          Out of stock for this combination
                        </p>
                      </>
                    ) : isLowStock ? (
                      <>
                        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: "#f59e0b" }} />
                        <p className="text-[12px] font-medium" style={{ color: "#92400e" }}>
                          Only {resolvedVariant.inventory_quantity} left — order soon
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: "#22c55e" }} />
                        <p className="text-[12px] font-medium" style={{ color: "var(--color-text-muted)" }}>
                          In stock and ready to ship
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="px-4 pt-3 pb-5 flex-shrink-0 space-y-2"
          style={{ borderTop: "0.5px solid var(--color-border, rgba(0,0,0,0.08))" }}
        >
          {/* selection summary line */}
          {resolvedVariant && Object.keys(selections).length > 0 && (
            <div className="flex items-center gap-2 px-0.5">
              {(() => {
                const colorKey = sortedAxes.find(([k]) => isColorAxis(k))?.[0];
                const colorVal = colorKey ? selections[colorKey] : null;
                const hex = colorVal ? resolveColor(colorVal) : null;
                return hex ? (
                  <span
                    className="h-3.5 w-3.5 rounded-full flex-shrink-0"
                    style={{
                      background: hex,
                      border: LIGHT_COLORS.has(hex)
                        ? "1px solid rgba(0,0,0,0.15)"
                        : "1px solid transparent",
                    }}
                  />
                ) : null;
              })()}
              <p className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>
                {Object.values(selections).join(" · ")}
                {resolvedVariant.sku && (
                  <span className="ml-1.5 opacity-50">· SKU: {resolvedVariant.sku}</span>
                )}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!resolvedVariant || isOutOfStock || isLoading}
            className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-[14px] font-semibold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed"
            style={{
              background:
                !resolvedVariant || isOutOfStock
                  ? "var(--color-surface-secondary)"
                  : "#fd5000",
              color:
                !resolvedVariant || isOutOfStock
                  ? "var(--color-text-muted)"
                  : "#fff",
              boxShadow:
                resolvedVariant && !isOutOfStock
                  ? "0 4px 16px rgba(253,80,0,0.2)"
                  : "none",
            }}
          >
            {isLoading ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Adding…
              </>
            ) : isOutOfStock ? (
              "Out of stock"
            ) : !resolvedVariant ? (
              "Select options"
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />
                Add to cart
                <span className="opacity-70 font-normal text-[13px]">
                  ·{" "}
                  <LocalizedPrice amount={effectivePrice!} currency={currency} />
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}