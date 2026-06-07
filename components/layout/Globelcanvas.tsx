"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    Map, MapArc, MapMarker, MarkerContent, MarkerLabel, MapControls,
} from "@/components/ui/mapcn-map-arc";
import { TrendingUp, Users, ShoppingBag, DollarSign } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type RegionNode = {
    id: string;
    name: string;
    lat: number;
    lng: number;
    country_code: string;
    activeUsers: number;
    ordersToday: number;
    revenueToday: number;
    status: "online" | "quiet" | "offline";
};

type FlowArc = {
    id: string;
    from: [number, number];
    to: [number, number];
    volume: number;   // order count — drives color + width
    fromName: string;
    toName: string;
};

type LiveEvent = {
    id: string;
    text: string;
    amount: string;
    country: string;
    ts: number;
};

// ─── Country coordinates map ──────────────────────────────────────────────────

const COUNTRY_COORDS: Record<string, { lat: number; lng: number; name: string }> = {
    RW: { lat: -1.95, lng: 30.06, name: "Rwanda" },
    KE: { lat: -1.29, lng: 36.82, name: "Kenya" },
    NG: { lat: 6.52, lng: 3.38, name: "Nigeria" },
    ZA: { lat: -26.20, lng: 28.04, name: "South Africa" },
    GB: { lat: 51.51, lng: -0.13, name: "UK" },
    US: { lat: 40.71, lng: -74.01, name: "USA" },
    AE: { lat: 25.20, lng: 55.27, name: "UAE" },
    SG: { lat: 1.35, lng: 103.82, name: "Singapore" },
    CN: { lat: 35.86, lng: 104.20, name: "China" },
    IN: { lat: 20.59, lng: 78.96, name: "India" },
    UG: { lat: 1.37, lng: 32.29, name: "Uganda" },
    TZ: { lat: -6.37, lng: 34.89, name: "Tanzania" },
    ET: { lat: 9.15, lng: 40.49, name: "Ethiopia" },
    GH: { lat: 7.95, lng: -1.02, name: "Ghana" },
    FR: { lat: 46.23, lng: 2.21, name: "France" },
    DE: { lat: 51.17, lng: 10.45, name: "Germany" },
    CA: { lat: 56.13, lng: -106.35, name: "Canada" },
    AU: { lat: -25.27, lng: 133.78, name: "Australia" },
    JP: { lat: 36.20, lng: 138.25, name: "Japan" },
    BR: { lat: -14.24, lng: -51.93, name: "Brazil" },
};

const STATUS_COLOR = {
    online: "#22c55e",
    quiet: "#f59e0b",
    offline: "#ef4444",
} as const;

function fmtMoney(n: number): string {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
}

function fmtCount(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
}

// ─── Main component ───────────────────────────────────────────────────────────

export function GlobeCanvas() {
    const supabase = createClient();

    const [nodes, setNodes] = useState<RegionNode[]>([]);
    const [arcs, setArcs] = useState<FlowArc[]>([]);
    const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
    const [selectedNode, setSelectedNode] = useState<RegionNode | null>(null);
    const [stats, setStats] = useState({
        totalOrders: 0,
        totalRevenue: 0,
        activeUsers: 0,
        countries: 0,
    });
    const [loading, setLoading] = useState(true);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    // ── Fetch snapshot data ───────────────────────────────────────────────────
    useEffect(() => {
        async function load() {
            setLoading(true);
            const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

            const [
                { data: ordersRaw },
                { data: profilesRaw },
                { count: userCount },
            ] = await Promise.all([
                // Paid orders in last 24h with shipping country + amount
                supabase
                    .from("orders")
                    .select("id, total_amount, currency, shipping_address, created_at, profiles!orders_buyer_id_fkey(country)")
                    .eq("payment_status", "paid")
                    .gte("paid_at", since24h)
                    .order("created_at", { ascending: false })
                    .limit(500),

                // Profiles with country for active user count
                supabase
                    .from("profiles")
                    .select("country")
                    .eq("is_active", true)
                    .limit(2000),

                // Total active users
                supabase
                    .from("profiles")
                    .select("*", { count: "exact", head: true })
                    .eq("is_active", true),
            ]);

            type OrderRow = {
                id: string;
                total_amount: number | null;
                currency: string | null;
                shipping_address: Record<string, string> | null;
                created_at: string;
            };
            const orders = (ordersRaw ?? []) as OrderRow[];
            const profiles = profilesRaw ?? [];

            // ── Build region nodes from order data ──
            const regionMap: Record<string, {
                orders: number; revenue: number; userCodes: Set<string>;
            }> = {};

            for (const order of orders) {
                const addr = order.shipping_address;
                const code = addr?.country_code ?? addr?.country ?? "RW";
                const upper = code.toUpperCase().slice(0, 2);
                if (!COUNTRY_COORDS[upper]) continue;
                if (!regionMap[upper]) regionMap[upper] = { orders: 0, revenue: 0, userCodes: new Set() };
                regionMap[upper].orders++;
                regionMap[upper].revenue += Number(order.total_amount ?? 0);
            }

            // Add user counts per country
            for (const p of profiles) {
                const code = (p.country ?? "RW").toUpperCase().slice(0, 2);
                if (!regionMap[code]) regionMap[code] = { orders: 0, revenue: 0, userCodes: new Set() };
                regionMap[code].userCodes.add(code + Math.random()); // approximate unique count
            }

            const builtNodes: RegionNode[] = Object.entries(regionMap)
                .filter(([code]) => COUNTRY_COORDS[code])
                .map(([code, data]) => {
                    const coords = COUNTRY_COORDS[code];
                    const status: RegionNode["status"] = data.orders > 10 ? "online" : data.orders > 0 ? "quiet" : "offline";
                    return {
                        id: code,
                        name: coords.name,
                        lat: coords.lat,
                        lng: coords.lng,
                        country_code: code,
                        activeUsers: data.userCodes.size,
                        ordersToday: data.orders,
                        revenueToday: data.revenue,
                        status,
                    };
                })
                .sort((a, b) => b.ordersToday - a.ordersToday);

            // ── Merge with full country list to render denser nodes (even if zero activity) ──
            const builtMap: Record<string, RegionNode> = {};
            for (const n of builtNodes) builtMap[n.country_code] = n;

            const mergedNodes: RegionNode[] = Object.keys(COUNTRY_COORDS)
                .map((code) => {
                    const upper = code.toUpperCase().slice(0, 2);
                    if (builtMap[upper]) return builtMap[upper];
                    const coords = COUNTRY_COORDS[upper];
                    return {
                        id: upper,
                        name: coords.name,
                        lat: coords.lat,
                        lng: coords.lng,
                        country_code: upper,
                        activeUsers: 0,
                        ordersToday: 0,
                        revenueToday: 0,
                        status: "offline",
                    } as RegionNode;
                })
                .sort((a, b) => b.ordersToday - a.ordersToday);

            // ── Build flow arcs: top source countries → Rwanda hub ──
            const rwCoords = COUNTRY_COORDS["RW"];
            const builtArcs: FlowArc[] = [];
            const seen = new Set<string>();

            for (const node of builtNodes) {
                if (node.country_code === "RW") continue;
                const arcId = `${node.country_code}-RW`;
                if (seen.has(arcId)) continue;
                seen.add(arcId);
                builtArcs.push({
                    id: arcId,
                    from: [node.lng, node.lat],
                    to: [rwCoords.lng, rwCoords.lat],
                    volume: node.ordersToday,
                    fromName: node.name,
                    toName: "Rwanda",
                });
            }

            // Also arcs between top 5 nodes (marketplace flow)
            const top5 = builtNodes.slice(0, 5);
            for (let i = 0; i < top5.length - 1; i++) {
                const a = top5[i], b = top5[i + 1];
                if (a.country_code === "RW" || b.country_code === "RW") continue;
                builtArcs.push({
                    id: `${a.country_code}-${b.country_code}`,
                    from: [a.lng, a.lat],
                    to: [b.lng, b.lat],
                    volume: Math.min(a.ordersToday, b.ordersToday),
                    fromName: a.name,
                    toName: b.name,
                });
            }

            // ── Global stats ──
            const totalRevenue = orders.reduce((s: number, o) => s + Number(o.total_amount ?? 0), 0);
            const countryCodes = new Set(
                orders.map((o) => {
                    const addr = o.shipping_address;
                    return (addr?.country_code ?? addr?.country ?? "").toUpperCase().slice(0, 2);
                }).filter((c) => COUNTRY_COORDS[c]),
            );

            // ── Live events from recent orders ──
            const events: LiveEvent[] = orders.slice(0, 5).map((o) => {
                const addr = o.shipping_address;
                const country = COUNTRY_COORDS[(addr?.country_code ?? "RW").toUpperCase().slice(0, 2)]?.name ?? "Unknown";
                return {
                    id: o.id,
                    text: "New order placed",
                    amount: fmtMoney(Number(o.total_amount ?? 0)),
                    country,
                    ts: new Date(o.created_at).getTime(),
                };
            });

            setNodes(mergedNodes);
            setArcs(builtArcs);
            setLiveEvents(events);
            setStats({
                totalOrders: orders.length,
                totalRevenue,
                activeUsers: userCount ?? 0,
                countries: countryCodes.size,
            });
            setLoading(false);
        }

        load();
    }, []);

    // ── Realtime: new paid orders ─────────────────────────────────────────────
    useEffect(() => {
        const channel = supabase
            .channel("globe-orders")
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "orders",
                    filter: "payment_status=eq.paid",
                },
                (payload: { new: Record<string, unknown> }) => {
                    const order = payload.new;
                    const addr = order.shipping_address as Record<string, string> | null;
                    const code = ((addr?.country_code ?? addr?.country ?? "RW") as string).toUpperCase().slice(0, 2);
                    const country = COUNTRY_COORDS[code]?.name ?? "Unknown";

                    // Add live event
                    setLiveEvents((prev) => [
                        {
                            id: order.id as string,
                            text: "New order paid",
                            amount: fmtMoney(Number(order.total_amount ?? 0)),
                            country,
                            ts: Date.now(),
                        },
                        ...prev.slice(0, 4),
                    ]);

                    // Update node stats
                    setNodes((prev) =>
                        prev.map((n) =>
                            n.country_code === code
                                ? {
                                    ...n,
                                    ordersToday: n.ordersToday + 1,
                                    revenueToday: n.revenueToday + Number(order.total_amount ?? 0),
                                    status: "online",
                                }
                                : n,
                        ),
                    );

                    // Update global stats
                    setStats((prev) => ({
                        ...prev,
                        totalOrders: prev.totalOrders + 1,
                        totalRevenue: prev.totalRevenue + Number(order.total_amount ?? 0),
                    }));
                },
            )
            .subscribe();

        channelRef.current = channel;
        return () => { supabase.removeChannel(channel); };
    }, []);

    // ── Arc color + width by volume ───────────────────────────────────────────
    const arcData = arcs.map((arc) => ({
        id: arc.id,
        from: arc.from,
        to: arc.to,
        color: arc.volume > 20 ? "#fd5000" : arc.volume > 5 ? "#fda000" : "rgba(253,160,0,0.45)",
        width: arc.volume > 20 ? 2.5 : arc.volume > 5 ? 1.5 : 0.8,
    }));

    return (
        <div className="flex flex-col gap-3">
            <div className="relative w-full overflow-hidden rounded-3xl" style={{ aspectRatio: "520 / 480" }}>
                <Map
                    center={[25, 5]}
                    zoom={2}
                    projection={{ type: "globe" }}
                    className="h-full w-full rounded-3xl"
                    loading={loading}
                >
                    {/* Order flow arcs */}
                    <MapArc
                        data={arcData}
                        curvature={0.28}
                        paint={{
                            "line-color": ["get", "color"],
                            "line-width": ["get", "width"],
                            "line-opacity": 0.72,
                        }}
                        hoverPaint={{ "line-opacity": 1, "line-width": 3.5 }}
                        interactive
                    />

                    {/* Region markers */}
                    {nodes.map((node) => (
                        <MapMarker
                            key={node.id}
                            longitude={node.lng}
                            latitude={node.lat}
                            onClick={() => setSelectedNode((p) => p?.id === node.id ? null : node)}
                        >
                            <MarkerContent>
                                <div className="relative flex items-center justify-center cursor-pointer">
                                    {node.status === "online" && node.ordersToday > 0 && (
                                        <span
                                            className="absolute inline-flex h-4 w-4 animate-ping rounded-full opacity-60"
                                            style={{ backgroundColor: STATUS_COLOR[node.status] }}
                                        />
                                    )}
                                    <span
                                        className="relative inline-flex rounded-full border-2 border-white shadow-lg"
                                        style={{
                                            width: node.ordersToday > 20 ? 14 : node.ordersToday > 5 ? 11 : 6,
                                            height: node.ordersToday > 20 ? 14 : node.ordersToday > 5 ? 11 : 6,
                                            backgroundColor: STATUS_COLOR[node.status],
                                            opacity: node.ordersToday === 0 ? 0.85 : 1,
                                        }}
                                    />
                                </div>
                                {(node.ordersToday > 0 || selectedNode?.id === node.id) && (
                                    <MarkerLabel
                                        position="top"
                                        className="rounded-sm bg-black/75 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur"
                                    >
                                        {node.name}
                                    </MarkerLabel>
                                )}
                            </MarkerContent>
                        </MapMarker>
                    ))}

                </Map>



                {/* ── Stats bar ── */}
                <div
                    className="pointer-events-none absolute bottom-3 left-3 right-14 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl px-3 py-2"
                    style={{
                        background: "color-mix(in srgb, var(--color-surface) 90%, transparent)",
                        border: "1px solid var(--color-border)",
                        boxShadow: "var(--shadow-md)",
                    }}
                >
                    {[
                        { icon: ShoppingBag, label: "Orders today", val: fmtCount(stats.totalOrders) },
                        { icon: DollarSign, label: "Revenue today", val: fmtMoney(stats.totalRevenue) },
                        { icon: Users, label: "Active users", val: fmtCount(stats.activeUsers) },
                        { icon: TrendingUp, label: "Countries", val: String(stats.countries) },
                    ].map(({ icon: Icon, label, val }) => (
                        <div key={label} className="flex items-center gap-1.5 text-[10px]">
                            <Icon className="size-3" style={{ color: "var(--color-accent)" }} />
                            <span style={{ color: "var(--color-text-muted)" }}>{label}</span>
                            <span className="font-bold" style={{ color: "var(--color-text-primary)" }}>{val}</span>
                        </div>
                    ))}
                </div>

                {/* ── Node detail panel ── */}
                {selectedNode && (
                    <div
                        className="absolute top-3 right-3 rounded-xl p-3 text-[11px]"
                        style={{
                            background: "color-mix(in srgb, var(--color-surface) 95%, transparent)",
                            border: `1px solid ${STATUS_COLOR[selectedNode.status]}44`,
                            minWidth: 170,
                            boxShadow: "var(--shadow-lg)",
                            color: "var(--color-text-primary)",
                        }}
                    >
                        <div className="mb-2.5 flex items-center justify-between gap-3">
                            <span className="font-black" style={{ color: "var(--color-text-primary)" }}>
                                {selectedNode.name}
                            </span>
                            <span
                                className="rounded-full px-2 py-0.5 text-[9px] font-bold capitalize"
                                style={{
                                    background: `${STATUS_COLOR[selectedNode.status]}18`,
                                    color: STATUS_COLOR[selectedNode.status],
                                    border: `1px solid ${STATUS_COLOR[selectedNode.status]}33`,
                                }}
                            >
                                {selectedNode.status}
                            </span>
                        </div>
                        <div className="space-y-1.5">
                            {[
                                { label: "Orders today", val: selectedNode.ordersToday.toLocaleString() },
                                { label: "Revenue today", val: fmtMoney(selectedNode.revenueToday) },
                                { label: "Active users", val: selectedNode.activeUsers.toLocaleString() },
                            ].map(({ label, val }) => (
                                <div key={label} className="flex items-center justify-between gap-4">
                                    <span style={{ color: "var(--color-text-muted)" }}>{label}</span>
                                    <span className="font-bold" style={{ color: "var(--color-text-primary)" }}>{val}</span>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => setSelectedNode(null)}
                            className="mt-3 w-full rounded-lg py-1 text-[9px] font-semibold transition-colors"
                            style={{
                                border: "1px solid var(--color-border)",
                                color: "var(--color-text-muted)",
                            }}
                        >
                            Close
                        </button>
                    </div>
                )}

            </div>

            {/* ── Recent activity feed — below globe ── */}
            {liveEvents.length > 0 && (
                <div className="mt-3 flex flex-col gap-1.5">
                    {liveEvents.slice(0, 3).map((ev) => (
                        <div
                            key={ev.id}
                            className="flex items-center gap-2 rounded-xl px-3 py-2 text-[10px]"
                            style={{
                                background: "color-mix(in srgb, var(--color-surface) 95%, transparent)",
                                border: "1px solid var(--color-border)",
                                boxShadow: "var(--shadow-sm)",
                            }}
                        >
                            <span
                                className="size-1.5 shrink-0 rounded-full"
                                style={{ backgroundColor: "var(--color-success)" }}
                            />
                            <span className="truncate" style={{ color: "var(--color-text-muted)" }}>
                                {ev.text} · {ev.country}
                            </span>
                            <span
                                className="ml-auto shrink-0 font-bold"
                                style={{ color: "var(--color-accent)" }}
                            >
                                {ev.amount}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}