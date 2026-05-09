// "use client";

// import Link from "next/link";
// import { Package, Star } from "lucide-react";
// import { useState } from "react";

// export function VendorRow({ v, last }: { v: any; last: boolean }) {
//     const [hovered, setHovered] = useState(false);
//     const logo = v.business_logo;
//     const initials = (v.business_name ?? "?").slice(0, 2).toUpperCase();
//     const joined = v.created_at ? new Date(v.created_at) : null;
//     const joinedStr = joined
//         ? joined.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
//         : "—";

//     return (
//         <Link
//             href={`/admin/vendors/${v.id}`}
//             onMouseEnter={() => setHovered(true)}
//             onMouseLeave={() => setHovered(false)}
//             style={{
//                 display: "grid",
//                 gridTemplateColumns: "2.5fr 1.5fr 90px 90px 100px 110px",
//                 gap: 12,
//                 padding: "11px 16px",
//                 alignItems: "center",
//                 borderBottom: last ? "none" : "0.5px solid var(--color-border)",
//                 background: hovered
//                     ? "var(--color-surface-secondary,#f9f9f9)"
//                     : "var(--color-surface,#fff)",
//                 textDecoration: "none",
//                 transition: "background 0.12s",
//             }}
//         >
//             {/* Store */}
//             <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
//                 {logo ? (
//                     <img
//                         src={logo}
//                         alt=""
//                         width={32}
//                         height={32}
//                         style={{
//                             borderRadius: 7,
//                             objectFit: "cover",
//                             flexShrink: 0,
//                             border: "0.5px solid var(--color-border)",
//                         }}
//                     />
//                 ) : (
//                     <div
//                         style={{
//                             width: 32, height: 32, borderRadius: 7, flexShrink: 0,
//                             background: "var(--color-accent-light,#fff3ee)",
//                             color: "var(--color-accent,#fd5000)",
//                             display: "flex", alignItems: "center", justifyContent: "center",
//                             fontSize: 11, fontWeight: 700,
//                             border: "0.5px solid rgba(253,80,0,0.15)",
//                         }}
//                     >
//                         {initials}
//                     </div>
//                 )}
//                 <div style={{ minWidth: 0 }}>
//                     <div
//                         style={{
//                             fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)",
//                             whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
//                         }}
//                     >
//                         {v.business_name ?? "—"}
//                     </div>
//                     {v.business_country && (
//                         <div style={{ fontSize: 11, color: "var(--color-text-muted,#888)", marginTop: 1 }}>
//                             {v.business_country}
//                             {v.business_type && (
//                                 <span style={{ marginLeft: 5, opacity: 0.7 }}>· {v.business_type}</span>
//                             )}
//                         </div>
//                     )}
//                 </div>
//             </div>

//             {/* Owner */}
//             <div style={{ minWidth: 0 }}>
//                 <div
//                     style={{
//                         fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)",
//                         whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
//                     }}
//                 >
//                     {v.owner_name ?? "—"}
//                 </div>
//                 <div
//                     style={{
//                         fontSize: 11, color: "var(--color-text-muted,#888)",
//                         whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
//                     }}
//                 >
//                     {v.owner_email ?? ""}
//                 </div>
//             </div>

//             {/* Products */}
//             <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
//                 <Package size={12} style={{ color: "var(--color-text-muted,#888)", flexShrink: 0 }} />
//                 <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
//                     {v.products_count ?? 0}
//                 </span>
//             </div>

//             {/* Rating */}
//             <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
//                 {v.rating && Number(v.rating) > 0 ? (
//                     <>
//                         <Star size={11} style={{ color: "#f0b429", flexShrink: 0 }} fill="#f0b429" />
//                         <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
//                             {Number(v.rating).toFixed(1)}
//                         </span>
//                     </>
//                 ) : (
//                     <span style={{ fontSize: 12, color: "var(--color-text-muted,#888)" }}>—</span>
//                 )}
//             </div>

//             {/* Verification status */}
//             <VerificationBadge status={v.verification_status} isActive={v.is_active} />

//             {/* Joined */}
//             <span style={{ fontSize: 11, color: "var(--color-text-muted,#888)" }}>
//                 {joinedStr}
//             </span>
//         </Link>
//     );
// }

// function VerificationBadge({
//     status,
//     isActive,
// }: {
//     status: string;
//     isActive: boolean;
// }) {
//     const map: Record<string, { label: string; bg: string; fg: string; border: string }> = {
//         verified: { label: "Verified", bg: "rgba(48,164,108,0.08)", fg: "#30a46c", border: "rgba(48,164,108,0.2)" },
//         pending: { label: "Pending", bg: "rgba(240,180,41,0.08)", fg: "#b45309", border: "rgba(240,180,41,0.25)" },
//         rejected: { label: "Rejected", bg: "rgba(229,72,77,0.08)", fg: "#e5484d", border: "rgba(229,72,77,0.2)" },
//         suspended: { label: "Suspended", bg: "rgba(100,116,139,0.08)", fg: "#475569", border: "rgba(100,116,139,0.2)" },
//     };
//     const s = map[status] ?? map.pending;
//     return (
//         <span
//             style={{
//                 display: "inline-flex", alignItems: "center", gap: 5,
//                 fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 5,
//                 background: s.bg, color: s.fg, border: `0.5px solid ${s.border}`,
//                 whiteSpace: "nowrap",
//             }}
//         >
//             <span
//                 style={{
//                     width: 5, height: 5, borderRadius: "50%",
//                     background: s.fg, flexShrink: 0,
//                 }}
//             />
//             {s.label}
//             {!isActive && status === "verified" && (
//                 <span style={{ opacity: 0.6, fontWeight: 400 }}> · inactive</span>
//             )}
//         </span>
//     );
// }

"use client";

// components/admin/vendors/vendor-data.tsx

import Link from "next/link";
import { Package, Star, Users, TrendingUp, Sparkles } from "lucide-react";
import { useState } from "react";

export function VendorRow({ v, last }: { v: any; last: boolean }) {
    const [hovered, setHovered] = useState(false);

    // ── Avatar resolution ────────────────────────────────────────────────────
    // Priority: business_logo (vendor brand) → owner avatar_url → initials
    const logo = v.business_logo ?? null;
    const ownerAvatar = v.owner_avatar ?? null;
    const displayImage = logo ?? ownerAvatar ?? null;
    const initials = (v.business_name ?? "?").slice(0, 2).toUpperCase();

    const joined = v.created_at ? new Date(v.created_at) : null;
    const joinedStr = joined
        ? joined.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "—";

    function fmt(n: number) {
        if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
        if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
        return String(n);
    }

    return (
        <Link
            href={`/admin/vendors/${v.id}`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: "grid",
                // Store | Owner | Products | Revenue | Sales | Rating | Status | Joined
                gridTemplateColumns: "2.4fr 1.3fr 80px 90px 90px 90px 100px 104px",
                gap: 8,
                padding: "10px 16px",
                alignItems: "center",
                borderBottom: last ? "none" : "0.5px solid var(--color-border)",
                background: hovered ? "var(--color-surface-secondary)" : "var(--color-surface)",
                textDecoration: "none",
                transition: "background 0.12s",
            }}
        >
            {/* ── Store ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                {/* Avatar */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                    {displayImage ? (
                        <img
                            src={displayImage}
                            alt={v.business_name}
                            width={34}
                            height={34}
                            style={{
                                borderRadius: 8,
                                objectFit: "cover",
                                border: "0.5px solid var(--color-border)",
                                display: "block",
                            }}
                            // Fallback: if img fails to load, hide it — the initials div
                            // below won't show, so we use onError to swap src to empty
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                                const parent = (e.target as HTMLImageElement).parentElement;
                                if (parent) {
                                    const fallback = parent.querySelector("[data-initials]") as HTMLElement;
                                    if (fallback) fallback.style.display = "flex";
                                }
                            }}
                        />
                    ) : null}

                    {/* Initials fallback — shown when no image or image fails */}
                    <div
                        data-initials
                        style={{
                            width: 34, height: 34, borderRadius: 8,
                            background: "var(--color-accent-light)",
                            color: "var(--color-accent)",
                            display: displayImage ? "none" : "flex",
                            alignItems: "center", justifyContent: "center",
                            fontSize: 11, fontWeight: 700,
                            border: "0.5px solid rgba(253,80,0,0.15)",
                            flexShrink: 0,
                        }}
                    >
                        {initials}
                    </div>

                    {/* Featured star badge */}
                    {v.is_featured && (
                        <div style={{
                            position: "absolute", bottom: -3, right: -3,
                            width: 14, height: 14, borderRadius: "50%",
                            background: "#f0b429",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            border: "1.5px solid var(--color-surface)",
                        }}>
                            <Sparkles size={7} color="#fff" />
                        </div>
                    )}
                </div>

                {/* Name + country + type */}
                <div style={{ minWidth: 0 }}>
                    <div style={{
                        fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                        {v.business_name ?? "—"}
                    </div>
                    {(v.business_country || v.business_type) && (
                        <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 1 }}>
                            {v.business_country}
                            {v.business_country && v.business_type && (
                                <span style={{ margin: "0 4px", opacity: 0.5 }}>·</span>
                            )}
                            {v.business_type}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Owner ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                {/* Owner avatar */}
                {v.owner_avatar ? (
                    <img
                        src={v.owner_avatar}
                        alt=""
                        width={22}
                        height={22}
                        style={{
                            borderRadius: "50%", objectFit: "cover", flexShrink: 0,
                            border: "0.5px solid var(--color-border)",
                        }}
                    />
                ) : (
                    <div style={{
                        width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                        background: "var(--color-surface-secondary)",
                        border: "0.5px solid var(--color-border)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9, fontWeight: 700, color: "var(--color-text-muted)",
                    }}>
                        {(v.owner_name ?? "?").slice(0, 1).toUpperCase()}
                    </div>
                )}
                <div style={{ minWidth: 0 }}>
                    <div style={{
                        fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                        {v.owner_name ?? "—"}
                    </div>
                    <div style={{
                        fontSize: 11, color: "var(--color-text-muted)",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                        {v.owner_email ?? ""}
                    </div>
                </div>
            </div>

            {/* ── Products ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Package size={11} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
                    {v.products_count ?? 0}
                </span>
            </div>

            {/* ── Revenue ── */}
            <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)" }}>
                    {fmt(Number(v.total_revenue ?? 0))}
                </div>
                <div style={{ fontSize: 10, color: "var(--color-text-muted)" }}>RWF</div>
            </div>

            {/* ── Sales ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <TrendingUp size={11} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
                    {fmt(Number(v.total_sales ?? 0))}
                </span>
            </div>

            {/* ── Rating ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {v.rating && Number(v.rating) > 0 ? (
                    <>
                        <Star size={11} style={{ color: "#f0b429", flexShrink: 0 }} fill="#f0b429" />
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
                            {Number(v.rating).toFixed(1)}
                        </span>
                        {v.follower_count > 0 && (
                            <span style={{ fontSize: 10, color: "var(--color-text-muted)", marginLeft: 2 }}>
                                · <Users size={9} style={{ display: "inline", verticalAlign: "middle" }} /> {fmt(v.follower_count)}
                            </span>
                        )}
                    </>
                ) : (
                    <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>—</span>
                )}
            </div>

            {/* ── Verification status ── */}
            <VerificationBadge status={v.verification_status} isActive={v.is_active} />

            {/* ── Joined ── */}
            <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                {joinedStr}
            </span>
        </Link>
    );
}

function VerificationBadge({
    status,
    isActive,
}: {
    status: string;
    isActive: boolean;
}) {
    const map: Record<string, { label: string; bg: string; fg: string; border: string }> = {
        verified: { label: "Verified", bg: "rgba(48,164,108,0.08)", fg: "#30a46c", border: "rgba(48,164,108,0.2)" },
        pending: { label: "Pending", bg: "rgba(240,180,41,0.08)", fg: "#b45309", border: "rgba(240,180,41,0.25)" },
        rejected: { label: "Rejected", bg: "rgba(229,72,77,0.08)", fg: "#e5484d", border: "rgba(229,72,77,0.2)" },
        suspended: { label: "Suspended", bg: "rgba(100,116,139,0.08)", fg: "#475569", border: "rgba(100,116,139,0.2)" },
    };
    const s = map[status] ?? map.pending;

    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 5,
            background: s.bg, color: s.fg, border: `0.5px solid ${s.border}`,
            whiteSpace: "nowrap",
        }}>
            <span style={{
                width: 5, height: 5, borderRadius: "50%",
                background: s.fg, flexShrink: 0,
            }} />
            {s.label}
            {!isActive && status === "verified" && (
                <span style={{ opacity: 0.6, fontWeight: 400 }}> · off</span>
            )}
        </span>
    );
}