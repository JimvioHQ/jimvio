"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronRight, Sparkles, Star, ShieldCheck, Package, Globe, ShoppingBag, Store, Video, Share2, Users, TrendingUp } from "lucide-react";
import { ViralStoryRow } from "@/components/marketplace/viral-story-row";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDisplayMoney } from "@/lib/utils";
import { motion } from "framer-motion";
import { useAIStore } from "@/lib/store/use-ai-store";

/* ─── Types ─────────────────────────────────────────────── */
type Supplier = { business_name?: string; business_slug?: string; rating?: number };
type SpotlightCreator = { full_name?: string; total_earnings?: number; total_clicks?: number; total_conversions?: number } | null | undefined;
type ViralClip = { id: string; title: string; video_url: string; thumbnail_url?: string; total_views?: number; total_shares?: number; vendors?: { id: string; business_name: string; logo_url?: string } };

interface HomepageHeroProps {
  trustBarItems: { title: string; desc: string }[];
  heroKeywords: string[];
  heroCampaigns: string[];
  socialBar: { successRate: string };
  viralClips: ViralClip[];
  topSuppliersSidebar: Supplier[];
  spotlightCreator: SpotlightCreator;
  primaryCta: { label: string; href: string };
}

/* ─── Globe Canvas ──────────────────────────────────────── */
function GlobeCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    let animId: number;
    const el = mountRef.current;

    import("three").then((THREE) => {
      const W = el.clientWidth;
      const H = el.clientHeight;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(W, H);
      renderer.setClearColor(0x000000, 0);
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
      camera.position.set(0, 0, 3.2);

      /* Procedural texture */
      const texSize = 1024;
      const texCanvas = document.createElement("canvas");
      texCanvas.width = texSize;
      texCanvas.height = texSize / 2;
      const ctx = texCanvas.getContext("2d")!;

      ctx.fillStyle = "#dceefb";
      ctx.fillRect(0, 0, texSize, texSize / 2);

      const continents = [
        { x: 0.13, y: 0.28, rx: 0.09, ry: 0.12 },
        { x: 0.18, y: 0.55, rx: 0.055, ry: 0.11 },
        { x: 0.465, y: 0.22, rx: 0.048, ry: 0.07 },
        { x: 0.49, y: 0.45, rx: 0.065, ry: 0.14 },
        { x: 0.62, y: 0.22, rx: 0.145, ry: 0.1 },
        { x: 0.72, y: 0.6, rx: 0.055, ry: 0.045 },
        { x: 0.23, y: 0.1, rx: 0.04, ry: 0.055 },
      ];

      continents.forEach(({ x, y, rx, ry }) => {
        const cx = x * texSize;
        const cy = y * (texSize / 2);
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry) * texSize);
        grad.addColorStop(0, "rgba(170,210,150,0.95)");
        grad.addColorStop(0.65, "rgba(150,195,130,0.75)");
        grad.addColorStop(1, "rgba(130,175,110,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx * texSize, ry * (texSize / 2), 0, 0, Math.PI * 2);
        ctx.fill();
      });

      const texture = new THREE.CanvasTexture(texCanvas);
      const geo = new THREE.SphereGeometry(1, 72, 72);
      const mat = new THREE.MeshPhongMaterial({
        map: texture,
        specular: new THREE.Color(0xffffff),
        shininess: 12,
        transparent: true,
        opacity: 0.92,
      });
      const globe = new THREE.Mesh(geo, mat);
      scene.add(globe);

      /* Atmosphere */
      const atmosMat = new THREE.MeshPhongMaterial({
        color: new THREE.Color(0xf97316),
        transparent: true,
        opacity: 0.06,
        side: THREE.FrontSide,
      });
      scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.065, 64, 64), atmosMat));

      /* Wireframe */
      const wireMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0xf97316),
        wireframe: true,
        transparent: true,
        opacity: 0.07,
      });
      scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.006, 24, 24), wireMat));

      /* Particles */
      const pc = 200;
      const pos = new Float32Array(pc * 3);
      for (let i = 0; i < pc; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 1.05 + Math.random() * 0.2;
        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i * 3 + 2] = r * Math.cos(phi);
      }
      const pg = new THREE.BufferGeometry();
      pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      scene.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xf97316, size: 0.024, transparent: true, opacity: 0.5 })));

      /* Lights */
      scene.add(new THREE.AmbientLight(0xffffff, 0.55));
      const sun = new THREE.DirectionalLight(0xfff8f0, 1.15);
      sun.position.set(4, 2, 3);
      scene.add(sun);
      const fill = new THREE.DirectionalLight(0xe8f4ff, 0.3);
      fill.position.set(-3, -1, -2);
      scene.add(fill);

      /* Mouse parallax */
      let mx = 0, my = 0;
      const onMouse = (e: MouseEvent) => {
        mx = (e.clientX / window.innerWidth - 0.5) * 0.45;
        my = (e.clientY / window.innerHeight - 0.5) * 0.28;
      };
      window.addEventListener("mousemove", onMouse);

      const clock = new THREE.Clock();
      const animate = () => {
        animId = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();
        globe.rotation.y = t * 0.075 + mx * 0.55;
        globe.rotation.x = my * 0.28;
        camera.position.x = Math.sin(t * 0.04) * 0.06;
        renderer.render(scene, camera);
      };
      animate();

      const onResize = () => {
        const w = el.clientWidth, h = el.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener("resize", onResize);

      return () => {
        cancelAnimationFrame(animId);
        window.removeEventListener("mousemove", onMouse);
        window.removeEventListener("resize", onResize);
        renderer.dispose();
        if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      };
    });

    return () => cancelAnimationFrame(animId);
  }, []);

  return <div ref={mountRef} className="absolute inset-0" style={{ pointerEvents: "none" }} />;
}

/* ─── Main Hero ─────────────────────────────────────────── */
export function HomepageHero({
  heroCampaigns,
  socialBar,
  viralClips,
  topSuppliersSidebar,
  spotlightCreator,
  primaryCta,
}: HomepageHeroProps) {
  const { openAssistant } = useAIStore();

  return (
    <>
      {/* ── MOBILE HERO (Extremely Short - Light) ── */}
      <section className="flex flex-col lg:hidden w-full relative overflow-hidden bg-gradient-to-b from-white to-[#f8f9fb] pt-12 pb-6 px-5 border-b border-zinc-200/50">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-blue-500/5 blur-[60px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col gap-6">
          <div>
            <h1 className="text-[36px] sm:text-[42px] leading-[1.05] font-black text-zinc-900 tracking-tight mb-3">
              Where products and creators drive global <span className="text-[#f97316]">growth.</span>
            </h1>
            <p className="text-[14px] font-bold text-zinc-500 leading-relaxed">
              Build, promote, and scale.
            </p>
          </div>

          {/* AI Mode CTA */}
          <button onClick={() => openAssistant()} className="group relative w-full overflow-hidden rounded-xl">
            <div className="absolute inset-0 rounded-xl p-px bg-gradient-to-br from-orange-300/60 to-orange-500/80">
              <div className="absolute inset-0 rounded-[calc(0.75rem-1px)] bg-white/95 shadow-md shadow-orange-500/6" />
            </div>
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-orange-500/4 to-transparent z-10" />
            <div className="relative z-20 flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-3">
                <div className="relative h-8 w-8 shrink-0">
                  <div className="absolute inset-0 rounded-lg bg-orange-500 blur-md opacity-20 group-hover:opacity-38 transition-opacity" />
                  <div className="relative h-8 w-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-md">
                    <Sparkles className="h-3 w-3 text-white" />
                  </div>
                </div>
                <div className="text-left">
                  <h2 className="text-[13px] sm:text-[15px] font-black text-zinc-900 tracking-tight leading-none mb-0.5">
                    Activate <span className="text-orange-500">AI Mode</span>
                  </h2>
                  <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-[0.12em]">Intelligent Global Sourcing Assistant</p>
                </div>
              </div>
              <div className="h-7 w-7 rounded-lg border border-orange-200 bg-orange-50 flex shrink-0 items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-all duration-300">
                <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </button>

          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-5 px-5">
            <Link href="/marketplace" className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-white border border-zinc-200/80 hover:border-orange-300 shadow-sm transition-colors">
              <ShoppingBag className="h-3.5 w-3.5 text-[#f97316]" />
              <span className="text-[11px] font-black text-zinc-700">Browse</span>
            </Link>
            <Link href="/register?role=supplier" className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-white border border-zinc-200/80 hover:border-blue-300 shadow-sm transition-colors">
              <Store className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-[11px] font-black text-zinc-700">Sell</span>
            </Link>
            <Link href="/register?role=creator" className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-white border border-zinc-200/80 hover:border-purple-300 shadow-sm transition-colors">
              <Video className="h-3.5 w-3.5 text-purple-500" />
              <span className="text-[11px] font-black text-zinc-700">Create</span>
            </Link>
            <Link href="/affiliate" className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-white border border-zinc-200/80 hover:border-emerald-300 shadow-sm transition-colors">
              <Share2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-[11px] font-black text-zinc-700">Affiliate</span>
            </Link>
            <Link href="/communities" className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-white border border-zinc-200/80 hover:border-amber-300 shadow-sm transition-colors">
              <Users className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[11px] font-black text-zinc-700">Community</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ──DESKTOP HERO── */}
      <section className="hidden lg:block w-full relative overflow-hidden" style={{ background: "#f8f9fb" }}>

      {/* ──BACKGROUND ──*/}
      <div className="absolute inset-0 z-0 pointer-events-none">

        {/* Globe */}
        <div className="absolute" style={{
          right: "-12%", top: "50%", transform: "translateY(-50%)",
          width: "68%", aspectRatio: "1/1", opacity: 0.44,
        }}>
          <GlobeCanvas />
        </div>

        {/* Perspective grid */}
        <div className="absolute inset-0" style={{ perspective: "900px", perspectiveOrigin: "50% 100%" }}>
          <div style={{
            position: "absolute", inset: 0,
            transform: "rotateX(70deg) translateZ(-60px) scale(2.5)",
            transformOrigin: "50% 100%",
            backgroundImage: "linear-gradient(rgba(249,115,22,0.055) 1px,transparent 1px),linear-gradient(90deg,rgba(249,115,22,0.055) 1px,transparent 1px)",
            backgroundSize: "48px 48px",
          }} />
        </div>

        {/* Glow behind globe */}
        <div className="absolute" style={{
          right: "-5%", top: "50%", transform: "translateY(-50%)",
          width: "55%", aspectRatio: "1/1",
          background: "radial-gradient(circle at center,rgba(249,115,22,0.08) 0%,transparent 70%)",
          filter: "blur(32px)",
        }} />

        {/* Left glow */}
        <div className="absolute" style={{
          left: "-8%", top: "20%", width: "38%", height: "60%",
          background: "radial-gradient(ellipse at center,rgba(251,191,36,0.06) 0%,transparent 70%)",
          filter: "blur(40px)",
        }} />

        {/* Floating spheres */}
        {([
          { top: "11%", left: "37%", size: 54 },
          { top: "70%", left: "27%", size: 26 },
          { bottom: "18%", right: "38%", size: 16 },
        ] as const).map((s, i) => (
          <div key={i} className="absolute rounded-full" style={{
            top: (s as any).top, bottom: (s as any).bottom,
            left: (s as any).left, right: (s as any).right,
            width: s.size, height: s.size,
            background: "radial-gradient(circle at 35% 30%,rgba(255,255,255,0.75),rgba(249,115,22,0.18) 55%,transparent)",
            boxShadow: "0 4px 20px rgba(249,115,22,0.1),inset 0 1px 1px rgba(255,255,255,0.65)",
            border: "1px solid rgba(249,115,22,0.1)",
            opacity: 0.45 - i * 0.08,
          }} />
        ))}

        {/* Edge lines */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-orange-300/22 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-zinc-300/35 to-transparent" />
      </div>

      {/* ── LAYOUT ── */}
      <div className="relative z-10 mx-auto w-full max-w-[1440px] px-4 sm:px-8 lg:px-12 py-6 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 items-center lg:items-start">

          {/* LEFT - Main Content */}
          <div className="w-full lg:w-[55%] flex flex-col gap-5">

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/70 bg-white/80 shadow-sm px-3.5 py-1.5 backdrop-blur-sm w-fit">
                <span className="w-1 h-1 rounded-full bg-orange-500 animate-pulse" />
                <Sparkles className="h-2.5 w-2.5 text-orange-500" />
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400">Verified global sourcing network</span>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09, duration: 0.5 }}>
              <h1 className="font-black leading-[1.07] tracking-[-0.035em] text-zinc-900" style={{ fontSize: "clamp(2rem,4.5vw,3.2rem)" }}>
                Source <span style={{ WebkitTextStroke: "1.5px #f97316", color: "transparent" }}>products</span>,
              </h1>
              <h1 className="font-black leading-[1.07] tracking-[-0.035em] text-zinc-400" style={{ fontSize: "clamp(2rem,4.5vw,3.2rem)" }}>
                activate creators,
              </h1>
              <h1 className="font-black leading-[1.07] tracking-[-0.035em] text-zinc-900" style={{ fontSize: "clamp(2rem,4.5vw,3.2rem)" }}>
                scale <span className="italic text-orange-500">globally.</span>
              </h1>
            </motion.div>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }}
              className="max-w-md text-[14px] leading-relaxed text-zinc-500 font-medium">
              Premium ecosystem for verified suppliers, live catalog, and campaign-ready creators. From search to settlement.
            </motion.p>

            {/* Features */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.26, duration: 0.45 }}
              className="flex flex-wrap gap-2">
              {[
                { icon: ShieldCheck, text: "Verified Only" },
                { icon: Package, text: "Direct Sourcing" },
                { icon: Globe, text: "Global Escrow" },
              ].map((s) => (
                <div key={s.text} className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-500 bg-white/75 py-1.5 px-2.5 rounded-full border border-zinc-200/60 shadow-sm backdrop-blur-sm">
                  <div className="h-4 w-4 rounded-md bg-orange-50 flex items-center justify-center">
                    <s.icon size={10} className="text-orange-500" />
                  </div>
                  {s.text}
                </div>
              ))}
            </motion.div>

            {/* AI Mode CTA */}
            <motion.button onClick={() => openAssistant()} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.33, duration: 0.5 }} className="group relative w-full overflow-hidden rounded-xl">
              <div className="absolute inset-0 rounded-xl p-px bg-gradient-to-br from-orange-300/60 to-orange-500/80">
                <div className="absolute inset-0 rounded-[calc(0.75rem-1px)] bg-white/95 shadow-md shadow-orange-500/6" />
              </div>
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-orange-500/4 to-transparent z-10" />
              <div className="relative z-20 flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="relative h-8 w-8 shrink-0">
                    <div className="absolute inset-0 rounded-lg bg-orange-500 blur-md opacity-20 group-hover:opacity-38 transition-opacity" />
                    <div className="relative h-8 w-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-md">
                      <Sparkles className="h-3 w-3 text-white" />
                    </div>
                  </div>
                  <div className="text-left">
                    <h2 className="text-[15px] font-black text-zinc-900 tracking-tight leading-none mb-0.5">
                      Activate <span className="text-orange-500">AI Mode</span>
                    </h2>
                    <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-[0.12em]">Intelligent Global Sourcing Assistant</p>
                  </div>
                </div>
                <div className="h-7 w-7 rounded-lg border border-orange-200 bg-orange-50 flex shrink-0 items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-all duration-300">
                  <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </motion.button>

            {/* Quick Access Links - Compact Sizes */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42, duration: 0.5 }}
              className="flex flex-wrap gap-2 mt-2"
            >
              {[
                { icon: ShoppingBag, text: "Browse", href: "/marketplace", color: "text-orange-500 border-orange-200/40 bg-orange-50/40 hover:bg-orange-50/70" },
                { icon: Store, text: "Sell", href: "/register?role=supplier", color: "text-blue-500 border-blue-200/40 bg-blue-50/40 hover:bg-blue-50/70" },
                { icon: Video, text: "Create", href: "/register?role=creator", color: "text-purple-500 border-purple-200/40 bg-purple-50/40 hover:bg-purple-50/70" },
                { icon: Share2, text: "Affiliate", href: "/register?role=affiliate", color: "text-emerald-500 border-emerald-200/40 bg-emerald-50/40 hover:bg-emerald-50/70" },
                { icon: Users, text: "Community", href: "/community", color: "text-amber-500 border-amber-200/40 bg-amber-50/40 hover:bg-amber-50/70" },
                { icon: TrendingUp, text: "Influencers", href: "/influencers", color: "text-pink-500 border-pink-200/40 bg-pink-50/40 hover:bg-pink-50/70" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.text}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all group text-[10px] font-bold ${item.color}`}
                  >
                    <div className="rounded p-0.75 bg-white/30 group-hover:bg-white/50 transition-colors">
                      <Icon className="h-3 w-3 group-hover:scale-110 transition-transform" />
                    </div>
                    <span className="text-zinc-800 group-hover:text-zinc-900">{item.text}</span>
                  </Link>
                );
              })}
            </motion.div>
          </div>

          {/* RIGHT - Trending Clipped Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="w-full lg:w-[45%] flex flex-col gap-3"
          >
            {viralClips && viralClips.length > 0 && (
              <ViralStoryRow clips={viralClips} />
            )}
          </motion.div>
        </div>
      </div>
    </section>
    </>
  );
}
