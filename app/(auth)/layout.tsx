import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-white dark:bg-bg">
      {/* 
        ========================================
        LEFT COLUMN (Forms)
        ========================================
      */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:flex-none lg:w-1/2 xl:w-5/12 bg-white dark:bg-surface relative">
        <div className="mx-auto w-full max-w-[420px]">
          
          <div className="mb-8">
            <Link href="/" className="inline-flex items-center gap-2 text-[13px] font-semibold text-zinc-500 hover:text-orange-600 transition-colors mb-8">
              <ArrowLeft className="h-4 w-4" /> Back to Jimvio
            </Link>
            <Link href="/" className="block">
              {/* Using CSS filter invert if needed if the logo is white, otherwise it will just show */}
              <Image src="/jimvio-logo.png" alt="Jimvio" width={140} height={44} className="h-8 w-auto mix-blend-multiply" />
            </Link>
          </div>
          
          {children}
          
        </div>
      </div>

      {/* 
        ========================================
        RIGHT COLUMN (Brand Showcase - Desktop Only)
        ========================================
      */}
      <div className="relative hidden w-0 flex-1 lg:block bg-zinc-950 overflow-hidden">
        {/* Subtle, beautiful ambient lighting */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[70%] rounded-full bg-gradient-to-bl from-orange-500/20 via-amber-500/5 to-transparent blur-[130px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tr from-orange-600/10 to-transparent blur-[100px]" />
          <div 
            className="absolute inset-0 opacity-[0.1] mix-blend-overlay"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
          />
        </div>
        
        {/* Typography & Stats */}
        <div className="absolute inset-0 flex flex-col justify-center px-16 xl:px-24 z-10">
          <h2 className="text-4xl xl:text-[52px] font-black tracking-tight text-white mb-6 leading-[1.1]">
            Viral commerce,<br /> built for growth.
          </h2>
          <p className="text-lg text-zinc-400 max-w-md mb-16 leading-relaxed">
            Join an elite network of vendors, creators, and community leaders running powerful affiliate programs.
          </p>
          
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 max-w-lg">
            <div>
              <p className="text-3xl xl:text-4xl font-black text-white mb-1.5">500k+</p>
              <p className="text-[12px] font-bold text-zinc-500 uppercase tracking-widest">Active Products</p>
              <div className="h-0.5 w-8 bg-orange-500/50 mt-4 rounded-full" />
            </div>
            <div>
              <p className="text-3xl xl:text-4xl font-black text-white mb-1.5">$2M+</p>
              <p className="text-[12px] font-bold text-zinc-500 uppercase tracking-widest">Commissions Paid</p>
              <div className="h-0.5 w-8 bg-amber-500/50 mt-4 rounded-full" />
            </div>
          </div>
          
          {/* Subtle footer inside image */}
          <div className="absolute bottom-12 left-16 xl:left-24 text-[12px] font-medium text-zinc-600">
            © {new Date().getFullYear()} Jimvio Inc.
          </div>
        </div>
      </div>
    </div>
  );
}
