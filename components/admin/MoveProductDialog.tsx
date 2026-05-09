// "use client";

// import React, { useState, useRef, useEffect } from "react";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
//   DialogDescription,
// } from "@/components/ui/dialog";
// import { searchAdminVendors, moveProductToVendor } from "@/lib/actions/admin-products";
// import { toast } from "sonner";

// // ─── SVG icons ────────────────────────────────────────────────────────────────
// function MoveIcon() {
//   return (
//     <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
//       <path d="M2 6.5H11M8 3.5L11 6.5L8 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
//       <path d="M5 3.5L2 6.5L5 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
//     </svg>
//   );
// }
// function SearchIcon() {
//   return (
//     <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
//       <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
//       <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
//     </svg>
//   );
// }
// function SpinnerIcon() {
//   return (
//     <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ animation: "spin 0.7s linear infinite" }}>
//       <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.25" />
//       <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
//       <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
//     </svg>
//   );
// }
// function StoreIcon({ size = 16 }: { size?: number }) {
//   return (
//     <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
//       <path d="M2 6.5L3.2 2H12.8L14 6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
//       <path d="M1.5 6.5H14.5V14H1.5V6.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
//       <path d="M6 14V10H10V14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
//     </svg>
//   );
// }
// function ShieldIcon() {
//   return (
//     <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
//       <path d="M6 1L2 2.5V6C2 8.5 3.8 10.7 6 11.5C8.2 10.7 10 8.5 10 6V2.5L6 1Z" fill="rgba(34,197,94,0.15)" stroke="#16a34a" strokeWidth="1" />
//       <polyline points="4,6 5.5,7.5 8,4.5" stroke="#16a34a" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
//     </svg>
//   );
// }
// function EmptyIcon() {
//   return (
//     <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
//       <circle cx="20" cy="20" r="16" stroke="var(--color-border)" strokeWidth="1.2" fill="none" strokeDasharray="5 3" />
//       <circle cx="17" cy="16" r="5" stroke="var(--color-border)" strokeWidth="1.2" />
//       <path d="M21 20L25 24" stroke="var(--color-border)" strokeWidth="1.5" strokeLinecap="round" />
//       <path d="M13 27C13 24.8 14.8 23 17 23H20" stroke="var(--color-border)" strokeWidth="1.2" strokeLinecap="round" />
//     </svg>
//   );
// }
// function CheckIcon() {
//   return (
//     <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
//       <circle cx="7" cy="7" r="6.5" fill="var(--color-accent, #fd5000)" />
//       <polyline points="4,7 6,9.5 10,4.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
//     </svg>
//   );
// }
// function ArrowIcon() {
//   return (
//     <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
//       <path d="M3 7H11M8 4L11 7L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
//     </svg>
//   );
// }

// // ─── Component ────────────────────────────────────────────────────────────────
// export function MoveProductDialog({
//   productId,
//   currentVendorName,
// }: {
//   productId: string;
//   currentVendorName?: string;
// }) {
//   const [open, setOpen] = useState(false);
//   const [query, setQuery] = useState("");
//   const [vendors, setVendors] = useState<any[]>([]);
//   const [searching, setSearching] = useState(false);
//   const [searched, setSearched] = useState(false);
//   const [selectedVendor, setSelectedVendor] = useState<any | null>(null);
//   const [moving, setMoving] = useState(false);
//   const [confirmed, setConfirmed] = useState(false);
//   const inputRef = useRef<HTMLInputElement>(null);

//   // Reset state when dialog closes
//   useEffect(() => {
//     if (!open) {
//       setTimeout(() => {
//         setQuery(""); setVendors([]); setSelectedVendor(null);
//         setSearched(false); setConfirmed(false);
//       }, 200);
//     } else {
//       setTimeout(() => inputRef.current?.focus(), 100);
//     }
//   }, [open]);

//   const handleSearch = async (e?: React.FormEvent) => {
//     e?.preventDefault();
//     if (!query.trim()) return;
//     setSearching(true);
//     setSearched(false);
//     setSelectedVendor(null);
//     try {
//       const res = await searchAdminVendors(query);
//       if (res.success && res.vendors) {
//         setVendors(res.vendors);
//       } else {
//         toast.error(res.error || "Failed to search vendors");
//         setVendors([]);
//       }
//     } catch (err: any) {
//       toast.error(err.message || "Something went wrong");
//       setVendors([]);
//     } finally {
//       setSearching(false);
//       setSearched(true);
//     }
//   };

//   const handleMove = async () => {
//     if (!selectedVendor) return;
//     setMoving(true);
//     try {
//       const res = await moveProductToVendor(productId, selectedVendor.id);
//       if (res.success) {
//         setConfirmed(true);
//         setTimeout(() => {
//           toast.success(`Product moved to ${selectedVendor.business_name || "vendor"}`);
//           setOpen(false);
//         }, 700);
//       } else {
//         toast.error(res.error || "Failed to move product");
//       }
//     } catch (err: any) {
//       toast.error(err.message || "An error occurred");
//     } finally {
//       setMoving(false);
//     }
//   };

//   // ── Trigger button ─────────────────────────────────────────────────────────
//   const triggerBtn: React.CSSProperties = {
//     display: "inline-flex", alignItems: "center", gap: 5,
//     height: 30, padding: "0 10px", borderRadius: 6,
//     fontSize: 12, fontWeight: 600, cursor: "pointer",
//     border: "0.5px solid var(--color-border)",
//     background: "var(--color-surface, #f8f8f7)",
//     color: "var(--color-text-secondary)",
//     transition: "border-color 150ms, color 150ms",
//   };

//   return (
//     <Dialog open={open} onOpenChange={setOpen}>
//       <DialogTrigger asChild>
//         <button
//           style={triggerBtn}
//           onMouseEnter={(e) => {
//             (e.currentTarget as HTMLElement).style.borderColor = "var(--color-accent, #fd5000)";
//             (e.currentTarget as HTMLElement).style.color = "var(--color-accent, #fd5000)";
//           }}
//           onMouseLeave={(e) => {
//             (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)";
//             (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)";
//           }}
//         >
//           <MoveIcon /> Move
//         </button>
//       </DialogTrigger>

//       <DialogContent
//         style={{
//           padding: 0, overflow: "hidden",
//           borderRadius: 16, maxWidth: 460,
//           border: "0.5px solid var(--color-border)",
//           boxShadow: "0 24px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)",
//         }}
//       >
//         {/* ── Header ── */}
//         <div style={{ padding: "20px 20px 0" }}>
//           <DialogHeader>
//             <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
//               <div style={{
//                 width: 32, height: 32, borderRadius: 8, flexShrink: 0,
//                 background: "rgba(253,80,0,0.08)", border: "0.5px solid rgba(253,80,0,0.2)",
//                 display: "flex", alignItems: "center", justifyContent: "center",
//                 color: "var(--color-accent, #fd5000)",
//               }}>
//                 <MoveIcon />
//               </div>
//               <div>
//                 <DialogTitle style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
//                   Move product
//                 </DialogTitle>
//                 <DialogDescription style={{ fontSize: 12, margin: 0, color: "var(--color-text-muted, #888)" }}>
//                   Transfer ownership to a different vendor
//                 </DialogDescription>
//               </div>
//             </div>
//           </DialogHeader>

//           {/* Current vendor pill */}
//           <div style={{
//             display: "flex", alignItems: "center", gap: 8,
//             padding: "10px 12px", borderRadius: 10, marginTop: 14,
//             background: "var(--color-surface, #f8f8f7)",
//             border: "0.5px solid var(--color-border)",
//           }}>
//             <div style={{ fontSize: 11, color: "var(--color-text-muted, #888)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>
//               From
//             </div>
//             <div style={{ width: 1, height: 16, background: "var(--color-border)" }} />
//             <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
//               <div style={{
//                 width: 22, height: 22, borderRadius: 6,
//                 background: "rgba(253,80,0,0.08)", border: "0.5px solid rgba(253,80,0,0.15)",
//                 display: "flex", alignItems: "center", justifyContent: "center",
//                 color: "var(--color-accent, #fd5000)", flexShrink: 0,
//               }}>
//                 <StoreIcon size={12} />
//               </div>
//               <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
//                 {currentVendorName || "Unassigned"}
//               </span>
//             </div>
//             {selectedVendor && (
//               <>
//                 <div style={{ marginLeft: "auto", color: "var(--color-text-muted, #aaa)", display: "flex", alignItems: "center" }}>
//                   <ArrowIcon />
//                 </div>
//                 <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
//                   <div style={{
//                     width: 22, height: 22, borderRadius: 6,
//                     background: "rgba(34,197,94,0.08)", border: "0.5px solid rgba(34,197,94,0.2)",
//                     display: "flex", alignItems: "center", justifyContent: "center",
//                     color: "#16a34a", flexShrink: 0,
//                   }}>
//                     <StoreIcon size={12} />
//                   </div>
//                   <span style={{ fontSize: 13, fontWeight: 600, color: "#16a34a", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
//                     {selectedVendor.business_name || "Unnamed"}
//                   </span>
//                 </div>
//               </>
//             )}
//           </div>
//         </div>

//         {/* ── Search ── */}
//         <div style={{ padding: "14px 20px 0" }}>
//           <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
//             <div style={{ position: "relative", flex: 1 }}>
//               <span style={{
//                 position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
//                 color: "var(--color-text-muted, #aaa)", pointerEvents: "none",
//               }}>
//                 <SearchIcon />
//               </span>
//               <input
//                 ref={inputRef}
//                 value={query}
//                 onChange={(e) => setQuery(e.target.value)}
//                 placeholder="Search vendor by name or email…"
//                 style={{
//                   width: "100%", boxSizing: "border-box", height: 36,
//                   paddingLeft: 32, paddingRight: 12,
//                   border: "0.5px solid var(--color-border)", borderRadius: 8,
//                   fontSize: 13, outline: "none",
//                   background: "var(--color-bg, #fff)",
//                   color: "var(--color-text-primary)",
//                   transition: "border-color 150ms",
//                 }}
//                 onFocus={(e) => (e.target.style.borderColor = "var(--color-accent, #fd5000)")}
//                 onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")}
//               />
//             </div>
//             <button
//               type="submit"
//               disabled={searching || !query.trim()}
//               style={{
//                 height: 36, width: 36, borderRadius: 8, flexShrink: 0,
//                 background: searching || !query.trim() ? "var(--color-surface, #f8f8f7)" : "var(--color-accent, #fd5000)",
//                 border: "0.5px solid var(--color-border)",
//                 color: searching || !query.trim() ? "var(--color-text-muted, #aaa)" : "#fff",
//                 display: "flex", alignItems: "center", justifyContent: "center",
//                 cursor: searching || !query.trim() ? "not-allowed" : "pointer",
//                 transition: "background 150ms, color 150ms",
//               }}
//             >
//               {searching ? <SpinnerIcon /> : <SearchIcon />}
//             </button>
//           </form>
//         </div>

//         {/* ── Results ── */}
//         <div style={{ padding: "12px 20px 0", minHeight: 60 }}>
//           {/* Vendor list */}
//           {vendors.length > 0 && (
//             <div style={{
//               border: "0.5px solid var(--color-border)", borderRadius: 10,
//               overflow: "hidden", maxHeight: 220, overflowY: "auto",
//             }}>
//               {vendors.map((v, i) => {
//                 const isSelected = selectedVendor?.id === v.id;
//                 return (
//                   <div
//                     key={v.id}
//                     onClick={() => setSelectedVendor(isSelected ? null : v)}
//                     style={{
//                       display: "flex", alignItems: "center", justifyContent: "space-between",
//                       padding: "10px 12px", cursor: "pointer",
//                       borderBottom: i < vendors.length - 1 ? "0.5px solid var(--color-border)" : "none",
//                       borderLeft: `3px solid ${isSelected ? "var(--color-accent, #fd5000)" : "transparent"}`,
//                       background: isSelected ? "rgba(253,80,0,0.04)" : "var(--color-bg, #fff)",
//                       transition: "background 120ms, border-color 120ms",
//                     }}
//                     onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "var(--color-surface, #f8f8f7)"; }}
//                     onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "var(--color-bg, #fff)"; }}
//                   >
//                     <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
//                       {/* Vendor avatar */}
//                       <div style={{
//                         width: 32, height: 32, borderRadius: 8, flexShrink: 0,
//                         background: isSelected ? "rgba(253,80,0,0.1)" : "var(--color-surface, #f8f8f7)",
//                         border: `0.5px solid ${isSelected ? "rgba(253,80,0,0.2)" : "var(--color-border)"}`,
//                         display: "flex", alignItems: "center", justifyContent: "center",
//                         color: isSelected ? "var(--color-accent, #fd5000)" : "var(--color-text-muted, #aaa)",
//                         transition: "all 150ms",
//                       }}>
//                         {v.business_name?.charAt(0)?.toUpperCase() || <StoreIcon size={14} />}
//                       </div>

//                       <div style={{ minWidth: 0 }}>
//                         <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
//                           <span style={{
//                             fontSize: 13, fontWeight: 600,
//                             color: "var(--color-text-primary)",
//                             overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160,
//                           }}>
//                             {v.business_name || "Unnamed Store"}
//                           </span>
//                           {v.verification_status === "verified" && <ShieldIcon />}
//                           {!v.is_active && (
//                             <span style={{
//                               fontSize: 10, fontWeight: 600, padding: "1px 5px", borderRadius: 999,
//                               background: "rgba(148,163,184,0.15)", color: "#64748b",
//                               border: "0.5px solid rgba(148,163,184,0.25)",
//                             }}>
//                               Inactive
//                             </span>
//                           )}
//                         </div>
//                         <span style={{ fontSize: 11, color: "var(--color-text-muted, #888)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", maxWidth: 200 }}>
//                           {v.owner_email}
//                         </span>
//                       </div>
//                     </div>

//                     {/* Selected indicator */}
//                     <div style={{ flexShrink: 0, marginLeft: 8 }}>
//                       {isSelected
//                         ? <CheckIcon />
//                         : <div style={{ width: 14, height: 14, borderRadius: "50%", border: "1.5px solid var(--color-border)" }} />
//                       }
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//           )}

//           {/* Empty state */}
//           {searched && !searching && vendors.length === 0 && (
//             <div style={{
//               padding: "28px 16px", display: "flex", flexDirection: "column",
//               alignItems: "center", textAlign: "center", gap: 8,
//               border: "0.5px dashed var(--color-border)", borderRadius: 10,
//               background: "var(--color-surface, #f8f8f7)",
//             }}>
//               <EmptyIcon />
//               <p style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
//                 No vendors found
//               </p>
//               <p style={{ fontSize: 12, color: "var(--color-text-muted, #888)", margin: 0 }}>
//                 Try a different name or email address.
//               </p>
//             </div>
//           )}
//         </div>

//         {/* ── Footer ── */}
//         <div style={{
//           display: "flex", alignItems: "center", justifyContent: "space-between",
//           padding: "14px 20px 20px",
//           marginTop: 12,
//           borderTop: "0.5px solid var(--color-border)",
//           background: "var(--color-surface, #f8f8f7)",
//         }}>
//           <button
//             onClick={() => setOpen(false)}
//             disabled={moving}
//             style={{
//               height: 36, padding: "0 14px", borderRadius: 8,
//               border: "0.5px solid var(--color-border)",
//               background: "var(--color-bg, #fff)",
//               fontSize: 13, fontWeight: 600, cursor: moving ? "not-allowed" : "pointer",
//               color: "var(--color-text-secondary)",
//               transition: "border-color 150ms",
//             }}
//             onMouseEnter={(e) => !moving && ((e.currentTarget as HTMLElement).style.borderColor = "var(--color-text-muted, #aaa)")}
//             onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)")}
//           >
//             Cancel
//           </button>

//           <button
//             onClick={handleMove}
//             disabled={!selectedVendor || moving || confirmed}
//             style={{
//               height: 36, padding: "0 18px", borderRadius: 8,
//               background: confirmed
//                 ? "rgba(34,197,94,0.9)"
//                 : !selectedVendor || moving
//                   ? "var(--color-surface, #f0f0ee)"
//                   : "var(--color-accent, #fd5000)",
//               border: "none", cursor: !selectedVendor || moving || confirmed ? "not-allowed" : "pointer",
//               color: !selectedVendor && !confirmed ? "var(--color-text-muted, #aaa)" : "#fff",
//               fontSize: 13, fontWeight: 700,
//               display: "inline-flex", alignItems: "center", gap: 6,
//               boxShadow: selectedVendor && !moving && !confirmed ? "0 4px 14px rgba(253,80,0,0.25)" : "none",
//               transition: "background 200ms, box-shadow 200ms",
//             }}
//           >
//             {confirmed ? (
//               <>
//                 <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
//                   <polyline points="3,7 6,10 11,4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
//                 </svg>
//                 Moved!
//               </>
//             ) : moving ? (
//               <><SpinnerIcon /> Moving…</>
//             ) : (
//               <>
//                 <MoveIcon />
//                 Confirm move
//                 {selectedVendor && (
//                   <span style={{
//                     fontSize: 11, padding: "1px 6px", borderRadius: 999,
//                     background: "rgba(255,255,255,0.2)", maxWidth: 90,
//                     overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
//                   }}>
//                     → {selectedVendor.business_name || "vendor"}
//                   </span>
//                 )}
//               </>
//             )}
//           </button>
//         </div>
//       </DialogContent>
//     </Dialog>
//   );
// }

// components/admin/MoveProductDialog.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { searchAdminVendors, moveProductToVendor } from "@/lib/actions/admin-products";
import { toast } from "sonner";

// ─── Icons ────────────────────────────────────────────────────────────────────
function MoveIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M2 6.5H11M8 3.5L11 6.5L8 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 3.5L2 6.5L5 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function SpinnerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"
      style={{ animation: "mpd-spin 0.7s linear infinite" }}>
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.25" />
      <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function StoreIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 6.5L3.2 2H12.8L14 6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1.5 6.5H14.5V14H1.5V6.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M6 14V10H10V14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M6 1L2 2.5V6C2 8.5 3.8 10.7 6 11.5C8.2 10.7 10 8.5 10 6V2.5L6 1Z"
        fill="rgba(34,197,94,0.15)" stroke="#16a34a" strokeWidth="1" />
      <polyline points="4,6 5.5,7.5 8,4.5" stroke="#16a34a" strokeWidth="1.1"
        strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="6.5" fill="var(--color-accent, #fd5000)" />
      <polyline points="4,7 6,9.5 10,4.5" stroke="#fff" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3 7H11M8 4L11 7L8 10" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function PackageStackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="6" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 6V5C4 3.9 4.9 3 6 3H10C11.1 3 12 3.9 12 5V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M5 9H11M5 11.5H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// ─── Vendor row in search results ─────────────────────────────────────────────
function VendorOption({
  v, isSelected, onSelect,
}: {
  v: any; isSelected: boolean; onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const hue = (v.business_name ?? "").split("").reduce((a: number, c: string) => a + c.charCodeAt(0), 0) % 360;

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 12px", cursor: "pointer",
        borderLeft: `3px solid ${isSelected ? "var(--color-accent, #fd5000)" : "transparent"}`,
        background: isSelected
          ? "rgba(253,80,0,0.04)"
          : hovered ? "var(--color-surface, #f8f8f7)" : "var(--color-bg, #fff)",
        transition: "background 120ms, border-color 120ms",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        {/* Avatar */}
        {v.avatar_url ? (
          <img src={v.avatar_url} alt={v.business_name}
            style={{ width: 32, height: 32, borderRadius: 8, objectFit: "cover", border: "0.5px solid var(--color-border)", flexShrink: 0 }} />
        ) : (
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: isSelected ? "rgba(253,80,0,0.1)" : `hsl(${hue},50%,92%)`,
            border: `0.5px solid ${isSelected ? "rgba(253,80,0,0.2)" : "var(--color-border)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 800,
            color: isSelected ? "var(--color-accent, #fd5000)" : `hsl(${hue},45%,35%)`,
            transition: "all 150ms",
          }}>
            {v.business_name?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
        )}

        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>
              {v.business_name || "Unnamed Store"}
            </span>
            {v.verification_status === "verified" && <ShieldIcon />}
            {!v.is_active && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 5px", borderRadius: 999, background: "rgba(148,163,184,0.15)", color: "#64748b", border: "0.5px solid rgba(148,163,184,0.25)" }}>
                Inactive
              </span>
            )}
          </div>
          <span style={{ fontSize: 11, color: "var(--color-text-muted, #888)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", maxWidth: 200 }}>
            {v.owner_email}
          </span>
        </div>
      </div>

      <div style={{ flexShrink: 0, marginLeft: 8 }}>
        {isSelected
          ? <CheckIcon />
          : <div style={{ width: 14, height: 14, borderRadius: "50%", border: "1.5px solid var(--color-border)" }} />
        }
      </div>
    </div>
  );
}

// ─── Main dialog ──────────────────────────────────────────────────────────────
interface MoveProductDialogProps {
  // ✅ Accepts single ID (row action) OR array of IDs (bulk action)
  productId?: string;
  productIds?: string[];
  currentVendorName?: string;
  // ✅ Callback so the table can deselect rows after a successful bulk move
  onSuccess?: () => void;
  // ✅ Custom trigger for bulk mode
  trigger?: React.ReactNode;
}

export function MoveProductDialog({
  productId,
  productIds,
  currentVendorName,
  onSuccess,
  trigger,
}: MoveProductDialogProps) {
  const ids = productIds ?? (productId ? [productId] : []);
  const isBulk = ids.length > 1;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [vendors, setVendors] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<any | null>(null);
  const [moving, setMoving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setQuery(""); setVendors([]); setSelectedVendor(null);
        setSearched(false); setConfirmed(false);
      }, 200);
    } else {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearched(false);
    setSelectedVendor(null);
    try {
      const res = await searchAdminVendors(query);
      if (res.success && res.vendors) {
        setVendors(res.vendors);
      } else {
        toast.error(res.error || "Failed to search vendors");
        setVendors([]);
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
      setVendors([]);
    } finally {
      setSearching(false);
      setSearched(true);
    }
  };

  const handleMove = async () => {
    if (!selectedVendor || ids.length === 0) return;
    setMoving(true);
    try {
      const res = await moveProductToVendor(ids, selectedVendor.id);
      if (res.success) {
        setConfirmed(true);
        setTimeout(() => {
          toast.success(
            isBulk
              ? `${ids.length} products moved to ${selectedVendor.business_name || "vendor"}`
              : `Product moved to ${selectedVendor.business_name || "vendor"}`
          );
          setOpen(false);
          onSuccess?.();
        }, 650);
      } else {
        toast.error(res.error || "Failed to move");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setMoving(false);
    }
  };

  const triggerEl = trigger ?? (
    <button
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        height: 30, padding: "0 10px", borderRadius: 6,
        fontSize: 12, fontWeight: 600, cursor: "pointer",
        border: "0.5px solid var(--color-border)",
        background: "var(--color-surface, #f8f8f7)",
        color: "var(--color-text-secondary)",
        transition: "border-color 150ms, color 150ms",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--color-accent, #fd5000)";
        (e.currentTarget as HTMLElement).style.color = "var(--color-accent, #fd5000)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)";
        (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)";
      }}
    >
      <MoveIcon /> Move
    </button>
  );

  return (
    <>
      <style>{`@keyframes mpd-spin { to { transform: rotate(360deg); } }`}</style>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{triggerEl}</DialogTrigger>

        <DialogContent style={{ padding: 0, overflow: "hidden", borderRadius: 16, maxWidth: 460, border: "0.5px solid var(--color-border)", boxShadow: "0 24px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)" }}>

          {/* ── Header ── */}
          <div style={{ padding: "20px 20px 0" }}>
            <DialogHeader>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: "rgba(253,80,0,0.08)", border: "0.5px solid rgba(253,80,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-accent, #fd5000)" }}>
                  {isBulk ? <PackageStackIcon /> : <MoveIcon />}
                </div>
                <div>
                  <DialogTitle style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
                    {isBulk ? `Move ${ids.length} products` : "Move product"}
                  </DialogTitle>
                  <DialogDescription style={{ fontSize: 12, margin: 0, color: "var(--color-text-muted, #888)" }}>
                    {isBulk
                      ? `All ${ids.length} selected products will be transferred to the new vendor`
                      : "Transfer ownership to a different vendor"
                    }
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* ── Bulk product count badge ── */}
            {isBulk && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, marginTop: 10, background: "rgba(253,80,0,0.05)", border: "0.5px solid rgba(253,80,0,0.15)" }}>
                <PackageStackIcon />
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 500 }}>
                  <strong style={{ color: "var(--color-accent, #fd5000)", fontWeight: 800 }}>{ids.length}</strong> products selected for transfer
                </span>
              </div>
            )}

            {/* ── From → To strip ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, marginTop: 10, background: "var(--color-surface, #f8f8f7)", border: "0.5px solid var(--color-border)" }}>
              <div style={{ fontSize: 11, color: "var(--color-text-muted, #888)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>From</div>
              <div style={{ width: 1, height: 16, background: "var(--color-border)" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 20, height: 20, borderRadius: 5, background: "rgba(253,80,0,0.08)", border: "0.5px solid rgba(253,80,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-accent, #fd5000)", flexShrink: 0 }}>
                  <StoreIcon size={11} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
                  {currentVendorName || (isBulk ? "Various vendors" : "Unassigned")}
                </span>
              </div>

              {selectedVendor && (
                <>
                  <div style={{ marginLeft: "auto", color: "var(--color-text-muted, #aaa)", display: "flex" }}>
                    <ArrowIcon />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 5, background: "rgba(34,197,94,0.08)", border: "0.5px solid rgba(34,197,94,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#16a34a", flexShrink: 0 }}>
                      <StoreIcon size={11} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#16a34a", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {selectedVendor.business_name || "Unnamed"}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Search ── */}
          <div style={{ padding: "12px 20px 0" }}>
            <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted, #aaa)", pointerEvents: "none" }}>
                  <SearchIcon />
                </span>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search vendor by name or email…"
                  style={{ width: "100%", boxSizing: "border-box", height: 36, paddingLeft: 32, paddingRight: 12, border: "0.5px solid var(--color-border)", borderRadius: 8, fontSize: 13, outline: "none", background: "var(--color-bg, #fff)", color: "var(--color-text-primary)", transition: "border-color 150ms" }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--color-accent, #fd5000)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")}
                />
              </div>
              <button
                type="submit"
                disabled={searching || !query.trim()}
                style={{ height: 36, width: 36, borderRadius: 8, flexShrink: 0, background: searching || !query.trim() ? "var(--color-surface, #f8f8f7)" : "var(--color-accent, #fd5000)", border: "0.5px solid var(--color-border)", color: searching || !query.trim() ? "var(--color-text-muted, #aaa)" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: searching || !query.trim() ? "not-allowed" : "pointer", transition: "background 150ms, color 150ms" }}
              >
                {searching ? <SpinnerIcon /> : <SearchIcon />}
              </button>
            </form>
          </div>

          {/* ── Results ── */}
          <div style={{ padding: "10px 20px 0", minHeight: 60 }}>
            {vendors.length > 0 && (
              <div style={{ border: "0.5px solid var(--color-border)", borderRadius: 10, overflow: "hidden", maxHeight: 220, overflowY: "auto" }}>
                {vendors.map((v) => (
                  <VendorOption
                    key={v.id}
                    v={v}
                    isSelected={selectedVendor?.id === v.id}
                    onSelect={() => setSelectedVendor(selectedVendor?.id === v.id ? null : v)}
                  />
                ))}
              </div>
            )}

            {searched && !searching && vendors.length === 0 && (
              <div style={{ padding: "24px 16px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 8, border: "0.5px dashed var(--color-border)", borderRadius: 10, background: "var(--color-surface, #f8f8f7)" }}>
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
                  <circle cx="18" cy="18" r="14" stroke="var(--color-border)" strokeWidth="1.2" fill="none" strokeDasharray="5 3" />
                  <circle cx="16" cy="14" r="4.5" stroke="var(--color-border)" strokeWidth="1.2" />
                  <path d="M19.5 18L23 21.5" stroke="var(--color-border)" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>No vendors found</p>
                <p style={{ fontSize: 12, color: "var(--color-text-muted, #888)", margin: 0 }}>Try a different name or email.</p>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px 18px", marginTop: 12, borderTop: "0.5px solid var(--color-border)", background: "var(--color-surface, #f8f8f7)" }}>
            <button
              onClick={() => setOpen(false)}
              disabled={moving}
              style={{ height: 36, padding: "0 14px", borderRadius: 8, border: "0.5px solid var(--color-border)", background: "var(--color-bg, #fff)", fontSize: 13, fontWeight: 600, cursor: moving ? "not-allowed" : "pointer", color: "var(--color-text-secondary)", transition: "border-color 150ms" }}
              onMouseEnter={(e) => !moving && ((e.currentTarget as HTMLElement).style.borderColor = "var(--color-text-muted)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)")}
            >
              Cancel
            </button>

            <button
              onClick={handleMove}
              disabled={!selectedVendor || moving || confirmed}
              style={{
                height: 36, padding: "0 16px", borderRadius: 8, border: "none",
                background: confirmed ? "#16a34a" : !selectedVendor || moving ? "var(--color-surface, #f0f0ee)" : "var(--color-accent, #fd5000)",
                cursor: !selectedVendor || moving || confirmed ? "not-allowed" : "pointer",
                color: !selectedVendor && !confirmed ? "var(--color-text-muted, #aaa)" : "#fff",
                fontSize: 13, fontWeight: 700,
                display: "inline-flex", alignItems: "center", gap: 6,
                boxShadow: selectedVendor && !moving && !confirmed ? "0 4px 14px rgba(253,80,0,0.25)" : "none",
                transition: "background 200ms, box-shadow 200ms",
              }}
            >
              {confirmed ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                    <polyline points="2.5,6.5 5.5,9.5 10.5,3.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {isBulk ? `${ids.length} moved!` : "Moved!"}
                </>
              ) : moving ? (
                <><SpinnerIcon /> Moving…</>
              ) : (
                <>
                  <MoveIcon />
                  {isBulk ? `Move ${ids.length} products` : "Confirm move"}
                  {selectedVendor && (
                    <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 999, background: "rgba(255,255,255,0.2)", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      → {selectedVendor.business_name || "vendor"}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}