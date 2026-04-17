"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Sparkles, Star, ShieldCheck, Package, Globe, ShoppingBag, Store, Video, Share2, Users, TrendingUp } from "lucide-react";
import { ViralStoryRow } from "@/components/marketplace/viral-story-row";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDisplayMoney, cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useAIStore } from "@/lib/store/use-ai-store";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  videos: any[];
  topSuppliersSidebar: Supplier[];
  spotlightCreator: SpotlightCreator;
  primaryCta: { label: string; href: string };
  platformStats?: {
    totalUsers: number;
    totalVendors: number;
    totalProducts: number;
    totalCampaigns: number;
    totalCommunities: number;
    totalEarnings: number;
  };
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

      const isDark = document.documentElement.classList.contains("dark");
      ctx.fillStyle = isDark ? "#1e1e2e" : "#dceefb";
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
      /* theme-aware lights */
      scene.add(new THREE.AmbientLight(isDark ? 0x222222 : 0xffffff, isDark ? 0.7 : 0.55));
      const sun = new THREE.DirectionalLight(isDark ? 0xffbb66 : 0xfff8f0, isDark ? 1.4 : 1.15);
      sun.position.set(4, 2, 3);
      scene.add(sun);
      const fill = new THREE.DirectionalLight(isDark ? 0x444466 : 0xe8f4ff, isDark ? 0.6 : 0.3);
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
function VideoMarquee({ videos, mobile = false }: { videos: any[]; mobile?: boolean }) {
  if (!videos?.length) return null;
  // Duplicate for seamless loop
  const list = [...videos, ...videos, ...videos, ...videos];

  return (
    <div className={cn(
      "relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]",
      mobile ? "h-[220px] py-1" : "h-[450px]"
    )}>
      <motion.div
        animate={{ x: [0, -180 * videos.length] }}
        transition={{
          duration: videos.length * 3.5,
          repeat: Infinity,
          ease: "linear",
        }}
        className="flex gap-4 py-2"
      >
        {list.map((v, i) => (
          <Link
            key={`${v.id}-${i}`}
            href={`/shorts?clip=${v.id}`}
            className={cn(
               "group relative shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-xl transition-transform hover:scale-[1.05]",
               mobile ? "aspect-[9/16] h-[200px]" : "aspect-[9/16] h-[400px]"
            )}
          >
            <img
              src={v.thumbnail_url || v.video_url?.replace(".mp4", ".jpg") || "/hero-bg.png"}
              alt=""
              className="h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-110 group-hover:opacity-100"
            />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
            
            <div className="absolute inset-x-0 bottom-0 p-2 sm:p-3 bg-gradient-to-t from-black/60 to-transparent">
              <div className="flex items-center gap-1.5">
                <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full border border-white/50 bg-white dark:bg-surface/20 backdrop-blur-md overflow-hidden shrink-0">
                  {v.creator?.avatar && <img src={v.creator.avatar} alt="" className="h-full w-full object-cover" />}
                </div>
                <p className="text-[8px] sm:text-[9px] font-black text-white truncate drop-shadow-md">{v.title}</p>
              </div>
            </div>

            {/* Live indicator for mobile hero appeal */}
            <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/40 backdrop-blur-md">
              <div className="h-1 w-1 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-[7px] font-black text-white uppercase tracking-tighter">Live</span>
            </div>
          </Link>
        ))}
      </motion.div>
    </div>
  );
}

export function HomepageHero({
  heroCampaigns,
  socialBar,
  viralClips,
  videos,
  topSuppliersSidebar,
  spotlightCreator,
  primaryCta,
  platformStats,
}: HomepageHeroProps) {
  const { openAssistant } = useAIStore();

  function StartEarnDialog({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button size="lg" className={className}>
            {children}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-xl p-0 border-none bg-transparent shadow-none overflow-visible z-[9999]">
          {/* ── Liquid Glass dialog ── */}
          <div
            className="relative overflow-hidden rounded-[32px] p-6 sm:p-7 max-h-[90vh] overflow-y-auto no-scrollbar"
            style={{
              background: "rgba(255,255,255,0.82)",
              backdropFilter: "blur(48px) saturate(200%) brightness(108%)",
              WebkitBackdropFilter: "blur(48px) saturate(200%) brightness(108%)",
              border: "1px solid rgba(255,255,255,0.88)",
              boxShadow: "0 32px_80px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,1)",
            }}
          >
            {/* Specular diagonal */}
            <div className="pointer-events-none absolute -top-1/2 -left-1/4 w-3/4 h-3/4 rotate-[-25deg]" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.6) 0%, transparent 60%)" }} />
            {/* Orange ambient */}
            <div className="pointer-events-none absolute bottom-0 right-0 w-48 h-48 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(251,146,60,0.12), transparent 65%)" }} />

            <DialogHeader className="mb-6 relative z-10 text-center">
              <div
                className="mx-auto w-12 h-12 rounded-[18px] flex items-center justify-center mb-4"
                style={{
                  background: "rgba(251,146,60,0.12)",
                  backdropFilter: "blur(20px) saturate(160%)",
                  WebkitBackdropFilter: "blur(20px) saturate(160%)",
                  border: "1px solid rgba(251,146,60,0.35)",
                  boxShadow: "0 2px 12px rgba(249,115,22,0.10), inset 0 1px 0 rgba(255,255,255,0.9)",
                }}
              >
                <Sparkles className="h-6 w-6 text-orange-600" />
              </div>
              <DialogTitle className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white tracking-tight">
                How do you want to <span className="text-orange-600">Earn?</span>
              </DialogTitle>
              <p className="text-xs text-stone-500 mt-2 max-w-[280px] mx-auto leading-relaxed">
                Join our professional ecosystem to grow your brand and revenue.
              </p>
            </DialogHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
              {[
                { href: "/communities", icon: Users, color: "blue", label: "Community Program", stat: `${platformStats?.totalCommunities || "12+"} Active Communities`, desc: "Monetize your circle with high-value products." },
                { href: "/ugc", icon: Video, color: "violet", label: "UGC & Clipping", stat: `${platformStats?.totalCampaigns || "150+"} Live Campaigns`, desc: "Turn your short-form creativity into currency." },
                { href: "/influencers/program", icon: Share2, color: "pink", label: "Become Affiliate", stat: "Up to 30% Commission", desc: "Share curated links and earn on every sale." },
                { href: "/vendor/register", icon: Store, color: "orange", label: "Become Vendor", stat: `${platformStats?.totalVendors || "500+"} Verified Vendors`, desc: "Scale your reach through our creator network." },
              ].map(({ href, icon: Icon, color, label, stat, desc }) => (
                <Link
                  key={href}
                  href={href}
                  className="relative overflow-hidden p-4 rounded-[20px] border transition-all group flex flex-col gap-3"
                  style={{
                    background: "rgba(255,255,255,0.65)",
                    backdropFilter: "blur(20px) saturate(160%)",
                    WebkitBackdropFilter: "blur(20px) saturate(160%)",
                    borderColor: "rgba(255,255,255,0.9)",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,1)",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,1)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,1)"; }}
                >
                  <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-20" style={{ background: color === "orange" ? "#f97316" : color === "blue" ? "#3b82f6" : color === "violet" ? "#8b5cf6" : "#ec4899" }} />
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-[14px] group-hover:scale-110 transition-transform border",
                    color === "blue" ? "bg-blue-50/80 text-blue-600 border-blue-100/80" :
                    color === "violet" ? "bg-violet-50/80 text-violet-600 border-violet-100/80" :
                    color === "pink" ? "bg-pink-50/80 text-pink-600 border-pink-100/80" :
                    "bg-orange-50/80 text-orange-600 border-orange-100/80"
                  )} style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,1), 0 2px 6px rgba(0,0,0,0.05)" }}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-semibold text-stone-900 dark:text-white">{label}</h3>
                    <p className="text-[9px] font-semibold text-stone-400 uppercase tracking-widest mt-0.5">{stat}</p>
                    <p className="text-[11px] text-stone-500 mt-1 leading-snug">{desc}</p>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-6 pt-4 relative z-10" style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
              <p className="text-[10px] text-stone-400 text-center">Join {platformStats?.totalUsers || "10,000+"} active members in our global empire.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      {/* ── MOBILE HERO (Immersive Background) ── */}
      {/* ── MOBILE HERO ── */}
      <section
        className="flex flex-col lg:hidden w-full relative overflow-hidden pb-8 px-5 min-h-[400px] justify-center text-center"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 70% -10%, rgba(251,146,60,0.06) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 10% 100%, rgba(186,230,253,0.05) 0%, transparent 55%), var(--color-bg)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        {/* Ambient glow orbs */}
        <div className="pointer-events-none absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-50" style={{ background: "radial-gradient(circle, rgba(251,146,60,0.08), transparent 65%)" }} />
        <div className="pointer-events-none absolute bottom-0 left-0 w-48 h-48 rounded-full blur-3xl opacity-40" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.04), transparent 65%)" }} />
        {/* Top specular line */}
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.9) 50%, transparent)" }} />

        <div className="relative z-10 flex flex-col gap-6 pt-6 items-center">
          <div className="space-y-4">
            {/* Live badge */}
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-orange-700"
              style={{
                background: "rgba(255,255,255,0.8)",
                backdropFilter: "blur(20px) saturate(160%)",
                WebkitBackdropFilter: "blur(20px) saturate(160%)",
                border: "1px solid rgba(251,146,60,0.2)",
                boxShadow: "0 2px 8px rgba(249,115,22,0.05), inset 0 1px 0 rgba(255,255,255,1)",
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse shadow-[0_0_6px_rgba(249,115,22,0.8)]" />
              Global Creator & Sourcing Network
            </div>
            <h1 className="text-[32px] leading-[1.05] font-black text-stone-900 dark:text-white tracking-tight">
              Where products and <br />
              creators drive <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600">global growth.</span>
            </h1>
            <p className="text-[14px] text-stone-400 dark:text-text-muted font-bold leading-relaxed max-w-[280px] mx-auto">
              Build, promote, and scale your empire.
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full max-w-[300px]">
            {/* Primary CTA — orange gradient glass */}
            <div
              className="rounded-[18px] overflow-hidden"
              style={{
                background: "rgba(251,146,60,0.12)",
                backdropFilter: "blur(20px) saturate(160%)",
                WebkitBackdropFilter: "blur(20px) saturate(160%)",
                border: "1px solid rgba(251,146,60,0.35)",
                boxShadow: "0 2px 12px rgba(249,115,22,0.10), inset 0 1px 0 rgba(255,255,255,0.9)",
              }}
            >
              <StartEarnDialog className="h-14 w-full rounded-[18px] border-none text-orange-600 text-[13px] font-black active:scale-[0.97] transition-all bg-transparent hover:bg-orange-500/10 uppercase tracking-widest">
                Start Earning Now →
              </StartEarnDialog>
            </div>

            {/* AI CTA — glass */}
            <button
              onClick={() => openAssistant()}
              className="h-14 rounded-[18px] flex items-center justify-center gap-3 font-black text-stone-700 transition-all uppercase text-[11px] tracking-widest"
              style={{
                background: "rgba(255,255,255,0.72)",
                backdropFilter: "blur(24px) saturate(160%)",
                WebkitBackdropFilter: "blur(24px) saturate(160%)",
                border: "1px solid rgba(255,255,255,0.88)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,1)",
              }}
            >
              <Sparkles className="h-4 w-4 fill-orange-500 stroke-none" /> Activate AI Mode
            </button>
          </div>

          {/* Quick access links */}
          <div className="flex gap-2 pb-1 no-scrollbar overflow-x-auto w-full px-2 justify-center">
            {[
              { icon: ShoppingBag, text: "Marketplace", href: "/marketplace" },
              { icon: TrendingUp, text: "Creators HUB", href: "/influencers/browse" },
            ].map((item) => (
              <Link
                key={item.text}
                href={item.href}
                className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full transition-all"
                style={{
                  background: "rgba(255,255,255,0.72)",
                  backdropFilter: "blur(20px) saturate(160%)",
                  WebkitBackdropFilter: "blur(20px) saturate(160%)",
                  border: "1px solid rgba(255,255,255,0.88)",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,1)",
                }}
              >
                <item.icon className="h-3.5 w-3.5 text-orange-500" />
                <span className="text-[11px] font-black uppercase tracking-wider text-stone-700">{item.text}</span>
              </Link>
            ))}
          </div>

          <div className="w-full mt-2">
            <VideoMarquee videos={videos} mobile />
          </div>
        </div>
      </section>

      {/* ── DESKTOP HERO ── */}
      <section
        className="hidden lg:flex flex-col items-center justify-center w-full min-h-[600px] lg:min-h-[680px] relative overflow-hidden"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 80% -10%, rgba(251,146,60,0.06) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(186,230,253,0.05) 0%, transparent 55%), var(--color-bg)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        {/* Ambient glow orbs */}
        <div className="pointer-events-none absolute top-0 right-1/4 w-[600px] h-[600px] rounded-full" style={{ background: "radial-gradient(circle, rgba(251,146,60,0.05), transparent 65%)", filter: "blur(80px)" }} />
        <div className="pointer-events-none absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.03), transparent 65%)", filter: "blur(60px)" }} />
        {/* Top specular */}
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.9) 50%, transparent)" }} />

        {/* Globe 3D */}
        <div className="absolute inset-0 z-0">
          <GlobeCanvas />
        </div>

        {/* Hero bg image */}
        <div className="absolute inset-0 z-0 select-none pointer-events-none">
          <Image src="/hero-bg.png" alt="Global Growth Background" fill className="object-cover opacity-[0.18] dark:opacity-[0.08] saturate-[1.2] scale-105" priority />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-bg)]/85 via-[var(--color-bg)]/30 to-transparent" />
        </div>

        <div className="relative z-10 w-full max-w-[1440px] mx-auto px-12 grid grid-cols-1 lg:grid-cols-2 items-center gap-20">
          <div className="space-y-7 py-12">
            {/* Live badge */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-semibold uppercase tracking-widest text-orange-700"
              style={{
                background: "rgba(255,237,213,0.75)",
                backdropFilter: "blur(24px) saturate(160%)",
                WebkitBackdropFilter: "blur(24px) saturate(160%)",
                border: "1px solid rgba(251,146,60,0.3)",
                boxShadow: "0 2px 12px rgba(249,115,22,0.10), inset 0 1px 0 rgba(255,255,255,0.9)",
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse shadow-[0_0_6px_rgba(249,115,22,0.8)]" />
              Global Creator & Sourcing Network
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }} className="space-y-4">
              <h1 className="text-5xl xl:text-6xl font-bold text-stone-900 dark:text-white tracking-tight leading-[1.05]">
                Where products & creators drive <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600">global growth.</span>
              </h1>
              <p className="text-base text-stone-600 dark:text-text-muted leading-relaxed max-w-lg">
                Build, promote, and scale your global presence. The premium ecosystem for professional suppliers and verified creators.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.5 }} className="flex items-center gap-3 pt-1">
              {/* Primary CTA */}
              <div
                className="rounded-[18px] overflow-hidden"
                style={{
                  background: "rgba(251,146,60,0.12)",
                  backdropFilter: "blur(20px) saturate(160%)",
                  WebkitBackdropFilter: "blur(20px) saturate(160%)",
                  border: "1px solid rgba(251,146,60,0.35)",
                  boxShadow: "0 2px 12px rgba(249,115,22,0.10), inset 0 1px 0 rgba(255,255,255,0.9)",
                }}
              >
                <StartEarnDialog className="h-14 px-10 rounded-[18px] bg-transparent hover:bg-orange-500/10 border-none text-orange-600 text-[13px] font-black uppercase tracking-widest active:scale-95 transition-all">
                  Start Earning Now →
                </StartEarnDialog>
              </div>
              {/* AI bubble */}
              <button
                onClick={() => openAssistant()}
                className="group h-14 w-14 flex items-center justify-center rounded-[18px] transition-all hidden sm:flex"
                title="Launch AI Sourcing"
                style={{
                  background: "rgba(255,255,255,0.72)",
                  backdropFilter: "blur(24px) saturate(160%)",
                  WebkitBackdropFilter: "blur(24px) saturate(160%)",
                  border: "1px solid rgba(255,255,255,0.88)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,1)",
                }}
              >
                <Sparkles className="h-6 w-6 fill-orange-500 stroke-none group-hover:scale-110 transition-transform" />
              </button>
            </motion.div>

            {/* Quick access glass pills */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.5 }} className="flex flex-wrap gap-2.5 pt-2">
              {[
                { icon: ShoppingBag, text: "Explore Marketplace", href: "/marketplace" },
                { icon: TrendingUp, text: "Creators Hub", href: "/influencers/browse" },
              ].map((item) => (
                <Link
                  key={item.text}
                  href={item.href}
                  className="flex items-center gap-2.5 px-5 py-3 rounded-full transition-all group"
                  style={{
                    background: "rgba(255,255,255,0.72)",
                    backdropFilter: "blur(24px) saturate(160%)",
                    WebkitBackdropFilter: "blur(24px) saturate(160%)",
                    border: "1px solid rgba(255,255,255,0.88)",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,1)",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 20px rgba(249,115,22,0.12), inset 0 1px 0 rgba(255,255,255,1)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(251,146,60,0.3)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,1)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.88)"; }}
                >
                  <item.icon className="h-4 w-4 text-stone-500 group-hover:text-orange-500 transition-colors" />
                  <span className="text-[12px] font-semibold text-stone-700 group-hover:text-stone-900 dark:text-white transition-colors">{item.text}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-stone-300 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </motion.div>
          </div>

          {/* Right column: Video Marquee */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="hidden lg:block h-full relative"
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[800px]">
                <VideoMarquee videos={videos} />
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
