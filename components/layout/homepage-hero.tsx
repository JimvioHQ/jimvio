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
          <div className="bg-white rounded-[32px] p-6 sm:p-7 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.25)] border border-zinc-100 relative overflow-hidden max-h-[90vh] overflow-y-auto no-scrollbar">
            {/* Reduced Background Decor */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-orange-100/30 rounded-full blur-[80px] -mr-20 -mt-24" />
            
            <DialogHeader className="mb-6 relative z-10 text-center">
              <div className="mx-auto w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-orange-500/20">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <DialogTitle className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
                How do you want to <span className="text-orange-600">Earn?</span>
              </DialogTitle>
              <p className="text-xs font-bold text-zinc-500 mt-2 max-w-[280px] mx-auto leading-relaxed">
                Join our professional ecosystem to grow your brand and revenue.
              </p>
            </DialogHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
              <Link href="/communities" className="bg-zinc-50 hover:bg-white p-4 rounded-2xl border border-transparent hover:border-blue-100 hover:shadow-lg hover:shadow-blue-500/5 transition-all group flex flex-col gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 group-hover:scale-105 transition-transform">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-900 group-hover:text-blue-600 transition-colors">Community Program</h3>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                    {platformStats?.totalCommunities || "12+"} ACTIVE COMMUNITIES
                  </p>
                  <p className="text-[11px] font-semibold text-zinc-500 mt-1 leading-snug">Monetize your circle with high-value products.</p>
                </div>
              </Link>

              <Link href="/ugc" className="bg-zinc-50 hover:bg-white p-4 rounded-2xl border border-transparent hover:border-purple-100 hover:shadow-lg hover:shadow-purple-500/5 transition-all group flex flex-col gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600 group-hover:scale-105 transition-transform">
                  <Video className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-900 group-hover:text-purple-600 transition-colors">UGC & Clipping</h3>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                    {platformStats?.totalCampaigns || "150+"} LIVE CAMPAIGNS
                  </p>
                  <p className="text-[11px] font-semibold text-zinc-500 mt-1 leading-snug">Turn your short-form creativity into currency.</p>
                </div>
              </Link>

              <Link href="/influencers/program" className="bg-zinc-50 hover:bg-white p-4 rounded-2xl border border-transparent hover:border-pink-100 hover:shadow-lg hover:shadow-pink-500/5 transition-all group flex flex-col gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-100 text-pink-600 group-hover:scale-105 transition-transform">
                  <Share2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-900 group-hover:text-pink-600 transition-colors">Become Affiliate</h3>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                    UP TO 30% COMMISSION
                  </p>
                  <p className="text-[11px] font-semibold text-zinc-500 mt-1 leading-snug">Share curated links and earn on every sale.</p>
                </div>
              </Link>

              <Link href="/vendor/register" className="bg-zinc-50 hover:bg-white p-4 rounded-2xl border border-transparent hover:border-orange-100 hover:shadow-lg hover:shadow-orange-500/5 transition-all group flex flex-col gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600 group-hover:scale-105 transition-transform">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-900 group-hover:text-orange-600 transition-colors">Become Vendor</h3>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                    {platformStats?.totalVendors || "500+"} VERIFIED VENDORS
                  </p>
                  <p className="text-[11px] font-semibold text-zinc-500 mt-1 leading-snug">Scale your reach through our creator network.</p>
                </div>
              </Link>
            </div>
            
            <div className="mt-8 pt-4 border-t border-zinc-100 text-center relative z-10">
              <p className="text-[10px] font-bold text-zinc-400">Join {platformStats?.totalUsers || "10,000+"} active members in our global empire.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      {/* ── MOBILE HERO (Immersive Background) ── */}
      <section className="flex flex-col lg:hidden w-full relative overflow-hidden bg-white pb-8 px-5 border-b border-zinc-100 min-h-[380px] justify-center text-center">
        {/* Mobile Background Layer */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero-bg.png"
            alt="Global Growth Background Mobile"
            fill
            className="object-cover opacity-[0.45] saturate-[1.15]"
            priority
          />
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-white/60" />
        </div>

        <div className="relative z-10 flex flex-col gap-6 pt-4 items-center">
          <div className="space-y-4">
            <h1 className="text-[32px] leading-[1.05] font-black text-zinc-900 tracking-tight">
              Where products and creators drive <br />
              <span className="text-orange-500">global growth.</span>
            </h1>
            <p className="text-[14px] font-bold text-zinc-500 leading-relaxed max-w-[280px] mx-auto">
              Build, promote, and scale your empire.
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full max-w-[300px]">
            <StartEarnDialog className="h-14 rounded-2xl bg-zinc-950 border-none text-white text-base font-black shadow-2xl shadow-zinc-950/20 active:scale-[0.98] transition-all">
              Start Earn Now →
            </StartEarnDialog>

            <button onClick={() => openAssistant()} className="h-14 rounded-2xl bg-white/80 border border-zinc-200 flex items-center justify-center gap-3 text-zinc-600 font-black text-sm hover:bg-zinc-50 transition-all backdrop-blur-md">
              <Sparkles className="h-4 w-4 text-orange-500" /> Activate AI Mode
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-5 px-5 w-full justify-center">
            {[
              { icon: ShoppingBag, text: "Explore Marketplace", href: "/marketplace" },
              { icon: TrendingUp, text: "Creators Hub", href: "/influencers/browse" },
            ].map((item) => (
              <Link key={item.text} href={item.href} className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/60 border border-zinc-100 transition-colors backdrop-blur-sm shadow-sm">
                <item.icon className="h-3.5 w-3.5 text-zinc-500" />
                <span className="text-[11px] font-black text-zinc-700">{item.text}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="hidden lg:flex flex-col items-center justify-center w-full min-h-[480px] lg:min-h-[500px] relative overflow-hidden bg-white border-b border-zinc-100">
        {/* Full Bleed Background Image */}
        <div className="absolute inset-0 z-0 select-none">
          <Image
            src="/hero-bg.png"
            alt="Global Growth Background"
            fill
            className="object-cover opacity-[0.65] saturate-[1.25] scale-105"
            priority
          />
          {/* Professional Overlay Gradients */}
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-white/10" />
        </div>

        <div className="relative z-10 w-full max-w-[1440px] mx-auto px-12 grid grid-cols-1 lg:grid-cols-2 items-center gap-20">
          <div className="space-y-6 py-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/50 border border-orange-100/50 shadow-sm backdrop-blur-md"
            >
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600">Global Creator & Sourcing Network</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="space-y-4"
            >
              <h1 className="text-5xl xl:text-6xl font-black text-zinc-900 tracking-tight leading-[1.05]">
                Where products & creators drive <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600">
                  global growth.
                </span>
              </h1>
              <p className="text-base text-zinc-600 font-medium leading-relaxed max-w-lg">
                Build, promote, and scale your global presence. The premium ecosystem for professional suppliers and verified creators.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="flex items-center gap-4 pt-2"
            >
              <StartEarnDialog className="h-14 px-10 rounded-2xl bg-zinc-950 hover:bg-black text-white text-base font-black shadow-xl shadow-zinc-950/10 active:scale-95 transition-all">
                Start Earn Now →
              </StartEarnDialog>
              <button
                onClick={() => openAssistant()}
                className="group h-14 w-14 flex items-center justify-center rounded-2xl bg-white/60 border border-zinc-100 shadow-lg hover:shadow-xl backdrop-blur-md transition-all sm:flex hidden"
                title="Launch AI Sourcing"
              >
                <Sparkles className="h-6 w-6 text-orange-500 fill-orange-500 group-hover:scale-110 transition-transform" />
              </button>
            </motion.div>

            {/* Quick Access Strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="flex flex-wrap gap-2 pt-4"
            >
              {[
{ icon: ShoppingBag, text: "Explore Marketplace", href: "/marketplace" },
              { icon: TrendingUp, text: "Creators Hub", href: "/influencers/browse" },
              ].map((item) => (
                <Link key={item.text} href={item.href} className="flex items-center gap-2.5 px-4 py-4 rounded-xl bg-white/80 border border-orange-400 hover:bg-white transition-all text-[11px] font-black backdrop-blur-sm">
                  <item.icon className={cn("h-4 w-4")} />
                  <span className="text-zinc-700">{item.text}</span>
                </Link>
              ))}
            </motion.div>
          </div>

          {/* Empty right column to let background shine */}
          <div className="hidden lg:block h-full pointer-events-none" />
        </div>
      </section>
    </>
  );
}
