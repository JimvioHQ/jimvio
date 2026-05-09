
"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Shield, CheckCircle, Globe, Plus, Minus, RotateCcw, Locate } from "lucide-react";

/* ─── Animation variants ─────────────────────────────────────────────────── */
const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = { show: { transition: { staggerChildren: 0.08 } } };

/* ─── Types ──────────────────────────────────────────────────────────────── */
type LatLng = [number, number];
type Vec3 = { x: number; y: number; z: number };
type Quat = { w: number; x: number; y: number; z: number };

/* ─── Zoom constants ─────────────────────────────────────────────────────── */
const R_DEFAULT = 155, R_MIN = 100, R_MAX = 230;

const DEFAULT_LOC = { lat: -1.95, lng: 30.06, label: "Kigali" };

/* ─── Quaternion math ────────────────────────────────────────────────────── */
const qMul = (a: Quat, b: Quat): Quat => ({
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
});
const qNorm = (q: Quat): Quat => {
    const m = Math.sqrt(q.w ** 2 + q.x ** 2 + q.y ** 2 + q.z ** 2) || 1;
    return { w: q.w / m, x: q.x / m, y: q.y / m, z: q.z / m };
};
const qRot = (q: Quat, v: Vec3): Vec3 => {
    const p = qMul(q, { w: 0, x: v.x, y: v.y, z: v.z });
    const r = qMul(p, { w: q.w, x: -q.x, y: -q.y, z: -q.z });
    return { x: r.x, y: r.y, z: r.z };
};
const qAA = (ax: number, ay: number, az: number, angle: number): Quat => {
    const s = Math.sin(angle / 2);
    return { w: Math.cos(angle / 2), x: ax * s, y: ay * s, z: az * s };
};
const qSlerp = (a: Quat, b: Quat, t: number): Quat => {
    let d = a.w * b.w + a.x * b.x + a.y * b.y + a.z * b.z;
    if (d < 0) { b = { w: -b.w, x: -b.x, y: -b.y, z: -b.z }; d = -d; }
    if (d > 0.9999) return qNorm({ w: a.w + t * (b.w - a.w), x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y), z: a.z + t * (b.z - a.z) });
    const t0 = Math.acos(d), st = Math.sin(t0);
    const s0 = Math.sin((1 - t) * t0) / st, s1 = Math.sin(t * t0) / st;
    return qNorm({ w: s0 * a.w + s1 * b.w, x: s0 * a.x + s1 * b.x, y: s0 * a.y + s1 * b.y, z: s0 * a.z + s1 * b.z });
};
const latLngToQuat = (lat: number, lng: number): Quat =>
    qNorm(qMul(qAA(1, 0, 0, lat * Math.PI / 180), qAA(0, 1, 0, -((lng + 90) * Math.PI / 180))));

/* ─── Geo helpers ────────────────────────────────────────────────────────── */
function latLngTo3D(lat: number, lng: number, r: number): Vec3 {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = (lng + 180) * Math.PI / 180;
    return { x: -(r * Math.sin(phi) * Math.cos(theta)), y: r * Math.cos(phi), z: r * Math.sin(phi) * Math.sin(theta) };
}
function slerp3(p1: Vec3, p2: Vec3, t: number): Vec3 {
    const d = Math.max(-1, Math.min(1, p1.x * p2.x + p1.y * p2.y + p1.z * p2.z));
    const o = Math.acos(d); if (o < 1e-6) return p1;
    const s = Math.sin(o), a = Math.sin((1 - t) * o) / s, b = Math.sin(t * o) / s;
    return { x: a * p1.x + b * p2.x, y: a * p1.y + b * p2.y, z: a * p1.z + b * p2.z };
}

/* ─── Scene data ─────────────────────────────────────────────────────────── */
const CITIES: Record<string, { lat: number; lng: number }> = {
    "Lagos": { lat: 6.5, lng: 3.4 }, "London": { lat: 51.5, lng: -0.1 },
    "New York": { lat: 40.7, lng: -74.0 }, "Tokyo": { lat: 35.7, lng: 139.7 },
    "Singapore": { lat: 1.3, lng: 103.8 }, "Dubai": { lat: 25.3, lng: 55.3 },
    "São Paulo": { lat: -23.5, lng: -46.6 }, "Sydney": { lat: -33.9, lng: 151.2 },
    "Mumbai": { lat: 19.1, lng: 72.9 }, "Nairobi": { lat: -1.3, lng: 36.8 },
    "Cairo": { lat: 30.0, lng: 31.2 }, "Mexico City": { lat: 19.4, lng: -99.1 },
    "Kigali": { lat: -1.95, lng: 30.06 }, "Johannesburg": { lat: -26.2, lng: 28.0 },
};
const ROUTES = [
    { from: "Lagos", to: "London", amount: "$1,240" }, { from: "New York", to: "São Paulo", amount: "$890" },
    { from: "London", to: "Mumbai", amount: "$2,100" }, { from: "Tokyo", to: "Singapore", amount: "$540" },
    { from: "Dubai", to: "Nairobi", amount: "$720" }, { from: "Sydney", to: "Tokyo", amount: "$1,580" },
    { from: "Mexico City", to: "New York", amount: "$320" }, { from: "Cairo", to: "Dubai", amount: "$960" },
    { from: "Kigali", to: "London", amount: "$430" }, { from: "Johannesburg", to: "Mumbai", amount: "$1,120" },
    { from: "Singapore", to: "Sydney", amount: "$2,300" }, { from: "Mumbai", to: "Nairobi", amount: "$680" },
];
type Arc = { from: Vec3; to: Vec3; progress: number; speed: number; amount: string; color: string; route: string };

function tokens(isDark: boolean) {
    return {
        badgeBg: isDark ? "rgba(10,5,0,0.90)" : "rgba(255,255,255,0.95)",
        badgeBorder: isDark ? "rgba(253,80,0,0.22)" : "rgba(253,80,0,0.28)",
        labelColor: isDark ? "rgba(255,255,255,0.50)" : "rgba(0,0,0,0.45)",
        legendColor: isDark ? "rgba(255,255,255,0.80)" : "rgba(0,0,0,0.75)",
        tooltipBg: isDark ? "#1a0a00" : "#ffffff",
        tooltipBdr: isDark ? "rgba(253,80,0,0.35)" : "rgba(253,80,0,0.25)",
        tooltipSub: isDark ? "rgba(255,255,255,0.50)" : "rgba(0,0,0,0.45)",
        controlBg: isDark ? "rgba(20,10,5,0.82)" : "rgba(255,255,255,0.92)",
        controlBdr: isDark ? "rgba(253,80,0,0.25)" : "rgba(253,80,0,0.22)",
        controlIcon: isDark ? "rgba(255,255,255,0.85)" : "rgba(40,20,10,0.85)",
    };
}

/* ─── GlobeCanvas ────────────────────────────────────────────────────────── */
function GlobeCanvas() {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const cwRef = useRef(520);
    const chRef = useRef(440);

    const quatRef = useRef<Quat>(latLngToQuat(DEFAULT_LOC.lat, DEFAULT_LOC.lng));
    const targetQuatRef = useRef<Quat | null>(null);
    const radiusRef = useRef(R_DEFAULT);
    const targetZoomRef = useRef(180);
    const rafRef = useRef<number>(0);
    const isDarkRef = useRef(false);

    const draggingRef = useRef(false);
    const lastXRef = useRef(0), lastYRef = useRef(0);
    const velXRef = useRef(0), velYRef = useRef(0);
    const movedRef = useRef(0);
    const pinchRef = useRef<number | null>(null);

    const userLocRef = useRef<{ lat: number; lng: number; label: string } | null>(DEFAULT_LOC);
    const userProjRef = useRef<{ x: number; y: number; visible: boolean } | null>(null);
    const countriesRef = useRef<{ rings: LatLng[][] }[]>([]);
    const starsRef = useRef<{ x: number; y: number; r: number; tw: number }[]>([]);
    const arcsRef = useRef<Arc[]>([]);

    const [isDark, setIsDark] = useState(false);
    const [liveTx, setLiveTx] = useState("$840 / min");
    const [users, setUsers] = useState("9,200");
    const [locAccuracy, setLocAccuracy] = useState<"city" | "exact">("city");
    const [tooltip, setTooltip] = useState<{
        label: string; sub: string; dotColor: string; x: number; y: number;
    } | null>(null);

    /* Dark mode */
    useEffect(() => {
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        setIsDark(mq.matches); isDarkRef.current = mq.matches;
        const h = (e: MediaQueryListEvent) => { setIsDark(e.matches); isDarkRef.current = e.matches; };
        mq.addEventListener("change", h); return () => mq.removeEventListener("change", h);
    }, []);

    /*
     * ResizeObserver — whenever the container changes size, resize the canvas
     * buffer to match exactly. This prevents the canvas being wider than its
     * parent (which caused the overflow on zoom-in).
     */
    useEffect(() => {
        const container = containerRef.current;
        const cv = canvasRef.current;
        if (!container || !cv) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        function applySize(w: number, h: number) {
            if (cwRef.current === w && chRef.current === h) return;
            cwRef.current = w; chRef.current = h;
            cv!.width = Math.round(w * dpr);
            cv!.height = Math.round(h * dpr);
            cv!.getContext("2d")!.scale(dpr, dpr);
            // Re-scatter stars to fill new dimensions
            starsRef.current = Array.from({ length: 80 }, () => ({
                x: Math.random() * w, y: Math.random() * h,
                r: 0.4 + Math.random() * 1.1, tw: Math.random() * Math.PI * 2,
            }));
        }

        // Set initial size immediately
        applySize(container.clientWidth || 520, container.clientHeight || 440);

        const ro = new ResizeObserver(entries => {
            const e = entries[0];
            if (e) applySize(Math.round(e.contentRect.width), Math.round(e.contentRect.height));
        });
        ro.observe(container);
        return () => ro.disconnect();
    }, []);

    /* Focus Kigali on mount */
    useEffect(() => { targetQuatRef.current = latLngToQuat(DEFAULT_LOC.lat, DEFAULT_LOC.lng); }, []);

    /* GPS upgrade */
    useEffect(() => {
        if (!navigator?.geolocation) return;
        navigator.geolocation.getCurrentPosition(pos => {
            userLocRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: "You" };
            setLocAccuracy("exact");
            targetQuatRef.current = latLngToQuat(pos.coords.latitude, pos.coords.longitude);
            targetZoomRef.current = Math.max(targetZoomRef.current, 195);
        }, () => { }, { timeout: 6000 });
    }, []);

    /* Country boundaries */
    useEffect(() => {
        let dead = false;
        fetch("https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson")
            .then(r => r.ok ? r.json() : Promise.reject())
            .then((data: any) => {
                if (dead) return;
                countriesRef.current = data.features.flatMap((f: any) => {
                    const g = f.geometry; if (!g) return [];
                    const raw: number[][][] =
                        g.type === "Polygon" ? g.coordinates :
                            g.type === "MultiPolygon" ? g.coordinates.map((p: number[][][][]) => p[0]) : [];
                    const rings: LatLng[][] = raw.map((r: number[][]) => r.map((c: number[]) => [c[1], c[0]] as LatLng));
                    return rings.length ? [{ rings }] : [];
                });
            }).catch(() => { });
        return () => { dead = true; };
    }, []);

    /* Arcs */
    useEffect(() => {
        const colors = ["#fd5000", "#22c55e", "#fda000", "#50a0ff"];
        arcsRef.current = Array.from({ length: 6 }, (_, i) => {
            const rt = ROUTES[i % ROUTES.length], fc = CITIES[rt.from], tc = CITIES[rt.to];
            if (!fc || !tc) return null!;
            return {
                from: latLngTo3D(fc.lat, fc.lng, 1), to: latLngTo3D(tc.lat, tc.lng, 1),
                progress: -i * 0.18, speed: 0.0035 + Math.random() * 0.0025,
                amount: rt.amount, color: colors[i % 4], route: `${rt.from}→${rt.to}`
            };
        }).filter(Boolean);
    }, []);

    /* Touch */
    useEffect(() => {
        const cv = canvasRef.current; if (!cv) return;
        const pd = (t: TouchList) => { const dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY; return Math.sqrt(dx * dx + dy * dy); };
        const onTS = (e: TouchEvent) => {
            if (e.touches.length === 1) {
                draggingRef.current = true;
                lastXRef.current = e.touches[0].clientX; lastYRef.current = e.touches[0].clientY;
                velXRef.current = velYRef.current = movedRef.current = 0; pinchRef.current = null;
            } else if (e.touches.length === 2) { draggingRef.current = false; pinchRef.current = pd(e.touches); }
        };
        const onTM = (e: TouchEvent) => {
            e.preventDefault();
            if (e.touches.length === 2) {
                const d = pd(e.touches);
                if (pinchRef.current !== null) targetZoomRef.current = Math.max(R_MIN, Math.min(R_MAX, targetZoomRef.current + (d - pinchRef.current) * 0.6));
                pinchRef.current = d; return;
            }
            if (!draggingRef.current || e.touches.length !== 1) return;
            const cw = cwRef.current, ch = chRef.current;
            const dx = e.touches[0].clientX - lastXRef.current, dy = e.touches[0].clientY - lastYRef.current;
            movedRef.current += Math.abs(dx) + Math.abs(dy);
            const vx = dx * (Math.PI * 2) / cw, vy = dy * Math.PI / ch;
            quatRef.current = qNorm(qMul(qAA(0, 1, 0, vx), qMul(qAA(1, 0, 0, vy), quatRef.current)));
            velXRef.current = vx; velYRef.current = vy;
            lastXRef.current = e.touches[0].clientX; lastYRef.current = e.touches[0].clientY;
            targetQuatRef.current = null;
        };
        const onTE = () => { draggingRef.current = false; pinchRef.current = null; };
        cv.addEventListener("touchstart", onTS, { passive: true });
        cv.addEventListener("touchmove", onTM, { passive: false });
        cv.addEventListener("touchend", onTE, { passive: true });
        return () => { cv.removeEventListener("touchstart", onTS); cv.removeEventListener("touchmove", onTM); cv.removeEventListener("touchend", onTE); };
    }, []);

    /* Wheel */
    useEffect(() => {
        const cv = canvasRef.current; if (!cv) return;
        const h = (e: WheelEvent) => { e.preventDefault(); targetZoomRef.current = Math.max(R_MIN, Math.min(R_MAX, targetZoomRef.current - e.deltaY * 0.25)); };
        cv.addEventListener("wheel", h, { passive: false }); return () => cv.removeEventListener("wheel", h);
    }, []);

    /* ── Main render loop ── */
    useEffect(() => {
        const cv = canvasRef.current!, ctx = cv.getContext("2d")!;

        // proj reads live cw/ch so the sphere is always centred inside the container
        function proj(p: Vec3, q: Quat) {
            const r = qRot(q, p);
            return { x: cwRef.current / 2 + r.x, y: chRef.current / 2 - r.y, z: r.z };
        }
        const ea = (z: number) => Math.max(0, Math.min(1, z / 40));

        function drawStars(dark: boolean) {
            if (!dark) return;
            const t = Date.now() / 1000;
            for (const s of starsRef.current) {
                const a = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(s.tw + t * 1.5));
                ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fill();
            }
        }

        function drawAtmosphere(dark: boolean, R: number) {
            const cw = cwRef.current, ch = chRef.current, cx = cw / 2, cy = ch / 2;
            const g = ctx.createRadialGradient(cx, cy, R * 0.95, cx, cy, R * 1.25);
            g.addColorStop(0, dark ? "rgba(253,80,0,0.18)" : "rgba(253,80,0,0.10)");
            g.addColorStop(0.6, dark ? "rgba(253,80,0,0.04)" : "rgba(253,80,0,0.02)");
            g.addColorStop(1, "rgba(253,80,0,0)");
            // Clip to canvas rect — atmosphere never bleeds outside
            ctx.save();
            ctx.beginPath(); ctx.rect(0, 0, cw, ch); ctx.clip();
            ctx.beginPath(); ctx.arc(cx, cy, R * 1.25, 0, Math.PI * 2);
            ctx.fillStyle = g; ctx.fill();
            ctx.restore();
        }

        function drawSphere(dark: boolean, R: number) {
            const cw = cwRef.current, ch = chRef.current, cx = cw / 2, cy = ch / 2;
            const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, 0, cx, cy, R);
            dark ? (g.addColorStop(0, "rgba(50,22,8,0.85)"), g.addColorStop(1, "rgba(20,8,2,0.95)"))
                : (g.addColorStop(0, "rgba(255,240,228,0.65)"), g.addColorStop(1, "rgba(253,80,0,0.06)"));
            ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
            ctx.fillStyle = g; ctx.fill();
            ctx.strokeStyle = dark ? "rgba(253,80,0,0.18)" : "rgba(253,80,0,0.22)";
            ctx.lineWidth = 1; ctx.stroke();
        }

        function drawDayNight(q: Quat, dark: boolean, R: number) {
            const cw = cwRef.current, ch = chRef.current, cx = cw / 2, cy = ch / 2;
            const hrs = (Date.now() / 1000 / 3600) % 24, sd = latLngTo3D(0, -((hrs / 24) * 360 - 180), R);
            const sp = proj(sd, q), op = { x: 2 * cx - sp.x, y: 2 * cy - sp.y };
            const ng = ctx.createRadialGradient(op.x, op.y, R * 0.1, op.x, op.y, R * 1.6);
            ng.addColorStop(0, dark ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.22)");
            ng.addColorStop(0.55, dark ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.06)");
            ng.addColorStop(1, "rgba(0,0,0,0)");
            ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R - 0.5, 0, Math.PI * 2); ctx.clip();
            ctx.fillStyle = ng; ctx.fillRect(0, 0, cw, ch); ctx.restore();
        }

        function drawGrid(q: Quat, dark: boolean, R: number) {
            const gc = dark ? "rgba(253,80,0,0.07)" : "rgba(253,80,0,0.12)";
            for (let lat = -60; lat <= 60; lat += 30) {
                ctx.beginPath(); let f = true;
                for (let lng = -180; lng <= 180; lng += 4) { const p = proj(latLngTo3D(lat, lng, R), q); if (p.z < 0) { f = true; continue; } f ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); f = false; }
                ctx.strokeStyle = gc; ctx.lineWidth = 0.5; ctx.stroke();
            }
            for (let lng = -180; lng <= 180; lng += 30) {
                ctx.beginPath(); let f = true;
                for (let lat2 = -80; lat2 <= 80; lat2 += 4) { const p = proj(latLngTo3D(lat2, lng, R), q); if (p.z < 0) { f = true; continue; } f ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); f = false; }
                ctx.strokeStyle = gc; ctx.lineWidth = 0.5; ctx.stroke();
            }
        }

        function drawCountries(q: Quat, dark: boolean, R: number) {
            if (!countriesRef.current.length) return;
            ctx.strokeStyle = dark ? "rgba(255,200,160,0.22)" : "rgba(120,60,20,0.28)"; ctx.lineWidth = 0.6;
            for (const c of countriesRef.current) {
                for (const ring of c.rings) {
                    ctx.beginPath(); let prev: { x: number; y: number; z: number } | null = null, pen = false;
                    for (const co of ring) {
                        const pt = proj(latLngTo3D(co[0], co[1], R), q);
                        if (prev) {
                            if (prev.z >= 0 && pt.z >= 0) { if (!pen) { ctx.moveTo(prev.x, prev.y); pen = true; } ctx.lineTo(pt.x, pt.y); }
                            else if (prev.z >= 0 && pt.z < 0) { const t = prev.z / (prev.z - pt.z); if (!pen) { ctx.moveTo(prev.x, prev.y); pen = true; } ctx.lineTo(prev.x + t * (pt.x - prev.x), prev.y + t * (pt.y - prev.y)); pen = false; }
                            else if (prev.z < 0 && pt.z >= 0) { const t = prev.z / (prev.z - pt.z); ctx.moveTo(prev.x + t * (pt.x - prev.x), prev.y + t * (pt.y - prev.y)); ctx.lineTo(pt.x, pt.y); pen = true; }
                            else pen = false;
                        }
                        prev = pt;
                    }
                    ctx.stroke();
                }
            }
        }

        function drawCityMarkers(q: Quat, dark: boolean, R: number) {
            for (const [name, c] of Object.entries(CITIES)) {
                const p = proj(latLngTo3D(c.lat, c.lng, R), q); if (p.z < 0) continue;
                const a = ea(p.z);
                ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(253,80,0,${0.85 * a})`; ctx.fill();
                ctx.strokeStyle = `rgba(255,255,255,${0.75 * a})`; ctx.lineWidth = 0.8; ctx.stroke();
                if (R > 170 && a > 0.5) {
                    ctx.save(); ctx.font = "600 7px sans-serif";
                    ctx.fillStyle = dark ? `rgba(255,220,200,${0.7 * a})` : `rgba(80,30,10,${0.75 * a})`;
                    ctx.textAlign = "left"; ctx.fillText(name, p.x + 4, p.y - 3); ctx.restore();
                }
            }
        }

        function drawArcs(q: Quat, R: number) {
            const S = 48;
            for (const arc of arcsRef.current) {
                if (arc.progress < 0) continue;
                const head = Math.min(1, arc.progress), tail = Math.max(0, arc.progress - 0.35);
                if (head <= 0) continue;
                ctx.beginPath(); let f = true;
                for (let i = 0; i <= S; i++) { const t = i / S, sl = slerp3(arc.from, arc.to, t), lift = R + Math.sin(t * Math.PI) * R * 0.35, p = proj({ x: sl.x * lift, y: sl.y * lift, z: sl.z * lift }, q); if (p.z < 0) { f = true; continue; } f ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); f = false; }
                ctx.strokeStyle = arc.color; ctx.globalAlpha = 0.18; ctx.lineWidth = 0.8; ctx.stroke();
                ctx.beginPath(); f = true; let last: { x: number; y: number } | null = null;
                for (let i = 0; i <= S; i++) { const t = tail + (head - tail) * (i / S), sl = slerp3(arc.from, arc.to, t), lift = R + Math.sin(t * Math.PI) * R * 0.35, p = proj({ x: sl.x * lift, y: sl.y * lift, z: sl.z * lift }, q); if (p.z < 0) { f = true; continue; } f ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); f = false; last = { x: p.x, y: p.y }; }
                ctx.strokeStyle = arc.color; ctx.globalAlpha = 0.85; ctx.lineWidth = 1.6; ctx.stroke();
                if (last) {
                    ctx.beginPath(); ctx.arc(last.x, last.y, 3, 0, Math.PI * 2); ctx.fillStyle = arc.color; ctx.globalAlpha = 1; ctx.fill();
                    ctx.beginPath(); ctx.arc(last.x, last.y, 6, 0, Math.PI * 2); ctx.strokeStyle = arc.color; ctx.globalAlpha = 0.4; ctx.lineWidth = 1.2; ctx.stroke();
                }
                ctx.globalAlpha = 1;
            }
        }

        function drawUserLocation(q: Quat, R: number) {
            const loc = userLocRef.current; if (!loc) { userProjRef.current = null; return; }
            const ulp = proj(latLngTo3D(loc.lat, loc.lng, R), q);
            userProjRef.current = { x: ulp.x, y: ulp.y, visible: ulp.z >= 0 };
            if (ulp.z < 0) return;
            [0, 1].forEach(i => { const p = ((Date.now() + i * 800) % 1600) / 1600; ctx.beginPath(); ctx.arc(ulp.x, ulp.y, 6 + p * 20, 0, Math.PI * 2); ctx.strokeStyle = `rgba(34,197,94,${0.6 * (1 - p)})`; ctx.lineWidth = 1.5; ctx.stroke(); });
            ctx.beginPath(); ctx.arc(ulp.x, ulp.y, 10, 0, Math.PI * 2); ctx.fillStyle = "rgba(34,197,94,0.18)"; ctx.fill();
            ctx.beginPath(); ctx.arc(ulp.x, ulp.y, 5.5, 0, Math.PI * 2); ctx.fillStyle = "#22c55e"; ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 1.8; ctx.stroke();
            ctx.save(); ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
            const lb = loc.label || "YOU", tw = ctx.measureText(lb).width;
            ctx.fillStyle = "rgba(34,197,94,0.92)";
            ctx.beginPath(); ctx.roundRect(ulp.x - tw / 2 - 5, ulp.y + 14, tw + 10, 14, 4); ctx.fill();
            ctx.fillStyle = "#fff"; ctx.fillText(lb, ulp.x, ulp.y + 24); ctx.restore();
        }

        function updateArcs() {
            for (const a of arcsRef.current) {
                a.progress += a.speed;
                if (a.progress > 1.4) {
                    const r = ROUTES[Math.floor(Math.random() * ROUTES.length)], f = CITIES[r.from], t = CITIES[r.to];
                    if (f && t) { a.from = latLngTo3D(f.lat, f.lng, 1); a.to = latLngTo3D(t.lat, t.lng, 1); a.amount = r.amount; a.route = `${r.from}→${r.to}`; }
                    a.progress = -Math.random() * 0.4; a.speed = 0.0035 + Math.random() * 0.0025;
                }
            }
        }

        function loop() {
            let q = quatRef.current;
            if (targetQuatRef.current !== null) {
                q = qSlerp(q, targetQuatRef.current, 0.07); quatRef.current = q;
                const d = Math.abs(q.w * targetQuatRef.current.w + q.x * targetQuatRef.current.x + q.y * targetQuatRef.current.y + q.z * targetQuatRef.current.z);
                if (d > 0.9999) targetQuatRef.current = null;
            } else if (!draggingRef.current) {
                if (Math.abs(velXRef.current) > 0.0003) { q = qNorm(qMul(qAA(0, 1, 0, velXRef.current), q)); velXRef.current *= 0.93; }
                else { velXRef.current = 0; q = qNorm(qMul(qAA(0, 1, 0, 0.003), q)); }
                if (Math.abs(velYRef.current) > 0.0003) { q = qNorm(qMul(qAA(1, 0, 0, velYRef.current), q)); velYRef.current *= 0.93; }
                else velYRef.current = 0;
                quatRef.current = q;
            }
            radiusRef.current += (targetZoomRef.current - radiusRef.current) * 0.12;

            const R = radiusRef.current, dark = isDarkRef.current;
            const cw = cwRef.current, ch = chRef.current;
            ctx.clearRect(0, 0, cw, ch);

            /*
             * Global rect clip — every single draw call is bounded by the
             * canvas dimensions. Nothing can visually escape the container
             * regardless of zoom level or sphere radius.
             */
            ctx.save();
            ctx.beginPath(); ctx.rect(0, 0, cw, ch); ctx.clip();
            drawStars(dark); drawAtmosphere(dark, R); drawSphere(dark, R);
            drawGrid(q, dark, R); drawCountries(q, dark, R); drawDayNight(q, dark, R);
            drawArcs(q, R); drawCityMarkers(q, dark, R); drawUserLocation(q, R);
            ctx.restore();

            updateArcs();
            rafRef.current = requestAnimationFrame(loop);
        }
        loop();
        return () => cancelAnimationFrame(rafRef.current);
    }, []);

    /* Live stats */
    useEffect(() => {
        const txs = ["$840 / min", "$1,240 / min", "$2,100 / min", "$980 / min", "$1,590 / min"]; let i = 0;
        const t = setInterval(() => { i = (i + 1) % txs.length; setLiveTx(txs[i]); setUsers((9000 + Math.floor(Math.random() * 800)).toLocaleString()); }, 3200);
        return () => clearInterval(t);
    }, []);

    /* Mouse */
    function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
        draggingRef.current = true; lastXRef.current = e.clientX; lastYRef.current = e.clientY;
        velXRef.current = velYRef.current = movedRef.current = 0;
        if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
    }
    function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
        const cv = canvasRef.current!, rect = cv.getBoundingClientRect();
        const cw = cwRef.current, ch = chRef.current;
        const mx = (e.clientX - rect.left) * (cw / rect.width);
        const my = (e.clientY - rect.top) * (ch / rect.height);
        if (draggingRef.current) {
            const dx = e.clientX - lastXRef.current, dy = e.clientY - lastYRef.current;
            movedRef.current += Math.abs(dx) + Math.abs(dy);
            const vx = dx * (Math.PI * 2) / cw, vy = dy * Math.PI / ch;
            quatRef.current = qNorm(qMul(qAA(0, 1, 0, vx), qMul(qAA(1, 0, 0, vy), quatRef.current)));
            velXRef.current = vx; velYRef.current = vy;
            lastXRef.current = e.clientX; lastYRef.current = e.clientY;
            targetQuatRef.current = null; setTooltip(null); return;
        }
        const ulp = userProjRef.current;
        if (ulp?.visible) {
            const d2 = ulp.x - mx, dy2 = ulp.y - my;
            if (Math.sqrt(d2 * d2 + dy2 * dy2) < 16) {
                setTooltip({
                    label: userLocRef.current?.label || "Your Location",
                    sub: locAccuracy === "exact" ? "GPS location" : "City-level (Kigali, Rwanda)",
                    dotColor: "#22c55e", x: e.clientX - rect.left + 16, y: e.clientY - rect.top - 10
                }); return;
            }
        }
        setTooltip(null);
    }
    function onMouseUp() { draggingRef.current = false; if (canvasRef.current) canvasRef.current.style.cursor = "grab"; }

    const zoomIn = useCallback(() => { targetZoomRef.current = Math.min(R_MAX, targetZoomRef.current + 25); }, []);
    const zoomOut = useCallback(() => { targetZoomRef.current = Math.max(R_MIN, targetZoomRef.current - 25); }, []);
    const resetView = useCallback(() => { targetQuatRef.current = latLngToQuat(0, 0); targetZoomRef.current = R_DEFAULT; velXRef.current = velYRef.current = 0; }, []);
    const focusUser = useCallback(() => { const loc = userLocRef.current; if (!loc) return; targetQuatRef.current = latLngToQuat(loc.lat, loc.lng); targetZoomRef.current = Math.max(targetZoomRef.current, 195); }, []);

    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const S = 0.18;
        switch (e.key) {
            case "ArrowLeft": quatRef.current = qNorm(qMul(qAA(0, 1, 0, -S), quatRef.current)); targetQuatRef.current = null; e.preventDefault(); break;
            case "ArrowRight": quatRef.current = qNorm(qMul(qAA(0, 1, 0, S), quatRef.current)); targetQuatRef.current = null; e.preventDefault(); break;
            case "ArrowUp": quatRef.current = qNorm(qMul(qAA(1, 0, 0, -S), quatRef.current)); targetQuatRef.current = null; e.preventDefault(); break;
            case "ArrowDown": quatRef.current = qNorm(qMul(qAA(1, 0, 0, S), quatRef.current)); targetQuatRef.current = null; e.preventDefault(); break;
            case "+": case "=": zoomIn(); e.preventDefault(); break;
            case "-": case "_": zoomOut(); e.preventDefault(); break;
            case "r": case "R": resetView(); e.preventDefault(); break;
        }
    };

    const tk = tokens(isDark);
    const pillStyle: React.CSSProperties = { background: tk.badgeBg, border: `1px solid ${tk.badgeBorder}`, borderRadius: 99, padding: "5px 12px" };
    const ctrlBtnStyle: React.CSSProperties = { background: tk.controlBg, border: `1px solid ${tk.controlBdr}`, color: tk.controlIcon, width: 30, height: 30, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(8px)" };

    return (
        /*
         * KEY FIX: containerRef owns the size.
         * overflow:hidden   → hard CSS clip, nothing escapes
         * isolation:isolate → own stacking context, z-index is contained
         * Canvas is position:absolute inset:0 width:100% height:100%
         *   so it always fills exactly the container — no overflow on any zoom level.
         * ResizeObserver keeps the canvas buffer in sync with container pixel size.
         */
        <div
            ref={containerRef}
            tabIndex={0}
            role="img"
            aria-label="Interactive 3D globe. Drag to rotate, scroll to zoom."
            onKeyDown={onKeyDown}
            className="relative w-full rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
            style={{ height: "450px", overflow: "hidden", background: "transparent", isolation: "isolate" }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "grab", display: "block", touchAction: "none" }}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={() => { draggingRef.current = false; setTooltip(null); if (canvasRef.current) canvasRef.current.style.cursor = "grab"; }}
                aria-hidden="true"
            />

            {/* Live tx badge */}
            <div className="absolute flex items-center gap-2 pointer-events-none"
                style={{ top: 16, left: "50%", transform: "translateX(-50%)", ...pillStyle, padding: "5px 14px", whiteSpace: "nowrap" }}>
                <span className="rounded-full animate-pulse" style={{ width: 6, height: 6, background: "#22c55e", display: "inline-block", flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: tk.labelColor }}>Live transactions:</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: "#fd5000" }}>{liveTx}</span>
            </div>

            {/* Controls */}
            <div className="absolute flex flex-col gap-1.5" style={{ top: 16, left: 16 }}>
                <button onClick={zoomIn} aria-label="Zoom in" style={ctrlBtnStyle} title="Zoom in (+)"><Plus size={14} /></button>
                <button onClick={zoomOut} aria-label="Zoom out" style={ctrlBtnStyle} title="Zoom out (−)"><Minus size={14} /></button>
                <button onClick={resetView} aria-label="Reset view" style={ctrlBtnStyle} title="Reset (R)"><RotateCcw size={13} /></button>
                <button onClick={focusUser} aria-label="My location" style={ctrlBtnStyle} title="My location"><Locate size={13} color="#22c55e" /></button>
            </div>

            {/* Legend */}
            <div className="absolute flex flex-col gap-1 pointer-events-none" style={{ top: 16, right: 16 }}>
                <div className="flex items-center gap-2">
                    <div className="rounded-full animate-pulse" style={{ width: 9, height: 9, background: "#22c55e", flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: tk.legendColor, fontWeight: 700 }}>
                        {locAccuracy === "exact" ? "Your location" : `${DEFAULT_LOC.label}, Rwanda`}
                    </span>
                </div>
                <div style={{ marginTop: 4, opacity: 0.45 }}>
                    <span style={{ fontSize: 9, color: tk.legendColor }}>drag · scroll · arrows</span>
                </div>
            </div>

            {/* Stat chips */}
            <div className="absolute flex gap-2 flex-wrap justify-center pointer-events-none"
                style={{ bottom: 16, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap" }}>
                {[
                    { label: "Active users", val: users, dot: "#22c55e", pulse: true },
                    { label: "Countries", val: "50+", dot: "#fd5000", pulse: false },
                    { label: "Total paid", val: "$1M+", dot: "#fd5000", pulse: false },
                ].map(c => (
                    <div key={c.label} className="flex items-center gap-2" style={pillStyle}>
                        <div className={`rounded-full${c.pulse ? " animate-pulse" : ""}`} style={{ width: 6, height: 6, background: c.dot, flexShrink: 0 }} />
                        <span style={{ fontSize: 9, color: tk.labelColor }}>{c.label}</span>
                        <span style={{ fontSize: 10, fontWeight: 800, color: "#fd5000" }}>{c.val}</span>
                    </div>
                ))}
            </div>

            {/* Tooltip */}
            {tooltip && (
                <div className="absolute rounded-xl pointer-events-none" style={{ left: tooltip.x, top: tooltip.y, background: tk.tooltipBg, border: `1px solid ${tk.tooltipBdr}`, padding: "8px 12px", zIndex: 10, minWidth: 130, boxShadow: isDark ? "0 4px 16px rgba(0,0,0,0.5)" : "0 4px 16px rgba(0,0,0,0.10)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: tooltip.dotColor, flexShrink: 0, display: "inline-block" }} />
                        <p style={{ fontSize: 12, fontWeight: 800, color: "#fd5000", margin: 0 }}>{tooltip.label}</p>
                    </div>
                    <p style={{ fontSize: 10, color: tk.tooltipSub, margin: 0 }}>{tooltip.sub}</p>
                </div>
            )}
        </div>
    );
}

/* ─── Hero ───────────────────────────────────────────────────────────────── */
export function Hero() {
    const [activeCount, setActiveCount] = useState(9200);
    const [currentWord, setCurrentWord] = useState(0);
    const words = ["Sell Products", "Build Audiences", "Earn Commissions", "Grow Globally"];

    useEffect(() => { setActiveCount(Math.floor(Math.random() * 3000) + 8200); }, []);
    useEffect(() => { const t = setInterval(() => setCurrentWord(w => (w + 1) % words.length), 2800); return () => clearInterval(t); }, []);

    return (
        <section className="relative overflow-hidden pt-16 pb-24 sm:pt-24 sm:pb-32" style={{ background: "var(--color-bg)" }}>
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
                style={{ background: "radial-gradient(ellipse at center, rgba(253,80,0,0.06) 0%, transparent 65%)" }} />

            <div className="max-w-8xl mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_540px] gap-12 xl:gap-20 items-center">

                    <motion.div initial="hidden" animate="show" variants={stagger} className="text-center lg:text-left">
                        <motion.div variants={fadeUp} className="flex justify-center lg:justify-start mb-7">
                            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-semibold"
                                style={{ background: "rgba(253,80,0,0.08)", border: "1px solid rgba(253,80,0,0.18)", color: "var(--color-accent)" }}>
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                {activeCount.toLocaleString()} people active now
                            </div>
                        </motion.div>

                        <motion.div variants={fadeUp} className="mb-5">
                            <h1 className="font-black leading-[1.05] tracking-tight"
                                style={{ fontSize: "clamp(2.8rem,5vw,4.4rem)", color: "var(--color-text-primary)", letterSpacing: "-0.03em" }}>
                                The platform to<br />
                                <span className="relative inline-block overflow-hidden" style={{ color: "var(--color-accent)" }}>
                                    <AnimatePresence mode="wait">
                                        <motion.span key={currentWord} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }}
                                            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }} className="block">{words[currentWord]}</motion.span>
                                    </AnimatePresence>
                                </span>
                                <br /><span style={{ color: "var(--color-text-primary)" }}>Anywhere.</span>
                            </h1>
                        </motion.div>

                        <motion.p variants={fadeUp} className="text-base sm:text-lg leading-relaxed mb-9 max-w-[440px] mx-auto lg:mx-0"
                            style={{ color: "var(--color-text-muted)" }}>
                            Sell products. Promote offers. Create content. Build your community. Grow your audience — all in one place.
                        </motion.p>

                        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-10">
                            <Link href="/register"
                                className="group inline-flex items-center justify-center gap-2.5 px-8 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.97]"
                                style={{ height: "50px", background: "var(--color-accent)", boxShadow: "0 6px 22px rgba(253,80,0,0.28)" }}
                                onMouseEnter={e => (e.currentTarget.style.background = "var(--color-accent-hover)")}
                                onMouseLeave={e => (e.currentTarget.style.background = "var(--color-accent)")}>
                                Start earning for Free <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                            </Link>
                            <Link href="/marketplace"
                                className="inline-flex items-center justify-center gap-2 px-8 rounded-2xl text-sm font-semibold transition-all"
                                style={{ height: "50px", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-border-strong)"; e.currentTarget.style.color = "var(--color-text-primary)"; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}>
                                Browse Marketplace
                            </Link>
                        </motion.div>

                        <motion.div variants={fadeUp} className="flex items-center gap-5 flex-wrap justify-center lg:justify-start">
                            {[{ icon: Shield, label: "Secure Payments" }, { icon: CheckCircle, label: "Verified Vendors" }, { icon: Globe, label: "50+ Countries" }]
                                .map(({ icon: Icon, label }) => (
                                    <div key={label} className="flex items-center gap-1.5">
                                        <Icon className="h-3.5 w-3.5" style={{ color: "var(--color-accent)" }} />
                                        <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>{label}</span>
                                    </div>
                                ))}
                        </motion.div>
                    </motion.div>

                    {/* Globe column — overflow:hidden on the motion div is the outer safety net */}
                    <motion.div
                        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full overflow-hidden"
                    >
                        <GlobeCanvas />
                    </motion.div>

                </div>
            </div>
        </section>
    );
}