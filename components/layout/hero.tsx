// "use client";
// import React, { useState, useEffect, useRef, useMemo } from "react";
// import Link from "next/link";
// import { motion, AnimatePresence } from "framer-motion";
// import { ArrowRight, Shield, CheckCircle, Globe } from "lucide-react";
// import { useTheme } from "next-themes";
// import Image from "next/image";
// const fadeUp = {
//     hidden: { opacity: 0, y: 24 },
//     show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
// };
// const stagger = { show: { transition: { staggerChildren: 0.08 } } };

// const NODES = [
//     { id: 0, label: "Lagos Vendor", sub: "Electronics · 340 sales", type: "vendor", lat: 6, lng: 3, size: 10 },
//     { id: 1, label: "Nairobi Affiliate", sub: "Fashion · $2.4K earned", type: "affiliate", lat: -1, lng: 37, size: 8 },
//     { id: 2, label: "Kigali Vendor", sub: "Local crafts · 180 sales", type: "vendor", lat: -2, lng: 30, size: 9 },
//     { id: 3, label: "Cairo Buyer", sub: "50+ orders · trusted", type: "buyer", lat: 30, lng: 31, size: 7 },
//     { id: 4, label: "London Affiliate", sub: "Tech · $5.1K earned", type: "affiliate", lat: 51, lng: 0, size: 9 },
//     { id: 5, label: "Dubai Vendor", sub: "Luxury goods · 890 sales", type: "vendor", lat: 25, lng: 55, size: 10 },
//     { id: 6, label: "Mumbai Buyer", sub: "Electronics · 120 orders", type: "buyer", lat: 19, lng: 73, size: 7 },
//     { id: 7, label: "Singapore Hub", sub: "Asia distribution", type: "vendor", lat: 1, lng: 104, size: 11 },
//     { id: 8, label: "Accra Affiliate", sub: "Health · $1.8K earned", type: "affiliate", lat: 5, lng: -0.2, size: 8 },
//     { id: 9, label: "Paris Buyer", sub: "Fashion · 200+ orders", type: "buyer", lat: 48, lng: 2, size: 7 },
//     { id: 10, label: "NYC Affiliate", sub: "All categories · $8.2K", type: "affiliate", lat: 40, lng: -74, size: 10 },
//     { id: 11, label: "São Paulo Vendor", sub: "Lifestyle · 560 sales", type: "vendor", lat: -23, lng: -46, size: 9 },
//     { id: 12, label: "Johannesburg", sub: "Multi-category vendor", type: "vendor", lat: -26, lng: 28, size: 8 },
//     { id: 13, label: "Dakar Buyer", sub: "Fashion · 80 orders", type: "buyer", lat: 15, lng: -17, size: 6 },
//     { id: 14, label: "Toronto Affiliate", sub: "Tech · $3.3K earned", type: "affiliate", lat: 43, lng: -79, size: 8 },
// ];

// const LINKS = [
//     [0, 1], [0, 2], [0, 8], [1, 2], [1, 3], [2, 12], [3, 5], [4, 9], [4, 10],
//     [5, 6], [5, 7], [7, 6], [8, 13], [10, 14], [10, 11], [11, 13], [12, 3], [4, 5], [9, 3],
// ];

// function nodeColor(type: string, isDark: boolean) {
//     if (type === "vendor") return "#fd5000";
//     if (type === "affiliate") return "#f0a500";
//     return isDark ? "#c0c0c0" : "#555555";
// }


// function GlobeCanvas() {
//     const canvasRef = useRef<HTMLCanvasElement>(null);
//     const rotRef = useRef(0);
//     const hovRef = useRef<number | null>(null);
//     const projRef = useRef<any[]>([]);
//     const rafRef = useRef<number>(0);
//     const isDarkRef = useRef(false);

//     const [tooltip, setTooltip] = useState<{
//         label: string; sub: string; x: number; y: number;
//     } | null>(null);
//     const [liveTx, setLiveTx] = useState("$1,240 / min");
//     const [users, setUsers] = useState("9,200");

//     const { theme } = useTheme();
//     const isDark = useMemo(() => theme === "dark", [theme]);


//     useEffect(() => {
//         const mq = window.matchMedia("(prefers-color-scheme: dark)");

//         const sync = () => {
//             const val =
//                 document.documentElement.classList.contains("dark") ||
//                 mq.matches ||
//                 theme === "dark";
//             isDarkRef.current = val;
//             isDarkRef.current = theme === "dark";
//         };

//         sync();

//         mq.addEventListener("change", sync);

//         const observer = new MutationObserver(sync);
//         observer.observe(document.documentElement, {
//             attributes: true,
//             attributeFilter: ["class"],
//         });

//         return () => {
//             mq.removeEventListener("change", sync);
//             observer.disconnect();
//         };
//     }, [theme]); // ← key fix: re-run when `theme` changes

//     // ── 2. Canvas loop ─────────────────────────────────────────────────────────
//     useEffect(() => {
//         const canvas = canvasRef.current!;
//         const ctx = canvas.getContext("2d")!;
//         const W = 520, H = 440, CX = W / 2, CY = H / 2, R = 155;
//         canvas.width = W;
//         canvas.height = H;

//         function latLngTo3D(lat: number, lng: number, r: number) {
//             const phi = (90 - lat) * Math.PI / 180;
//             const theta = (lng + 180) * Math.PI / 180;
//             return {
//                 x: -(r * Math.sin(phi) * Math.cos(theta)),
//                 y: r * Math.cos(phi),
//                 z: r * Math.sin(phi) * Math.sin(theta),
//             };
//         }

//         function project(p: { x: number; y: number; z: number }, rot: number) {
//             const cosR = Math.cos(rot), sinR = Math.sin(rot);
//             const x = p.x * cosR - p.z * sinR;
//             const z = p.x * sinR + p.z * cosR;
//             return { x: CX + x, y: CY - p.y, z };
//         }

//         function draw(rot: number) {
//             const dark = isDarkRef.current; // always fresh — no stale closure

//             // ── Background ──
//             ctx.clearRect(0, 0, W, H);
//             ctx.fillStyle = dark ? "#0a0500" : "#ffffff";
//             ctx.fillRect(0, 0, W, H);

//             ctx.beginPath();
//             ctx.arc(CX, CY, R, 0, Math.PI * 2);
//             ctx.fillStyle = dark ? "rgba(30,12,0,0.70)" : "rgba(253,80,0,0.04)";
//             ctx.fill();
//             ctx.strokeStyle = dark ? "rgba(253,80,0,0.14)" : "rgba(253,80,0,0.20)";
//             ctx.lineWidth = 1;
//             ctx.stroke();

//             const gridColor = dark ? "rgba(253,80,0,0.08)" : "rgba(253,80,0,0.14)";

//             for (let lat = -60; lat <= 60; lat += 30) {
//                 ctx.beginPath();
//                 let first = true;
//                 for (let lng = -180; lng <= 180; lng += 4) {
//                     const pp = project(latLngTo3D(lat, lng, R), rot);
//                     if (pp.z < 0) { first = true; continue; }
//                     first ? ctx.moveTo(pp.x, pp.y) : ctx.lineTo(pp.x, pp.y);
//                     first = false;
//                 }
//                 ctx.strokeStyle = gridColor;
//                 ctx.lineWidth = 0.5;
//                 ctx.stroke();
//             }

//             for (let lng = -180; lng <= 180; lng += 30) {
//                 ctx.beginPath();
//                 let first = true;
//                 for (let lat2 = -80; lat2 <= 80; lat2 += 4) {
//                     const pp = project(latLngTo3D(lat2, lng, R), rot);
//                     if (pp.z < 0) { first = true; continue; }
//                     first ? ctx.moveTo(pp.x, pp.y) : ctx.lineTo(pp.x, pp.y);
//                     first = false;
//                 }
//                 ctx.strokeStyle = gridColor;
//                 ctx.lineWidth = 0.5;
//                 ctx.stroke();
//             }

//             // ── Project nodes ──
//             const projected = NODES.map(n => {
//                 const pp = project(latLngTo3D(n.lat, n.lng, R), rot);
//                 return { ...n, px: pp.x, py: pp.y, pz: pp.z, visible: pp.z >= 0 };
//             });
//             projRef.current = projected;

//             // ── Links + travelling dots ──
//             // FIX: use Date.now() so the dot travels smoothly and NEVER "resets" visually.
//             // Each link gets a staggered offset so they don't all sync-up.
//             LINKS.forEach(([a, b], linkIdx) => {
//                 const na = projected[a], nb = projected[b];
//                 if (!na.visible || !nb.visible) return;

//                 const mx = (na.px + nb.px) / 2;
//                 const my = (na.py + nb.py) / 2 - 40;

//                 // Arc
//                 ctx.beginPath();
//                 ctx.moveTo(na.px, na.py);
//                 ctx.quadraticCurveTo(mx, my, nb.px, nb.py);
//                 ctx.strokeStyle = dark ? "rgba(253,80,0,0.12)" : "rgba(253,80,0,0.22)";
//                 ctx.lineWidth = 0.8;
//                 ctx.stroke();

//                 // Dot — stagger offset per link so each travels at its own phase
//                 const PERIOD = 3500; // ms for one full traversal
//                 const offset = (linkIdx / LINKS.length) * PERIOD;
//                 const progress = ((Date.now() + offset) % PERIOD) / PERIOD; // 0 → 1, seamless

//                 const t = progress;
//                 const bx = (1 - t) * (1 - t) * na.px + 2 * (1 - t) * t * mx + t * t * nb.px;
//                 const by = (1 - t) * (1 - t) * na.py + 2 * (1 - t) * t * my + t * t * nb.py;

//                 ctx.beginPath();
//                 ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
//                 ctx.fillStyle = nodeColor(na.type, dark);
//                 ctx.fill();
//             });

//             const pulsePhase = (Date.now() % 1200) / 1200;

//             projected.sort((a, b) => a.pz - b.pz).forEach(n => {
//                 if (!n.visible) return;
//                 const col = nodeColor(n.type, dark);
//                 const isHov = hovRef.current === n.id;
//                 const r = n.size + (isHov ? 3 : 0);

//                 // Halo
//                 ctx.beginPath();
//                 ctx.arc(n.px, n.py, r + 5, 0, Math.PI * 2);
//                 ctx.fillStyle =
//                     col === "#fd5000" ? "rgba(253,80,0,0.15)" :
//                         col === "#f0a500" ? "rgba(240,165,0,0.15)" :
//                             dark ? "rgba(192,192,192,0.10)" :
//                                 "rgba(60,60,60,0.08)";
//                 ctx.fill();

//                 // Dot
//                 ctx.beginPath();
//                 ctx.arc(n.px, n.py, r, 0, Math.PI * 2);
//                 ctx.fillStyle = col;
//                 ctx.fill();

//                 // Hover pulse — smooth outward ring derived from time, not frame count
//                 if (isHov) {
//                     const pulseR = r + pulsePhase * 20;
//                     ctx.beginPath();
//                     ctx.arc(n.px, n.py, pulseR, 0, Math.PI * 2);
//                     ctx.strokeStyle = col;
//                     ctx.lineWidth = 1;
//                     ctx.globalAlpha = 1 - pulsePhase;
//                     ctx.stroke();
//                     ctx.globalAlpha = 1;
//                 }
//             });
//         }

//         function loop() {
//             rotRef.current += 0.003;
//             draw(rotRef.current);
//             rafRef.current = requestAnimationFrame(loop);
//         }

//         loop();
//         return () => cancelAnimationFrame(rafRef.current);
//     }, []);

//     useEffect(() => {
//         const txs = ["$840 / min", "$1,240 / min", "$2,100 / min", "$980 / min", "$1,590 / min"];
//         let i = 0;
//         const t = setInterval(() => {
//             i = (i + 1) % txs.length;
//             setLiveTx(txs[i]);
//             setUsers((9000 + Math.floor(Math.random() * 800)).toLocaleString());
//         }, 3200);
//         return () => clearInterval(t);
//     }, []);

//     function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
//         const canvas = canvasRef.current!;
//         const rect = canvas.getBoundingClientRect();
//         const scaleX = canvas.width / canvas.offsetWidth;
//         const scaleY = canvas.height / canvas.offsetHeight;
//         const mx = (e.clientX - rect.left) * scaleX;
//         const my = (e.clientY - rect.top) * scaleY;

//         let found: any = null;
//         projRef.current.forEach(n => {
//             if (!n.visible) return;
//             const dx = n.px - mx, dy = n.py - my;
//             if (Math.sqrt(dx * dx + dy * dy) < n.size + 8) found = n;
//         });

//         hovRef.current = found ? found.id : null;
//         setTooltip(
//             found
//                 ? { label: found.label, sub: found.sub, x: e.clientX - rect.left + 14, y: e.clientY - rect.top - 10 }
//                 : null
//         );
//     }
//     const badgeBg = isDark ? "rgba(10,5,0,0.90)" : "rgba(255,255,255,0.95)";
//     const badgeBorder = isDark ? "rgba(253,80,0,0.22)" : "rgba(253,80,0,0.28)";
//     const labelColor = isDark ? "rgba(255,255,255,0.50)" : "rgba(0,0,0,0.45)";
//     const tooltipBg = isDark ? "#1a0a00" : "#ffffff";
//     const tooltipBdr = isDark ? "rgba(253,80,0,0.35)" : "rgba(253,80,0,0.25)";
//     const tooltipSub = isDark ? "rgba(255,255,255,0.50)" : "rgba(0,0,0,0.45)";
//     const legendColor = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";

//     return (
//         <div
//             className="relative -mt-10 w-full overflow-hidden rounded-3xl"
//             style={{
//                 // background: isDark ? "#0a0500" : "#ffffff",
//                 // border: isDark ? "1px solid rgba(253,80,0,0.12)" : "1px solid rgba(253,80,0,0.14)",
//                 height: "450px",
//                 // smooth background colour transition when theme switches
//                 transition: "background 0.35s ease, border-color 0.35s ease",
//             }}
//         >
//             {isDark}
//             <canvas
//                 ref={canvasRef}
//                 className="w-full h-full"
//                 style={{ cursor: "crosshair", display: "block" }}
//                 onMouseMove={onMouseMove}
//                 onMouseLeave={() => { hovRef.current = null; setTooltip(null); }}
//             />

//             {/* Center logo */}
//             <div
//                 className="absolute"
//                 style={{
//                     left: "50%", top: "50%",
//                     transform: "translate(-50%,-50%)",
//                     pointerEvents: "none",
//                     textAlign: "center",
//                 }}
//             >
//                 <div className="relative" style={{ width: 80, height: 80, margin: "0 auto 8px" }}>
//                     {[0, 0.8].map(delay => (
//                         <div
//                             key={delay}
//                             className="absolute rounded-full"
//                             style={{
//                                 width: 52, height: 52,
//                                 left: "50%", top: "50%",
//                                 transform: "translate(-50%,-50%)",
//                                 border: "1.5px solid rgba(253,80,0,0.35)",
//                                 animation: `ping 2.4s ease-out ${delay}s infinite`,
//                             }}
//                         />
//                     ))}
//                     <div
//                         className="absolute rounded-full flex items-center justify-center"
//                         style={{
//                             inset: 10,
//                             background: isDark ? "rgba(253,80,0,0.12)" : "rgba(253,80,0,0.08)",
//                             border: "1.5px solid rgba(253,80,0,0.5)",
//                             transition: "background 0.35s ease",
//                         }}
//                     >
//                         <Image src="/jimvio-logo.png" alt="Jimvio" width={28} height={28} style={{ display: "block" }} />
//                     </div>
//                 </div>
//                 <p style={{ fontSize: 9, fontWeight: 700, color: "#fd5000", letterSpacing: ".14em", textTransform: "uppercase" }}>
//                     Jimvio
//                 </p>
//             </div>

//             {/* Live tx badge */}
//             <div
//                 className="absolute flex items-center gap-2"
//                 style={{
//                     top: 16, left: "50%", transform: "translateX(-50%)",
//                     background: badgeBg, border: `1px solid ${badgeBorder}`,
//                     borderRadius: 99, padding: "5px 14px",
//                     pointerEvents: "none", whiteSpace: "nowrap",
//                     transition: "background 0.35s ease, border-color 0.35s ease",
//                 }}
//             >
//                 <span
//                     className="rounded-full animate-pulse"
//                     style={{ width: 6, height: 6, background: "#22c55e", display: "inline-block", flexShrink: 0 }}
//                 />
//                 <span style={{ fontSize: 10, color: labelColor, transition: "color 0.35s ease" }}>Live transactions:</span>
//                 <span style={{ fontSize: 10, fontWeight: 800, color: "#fd5000", minWidth: 64 }}>{liveTx}</span>
//             </div>

//             {/* Legend */}
//             <div className="absolute flex flex-col gap-2" style={{ top: 16, right: 16, pointerEvents: "none" }}>
//                 {[
//                     { label: "Vendors", col: "#fd5000" },
//                     { label: "Affiliates", col: "#f0a500" },
//                     { label: "Buyers", col: isDark ? "#c0c0c0" : "#555555" },
//                 ].map(l => (
//                     <div key={l.label} className="flex items-center gap-2">
//                         <div className="rounded-full" style={{ width: 8, height: 8, background: l.col, flexShrink: 0 }} />
//                         <span style={{ fontSize: 10, color: legendColor, fontWeight: 500, transition: "color 0.35s ease" }}>
//                             {l.label}
//                         </span>
//                     </div>
//                 ))}
//             </div>

//             {/* Stat chips */}
//             <div
//                 className="absolute flex gap-2 flex-wrap justify-center"
//                 style={{
//                     bottom: 16, left: "50%", transform: "translateX(-50%)",
//                     pointerEvents: "none", whiteSpace: "nowrap",
//                 }}
//             >
//                 {[
//                     { label: "Active users", val: users, dot: "#22c55e", pulse: true },
//                     { label: "Countries", val: "50+", dot: "#fd5000", pulse: false },
//                     { label: "Total paid", val: "$1M+", dot: "#fd5000", pulse: false },
//                 ].map(c => (
//                     <div
//                         key={c.label}
//                         className="flex items-center gap-2"
//                         style={{
//                             background: badgeBg, border: `1px solid ${badgeBorder}`,
//                             borderRadius: 99, padding: "5px 12px",
//                             transition: "background 0.35s ease, border-color 0.35s ease",
//                         }}
//                     >
//                         <div
//                             className={`rounded-full ${c.pulse ? "animate-pulse" : ""}`}
//                             style={{ width: 6, height: 6, background: c.dot, flexShrink: 0 }}
//                         />
//                         <span style={{ fontSize: 9, color: labelColor, transition: "color 0.35s ease" }}>{c.label}</span>
//                         <span style={{ fontSize: 10, fontWeight: 800, color: "#fd5000" }}>{c.val}</span>
//                     </div>
//                 ))}
//             </div>

//             {/* Tooltip */}
//             {tooltip && (
//                 <div
//                     className="absolute rounded-xl pointer-events-none"
//                     style={{
//                         left: tooltip.x, top: tooltip.y,
//                         background: tooltipBg,
//                         border: `1px solid ${tooltipBdr}`,
//                         padding: "7px 11px",
//                         boxShadow: isDark ? "0 4px 16px rgba(0,0,0,0.5)" : "0 4px 16px rgba(0,0,0,0.08)",
//                         transition: "background 0.2s ease, border-color 0.2s ease",
//                     }}
//                 >
//                     <p style={{ fontSize: 12, fontWeight: 700, color: "#fd5000", marginBottom: 2 }}>{tooltip.label}</p>
//                     <p style={{ fontSize: 10, color: tooltipSub }}>{tooltip.sub}</p>
//                 </div>
//             )}
//         </div>
//     );
// }

// export function Hero() {
//     const [activeCount, setActiveCount] = useState(9200);
//     const [currentWord, setCurrentWord] = useState(0);
//     const words = ["Sell Products", "Build Audiences", "Earn Commissions", "Grow Globally"];

//     useEffect(() => {
//         setActiveCount(Math.floor(Math.random() * 3000) + 8200);
//     }, []);

//     useEffect(() => {
//         const t = setInterval(() => setCurrentWord(w => (w + 1) % words.length), 2800);
//         return () => clearInterval(t);
//     }, []);

//     return (
//         <section className="relative overflow-hidden pt-16 pb-24 sm:pt-24 sm:pb-32" style={{ background: "var(--color-bg)" }}>
//             <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none" style={{ background: "radial-gradient(ellipse at center, rgba(253,80,0,0.06) 0%, transparent 65%)" }} />

//             <div className="max-w-8xl mx-auto px-4 sm:px-6">
//                 <div className="grid grid-cols-1 lg:grid-cols-[1fr_540px] gap-12 xl:gap-20 items-center">

//                     <motion.div initial="hidden" animate="show" variants={stagger} className="text-center lg:text-left">
//                         <motion.div variants={fadeUp} className="flex justify-center lg:justify-start mb-7">
//                             <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-semibold" style={{ background: "rgba(253,80,0,0.08)", border: "1px solid rgba(253,80,0,0.18)", color: "var(--color-accent)" }}>
//                                 <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
//                                 {activeCount.toLocaleString()} people active now
//                             </div>
//                         </motion.div>

//                         <motion.div variants={fadeUp} className="mb-5">
//                             <h1 className="font-black leading-[1.05] tracking-tight" style={{ fontSize: "clamp(2.8rem, 5vw, 4.4rem)", color: "var(--color-text-primary)", letterSpacing: "-0.03em" }}>
//                                 The platform to<br />
//                                 <span className="relative inline-block overflow-hidden" style={{ color: "var(--color-accent)" }}>
//                                     <AnimatePresence mode="wait">
//                                         <motion.span
//                                             key={currentWord}
//                                             initial={{ y: 40, opacity: 0 }}
//                                             animate={{ y: 0, opacity: 1 }}
//                                             exit={{ y: -40, opacity: 0 }}
//                                             transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
//                                             className="block"
//                                         >
//                                             {words[currentWord]}
//                                         </motion.span>
//                                     </AnimatePresence>
//                                 </span>
//                                 <br /><span style={{ color: "var(--color-text-primary)" }}>Anywhere.</span>
//                             </h1>
//                         </motion.div>

//                         <motion.p variants={fadeUp} className="text-base sm:text-lg leading-relaxed mb-9 max-w-[440px] mx-auto lg:mx-0" style={{ color: "var(--color-text-muted)" }}>
//                             {/* Jimvio connects vendors, affiliates and communities globally.
//                             List products, earn commissions, build your network — all in one place. */}
//                             Sell products. Promote offers. Create content. Build your community.
//                             Grow your audience — all in one place.
//                         </motion.p>

//                         <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-10">
//                             <Link href="/register" className="group inline-flex items-center justify-center gap-2.5 px-8 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.97]"
//                                 style={{ height: "50px", background: "var(--color-accent)", boxShadow: "0 6px 22px rgba(253,80,0,0.28)" }}
//                                 onMouseEnter={e => (e.currentTarget.style.background = "var(--color-accent-hover)")}
//                                 onMouseLeave={e => (e.currentTarget.style.background = "var(--color-accent)")}>
//                                 Start for Free <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
//                             </Link>
//                             <Link href="/marketplace" className="inline-flex items-center justify-center gap-2 px-8 rounded-2xl text-sm font-semibold transition-all"
//                                 style={{ height: "50px", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
//                                 onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-border-strong)"; e.currentTarget.style.color = "var(--color-text-primary)"; }}
//                                 onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}>
//                                 Browse Marketplace
//                             </Link>
//                         </motion.div>

//                         <motion.div variants={fadeUp} className="flex items-center gap-5 flex-wrap justify-center lg:justify-start">
//                             {[{ icon: Shield, label: "Secure Payments" }, { icon: CheckCircle, label: "Verified Vendors" }, { icon: Globe, label: "50+ Countries" }].map(({ icon: Icon, label }) => (
//                                 <div key={label} className="flex items-center gap-1.5">
//                                     <Icon className="h-3.5 w-3.5" style={{ color: "var(--color-accent)" }} />
//                                     <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>{label}</span>
//                                 </div>
//                             ))}
//                         </motion.div>
//                     </motion.div>

//                     <motion.div initial={{ opacity: 0, y: 24 }}
//                         animate={{ opacity: 1, y: 0 }}
//                         transition={{ delay: 0.25, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
//                         className="hidden lg:block">
//                         <GlobeCanvas />
//                     </motion.div>

//                 </div>
//             </div>

//             <style>{`@keyframes ping{0%{transform:translate(-50%,-50%) scale(.9);opacity:.7}100%{transform:translate(-50%,-50%) scale(2.4);opacity:0}}`}</style>
//         </section>
//     );
// }

"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Shield, CheckCircle, Globe } from "lucide-react";
import { useTheme } from "next-themes";
import Image from "next/image";

const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = { show: { transition: { staggerChildren: 0.08 } } };

const NODES = [
    { id: 0, label: "Lagos Vendor", sub: "Electronics · 340 sales", type: "vendor", lat: 6, lng: 3, size: 10 },
    { id: 1, label: "Nairobi Affiliate", sub: "Fashion · $2.4K earned", type: "affiliate", lat: -1, lng: 37, size: 8 },
    { id: 2, label: "Kigali Vendor", sub: "Local crafts · 180 sales", type: "vendor", lat: -2, lng: 30, size: 9 },
    { id: 3, label: "Cairo Buyer", sub: "50+ orders · trusted", type: "buyer", lat: 30, lng: 31, size: 7 },
    { id: 4, label: "London Affiliate", sub: "Tech · $5.1K earned", type: "affiliate", lat: 51, lng: 0, size: 9 },
    { id: 5, label: "Dubai Vendor", sub: "Luxury goods · 890 sales", type: "vendor", lat: 25, lng: 55, size: 10 },
    { id: 6, label: "Mumbai Buyer", sub: "Electronics · 120 orders", type: "buyer", lat: 19, lng: 73, size: 7 },
    { id: 7, label: "Singapore Hub", sub: "Asia distribution", type: "vendor", lat: 1, lng: 104, size: 11 },
    { id: 8, label: "Accra Affiliate", sub: "Health · $1.8K earned", type: "affiliate", lat: 5, lng: -0.2, size: 8 },
    { id: 9, label: "Paris Buyer", sub: "Fashion · 200+ orders", type: "buyer", lat: 48, lng: 2, size: 7 },
    { id: 10, label: "NYC Affiliate", sub: "All categories · $8.2K", type: "affiliate", lat: 40, lng: -74, size: 10 },
    { id: 11, label: "São Paulo Vendor", sub: "Lifestyle · 560 sales", type: "vendor", lat: -23, lng: -46, size: 9 },
    { id: 12, label: "Johannesburg", sub: "Multi-category vendor", type: "vendor", lat: -26, lng: 28, size: 8 },
    { id: 13, label: "Dakar Buyer", sub: "Fashion · 80 orders", type: "buyer", lat: 15, lng: -17, size: 6 },
    { id: 14, label: "Toronto Affiliate", sub: "Tech · $3.3K earned", type: "affiliate", lat: 43, lng: -79, size: 8 },
];

const LINKS = [
    [0, 1], [0, 2], [0, 8], [1, 2], [1, 3], [2, 12], [3, 5], [4, 9], [4, 10],
    [5, 6], [5, 7], [7, 6], [8, 13], [10, 14], [10, 11], [11, 13], [12, 3], [4, 5], [9, 3],
];

function nodeColor(type: string, isDark: boolean) {
    if (type === "vendor") return "#fd5000";
    if (type === "affiliate") return "#f0a500";
    return isDark ? "#c0c0c0" : "#555555";
}

function GlobeCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rotRef = useRef(0);
    const hovRef = useRef<number | null>(null);
    const projRef = useRef<any[]>([]);
    const rafRef = useRef<number>(0);
    const isDarkRef = useRef(false);
    const logoRef = useRef<HTMLImageElement | null>(null);

    const [tooltip, setTooltip] = useState<{
        label: string; sub: string; x: number; y: number;
    } | null>(null);
    const [liveTx, setLiveTx] = useState("$1,240 / min");
    const [users, setUsers] = useState("9,200");

    const { theme } = useTheme();
    const isDark = useMemo(() => theme === "dark", [theme]);

    // ── 1. Theme sync ────────────────────────────────────────────────────────
    useEffect(() => {
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const sync = () => {
            isDarkRef.current = theme === "dark";
        };
        sync();
        mq.addEventListener("change", sync);
        const observer = new MutationObserver(sync);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });
        return () => {
            mq.removeEventListener("change", sync);
            observer.disconnect();
        };
    }, [theme]);

    // ── 2. Preload logo image ────────────────────────────────────────────────
    useEffect(() => {
        const img = new window.Image();
        img.src = "/jimvio-logo.png";
        img.onload = () => { logoRef.current = img; };
    }, []);

    // ── 3. Canvas loop ───────────────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        const W = 520, H = 440, CX = W / 2, CY = H / 2, R = 155;
        canvas.width = W;
        canvas.height = H;

        function latLngTo3D(lat: number, lng: number, r: number) {
            const phi = (90 - lat) * Math.PI / 180;
            const theta = (lng + 180) * Math.PI / 180;
            return {
                x: -(r * Math.sin(phi) * Math.cos(theta)),
                y: r * Math.cos(phi),
                z: r * Math.sin(phi) * Math.sin(theta),
            };
        }

        function project(p: { x: number; y: number; z: number }, rot: number) {
            const cosR = Math.cos(rot), sinR = Math.sin(rot);
            const x = p.x * cosR - p.z * sinR;
            const z = p.x * sinR + p.z * cosR;
            return { x: CX + x, y: CY - p.y, z };
        }

        function draw(rot: number) {
            const dark = isDarkRef.current;

            // ── Transparent background (no fillRect — inherits container bg)
            ctx.clearRect(0, 0, W, H);

            // ── Globe sphere outline only ──
            ctx.beginPath();
            ctx.arc(CX, CY, R, 0, Math.PI * 2);
            ctx.fillStyle = dark ? "rgba(30,12,0,0.55)" : "rgba(253,80,0,0.04)";
            ctx.fill();
            ctx.strokeStyle = dark ? "rgba(253,80,0,0.14)" : "rgba(253,80,0,0.20)";
            ctx.lineWidth = 1;
            ctx.stroke();

            const gridColor = dark ? "rgba(253,80,0,0.08)" : "rgba(253,80,0,0.14)";

            // ── Latitude lines ──
            for (let lat = -60; lat <= 60; lat += 30) {
                ctx.beginPath();
                let first = true;
                for (let lng = -180; lng <= 180; lng += 4) {
                    const pp = project(latLngTo3D(lat, lng, R), rot);
                    if (pp.z < 0) { first = true; continue; }
                    first ? ctx.moveTo(pp.x, pp.y) : ctx.lineTo(pp.x, pp.y);
                    first = false;
                }
                ctx.strokeStyle = gridColor;
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }

            // ── Longitude lines ──
            for (let lng = -180; lng <= 180; lng += 30) {
                ctx.beginPath();
                let first = true;
                for (let lat2 = -80; lat2 <= 80; lat2 += 4) {
                    const pp = project(latLngTo3D(lat2, lng, R), rot);
                    if (pp.z < 0) { first = true; continue; }
                    first ? ctx.moveTo(pp.x, pp.y) : ctx.lineTo(pp.x, pp.y);
                    first = false;
                }
                ctx.strokeStyle = gridColor;
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }

            // ── Project nodes ──
            const projected = NODES.map(n => {
                const pp = project(latLngTo3D(n.lat, n.lng, R), rot);
                return { ...n, px: pp.x, py: pp.y, pz: pp.z, visible: pp.z >= 0 };
            });
            projRef.current = projected;

            // ── Links + travelling dots ──
            LINKS.forEach(([a, b], linkIdx) => {
                const na = projected[a], nb = projected[b];
                if (!na.visible || !nb.visible) return;

                const mx = (na.px + nb.px) / 2;
                const my = (na.py + nb.py) / 2 - 40;

                ctx.beginPath();
                ctx.moveTo(na.px, na.py);
                ctx.quadraticCurveTo(mx, my, nb.px, nb.py);
                ctx.strokeStyle = dark ? "rgba(253,80,0,0.12)" : "rgba(253,80,0,0.22)";
                ctx.lineWidth = 0.8;
                ctx.stroke();

                const PERIOD = 3500;
                const offset = (linkIdx / LINKS.length) * PERIOD;
                const t = ((Date.now() + offset) % PERIOD) / PERIOD;
                const bx = (1 - t) * (1 - t) * na.px + 2 * (1 - t) * t * mx + t * t * nb.px;
                const by = (1 - t) * (1 - t) * na.py + 2 * (1 - t) * t * my + t * t * nb.py;

                ctx.beginPath();
                ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
                ctx.fillStyle = nodeColor(na.type, dark);
                ctx.fill();
            });

            const pulsePhase = (Date.now() % 1200) / 1200;

            // ── Nodes ──
            projected.sort((a, b) => a.pz - b.pz).forEach(n => {
                if (!n.visible) return;
                const col = nodeColor(n.type, dark);
                const isHov = hovRef.current === n.id;
                const r = n.size + (isHov ? 3 : 0);

                ctx.beginPath();
                ctx.arc(n.px, n.py, r + 5, 0, Math.PI * 2);
                ctx.fillStyle =
                    col === "#fd5000" ? "rgba(253,80,0,0.15)" :
                        col === "#f0a500" ? "rgba(240,165,0,0.15)" :
                            dark ? "rgba(192,192,192,0.10)" :
                                "rgba(60,60,60,0.08)";
                ctx.fill();

                ctx.beginPath();
                ctx.arc(n.px, n.py, r, 0, Math.PI * 2);
                ctx.fillStyle = col;
                ctx.fill();

                if (isHov) {
                    const pulseR = r + pulsePhase * 20;
                    ctx.beginPath();
                    ctx.arc(n.px, n.py, pulseR, 0, Math.PI * 2);
                    ctx.strokeStyle = col;
                    ctx.lineWidth = 1;
                    ctx.globalAlpha = 1 - pulsePhase;
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                }
            });

            // ── Logo at globe center — rotates with the globe ──
            // r=0 always projects to the exact canvas center regardless of rotation
            const logoPt = project(latLngTo3D(0, 0, 0), rot);
            const logoSize = 28;
            const pingPhase1 = (Date.now() % 2400) / 2400;
            const pingPhase2 = ((Date.now() + 1200) % 2400) / 2400;

            // Ping rings
            [pingPhase1, pingPhase2].forEach(phase => {
                const ringR = 26 + phase * 44;
                ctx.beginPath();
                ctx.arc(logoPt.x, logoPt.y, ringR, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(253,80,0,${0.38 * (1 - phase)})`;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            });

            // Logo background circle
            ctx.beginPath();
            ctx.arc(logoPt.x, logoPt.y, 22, 0, Math.PI * 2);
            ctx.fillStyle = dark ? "rgba(253,80,0,0.14)" : "rgba(253,80,0,0.10)";
            ctx.fill();
            ctx.strokeStyle = "rgba(253,80,0,0.55)";
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Logo image — rotated in sync with globe rotation
            if (logoRef.current) {
                ctx.save();
                ctx.translate(logoPt.x, logoPt.y);
                ctx.rotate(rot); // same rot angle as the globe
                ctx.drawImage(logoRef.current, -logoSize / 2, -logoSize / 2, logoSize, logoSize);
                ctx.restore();
            }

            // "JIMVIO" label
            ctx.save();
            ctx.font = "700 9px sans-serif";
            ctx.fillStyle = "#fd5000";
            ctx.textAlign = "center";
            ctx.letterSpacing = "0.14em";
            ctx.fillText("JIMVIO", logoPt.x, logoPt.y + 38);
            ctx.restore();
        }

        function loop() {
            rotRef.current += 0.003;
            draw(rotRef.current);
            rafRef.current = requestAnimationFrame(loop);
        }

        loop();
        return () => cancelAnimationFrame(rafRef.current);
    }, []);

    // ── 4. Live stats ticker ─────────────────────────────────────────────────
    useEffect(() => {
        const txs = ["$840 / min", "$1,240 / min", "$2,100 / min", "$980 / min", "$1,590 / min"];
        let i = 0;
        const t = setInterval(() => {
            i = (i + 1) % txs.length;
            setLiveTx(txs[i]);
            setUsers((9000 + Math.floor(Math.random() * 800)).toLocaleString());
        }, 3200);
        return () => clearInterval(t);
    }, []);

    function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / canvas.offsetWidth;
        const scaleY = canvas.height / canvas.offsetHeight;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;

        let found: any = null;
        projRef.current.forEach(n => {
            if (!n.visible) return;
            const dx = n.px - mx, dy = n.py - my;
            if (Math.sqrt(dx * dx + dy * dy) < n.size + 8) found = n;
        });

        hovRef.current = found ? found.id : null;
        setTooltip(
            found
                ? { label: found.label, sub: found.sub, x: e.clientX - rect.left + 14, y: e.clientY - rect.top - 10 }
                : null
        );
    }

    const badgeBg = isDark ? "rgba(10,5,0,0.90)" : "rgba(255,255,255,0.95)";
    const badgeBorder = isDark ? "rgba(253,80,0,0.22)" : "rgba(253,80,0,0.28)";
    const labelColor = isDark ? "rgba(255,255,255,0.50)" : "rgba(0,0,0,0.45)";
    const tooltipBg = isDark ? "#1a0a00" : "#ffffff";
    const tooltipBdr = isDark ? "rgba(253,80,0,0.35)" : "rgba(253,80,0,0.25)";
    const tooltipSub = isDark ? "rgba(255,255,255,0.50)" : "rgba(0,0,0,0.45)";
    const legendColor = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";

    return (
        <div
            className="relative -mt-10 w-full overflow-hidden rounded-3xl"
            style={{
                background: "transparent", // ← fully transparent, inherits Hero bg
                height: "450px",
            }}
        >
            <canvas
                ref={canvasRef}
                className="w-full h-full"
                style={{ cursor: "crosshair", display: "block" }}
                onMouseMove={onMouseMove}
                onMouseLeave={() => { hovRef.current = null; setTooltip(null); }}
            />

            {/* Live tx badge */}
            <div
                className="absolute flex items-center gap-2"
                style={{
                    top: 16, left: "50%", transform: "translateX(-50%)",
                    background: badgeBg, border: `1px solid ${badgeBorder}`,
                    borderRadius: 99, padding: "5px 14px",
                    pointerEvents: "none", whiteSpace: "nowrap",
                    transition: "background 0.35s ease, border-color 0.35s ease",
                }}
            >
                <span
                    className="rounded-full animate-pulse"
                    style={{ width: 6, height: 6, background: "#22c55e", display: "inline-block", flexShrink: 0 }}
                />
                <span style={{ fontSize: 10, color: labelColor, transition: "color 0.35s ease" }}>Live transactions:</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: "#fd5000", minWidth: 64 }}>{liveTx}</span>
            </div>

            {/* Legend */}
            <div className="absolute flex flex-col gap-2" style={{ top: 16, right: 16, pointerEvents: "none" }}>
                {[
                    { label: "Vendors", col: "#fd5000" },
                    { label: "Affiliates", col: "#f0a500" },
                    { label: "Buyers", col: isDark ? "#c0c0c0" : "#555555" },
                ].map(l => (
                    <div key={l.label} className="flex items-center gap-2">
                        <div className="rounded-full" style={{ width: 8, height: 8, background: l.col, flexShrink: 0 }} />
                        <span style={{ fontSize: 10, color: legendColor, fontWeight: 500, transition: "color 0.35s ease" }}>
                            {l.label}
                        </span>
                    </div>
                ))}
            </div>

            {/* Stat chips */}
            <div
                className="absolute flex gap-2 flex-wrap justify-center"
                style={{
                    bottom: 16, left: "50%", transform: "translateX(-50%)",
                    pointerEvents: "none", whiteSpace: "nowrap",
                }}
            >
                {[
                    { label: "Active users", val: users, dot: "#22c55e", pulse: true },
                    { label: "Countries", val: "50+", dot: "#fd5000", pulse: false },
                    { label: "Total paid", val: "$1M+", dot: "#fd5000", pulse: false },
                ].map(c => (
                    <div
                        key={c.label}
                        className="flex items-center gap-2"
                        style={{
                            background: badgeBg, border: `1px solid ${badgeBorder}`,
                            borderRadius: 99, padding: "5px 12px",
                            transition: "background 0.35s ease, border-color 0.35s ease",
                        }}
                    >
                        <div
                            className={`rounded-full ${c.pulse ? "animate-pulse" : ""}`}
                            style={{ width: 6, height: 6, background: c.dot, flexShrink: 0 }}
                        />
                        <span style={{ fontSize: 9, color: labelColor, transition: "color 0.35s ease" }}>{c.label}</span>
                        <span style={{ fontSize: 10, fontWeight: 800, color: "#fd5000" }}>{c.val}</span>
                    </div>
                ))}
            </div>

            {/* Tooltip */}
            {tooltip && (
                <div
                    className="absolute rounded-xl pointer-events-none"
                    style={{
                        left: tooltip.x, top: tooltip.y,
                        background: tooltipBg,
                        border: `1px solid ${tooltipBdr}`,
                        padding: "7px 11px",
                        boxShadow: isDark ? "0 4px 16px rgba(0,0,0,0.5)" : "0 4px 16px rgba(0,0,0,0.08)",
                        transition: "background 0.2s ease, border-color 0.2s ease",
                    }}
                >
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#fd5000", marginBottom: 2 }}>{tooltip.label}</p>
                    <p style={{ fontSize: 10, color: tooltipSub }}>{tooltip.sub}</p>
                </div>
            )}
        </div>
    );
}

export function Hero() {
    const [activeCount, setActiveCount] = useState(9200);
    const [currentWord, setCurrentWord] = useState(0);
    const words = ["Sell Products", "Build Audiences", "Earn Commissions", "Grow Globally"];

    useEffect(() => {
        setActiveCount(Math.floor(Math.random() * 3000) + 8200);
    }, []);

    useEffect(() => {
        const t = setInterval(() => setCurrentWord(w => (w + 1) % words.length), 2800);
        return () => clearInterval(t);
    }, []);

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
                                style={{ fontSize: "clamp(2.8rem, 5vw, 4.4rem)", color: "var(--color-text-primary)", letterSpacing: "-0.03em" }}>
                                The platform to<br />
                                <span className="relative inline-block overflow-hidden" style={{ color: "var(--color-accent)" }}>
                                    <AnimatePresence mode="wait">
                                        <motion.span
                                            key={currentWord}
                                            initial={{ y: 40, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: -40, opacity: 0 }}
                                            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
                                            className="block"
                                        >
                                            {words[currentWord]}
                                        </motion.span>
                                    </AnimatePresence>
                                </span>
                                <br /><span style={{ color: "var(--color-text-primary)" }}>Anywhere.</span>
                            </h1>
                        </motion.div>

                        <motion.p variants={fadeUp} className="text-base sm:text-lg leading-relaxed mb-9 max-w-[440px] mx-auto lg:mx-0"
                            style={{ color: "var(--color-text-muted)" }}>
                            Sell products. Promote offers. Create content. Build your community.
                            Grow your audience — all in one place.
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
                            {[
                                { icon: Shield, label: "Secure Payments" },
                                { icon: CheckCircle, label: "Verified Vendors" },
                                { icon: Globe, label: "50+ Countries" },
                            ].map(({ icon: Icon, label }) => (
                                <div key={label} className="flex items-center gap-1.5">
                                    <Icon className="h-3.5 w-3.5" style={{ color: "var(--color-accent)" }} />
                                    <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>{label}</span>
                                </div>
                            ))}
                        </motion.div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="hidden lg:block">
                        <GlobeCanvas />
                    </motion.div>

                </div>
            </div>
        </section>
    );
}