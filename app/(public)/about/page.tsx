import React from "react";
import { Globe, Users, TrendingUp, ShieldCheck, Zap, ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="bg-[var(--color-bg)] min-h-screen">
      {/* Hero */}
      <section className="bg-white py-24 border-b border-[var(--color-border)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-orange-50 to-transparent" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 flex flex-col items-center text-center">
          <Badge className="bg-[var(--color-accent-light)] text-[var(--color-accent)] border-none mb-6 px-4 py-1.5 capitalize tracking-widest font-black text-[10px]">
             Our Mission
          </Badge>
          <h1 className="text-5xl md:text-8xl font-[900] text-[var(--color-text-primary)] mb-8 tracking-tighter leading-[0.9] max-w-4xl">
            Democratizing <span className="text-[var(--color-accent)]">Global Commerce</span>
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xl mb-12 max-w-2xl font-medium leading-relaxed">
            Jimvio is the world&apos;s first creator-commerce ecosystem. We bridge the gap between global manufacturers and the modern creator economy.
          </p>
          <div className="flex gap-4">
             <Button size="xl" className="bg-[var(--color-accent)] font-black rounded-xl h-16 px-10">
               Join Our Network
             </Button>
             <Button size="xl" variant="outline" className="font-black rounded-xl h-16 px-10 border-2">
               Our Values
             </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 bg-[var(--color-surface-secondary)] border-b border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            {[
              { label: "Founded", value: "2024" },
              { label: "Suppliers", value: "15,000+" },
              { label: "Global Reach", value: "120+ Countries" },
              { label: "Annual GMV", value: "$1.2B+" }
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-4xl font-black text-[var(--color-text-primary)] mb-1">{stat.value}</p>
                <p className="text-xs text-[var(--color-text-muted)] font-black capitalize tracking-[0.2em]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-24 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl font-black text-[var(--color-text-primary)] mb-8">The Jimvio Story</h2>
            <div className="space-y-6 text-[var(--color-text-secondary)] text-lg leading-relaxed">
              <p>
                We started with a simple observation: Global supply chains were designed for industrial giants, while the most dynamic force in commerce — independent creators and agile businesses — were left behind.
              </p>
              <p>
                Jimvio was built to change that. We offer a unified platform where manufacturers can reach a global audience of creators, and creators can source verified products with just a few clicks.
              </p>
              <p className="font-bold text-[var(--color-text-primary)]">
                Today, Jimvio powers thousands of businesses, from rural manufacturers in Africa to digital entrepreneurs in the US.
              </p>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-square bg-gradient-to-br from-[var(--color-accent)] to-ink-dark rounded-[4rem] shadow-2xl relative overflow-hidden group">
               <div className="absolute inset-0 flex items-center justify-center">
                  <Globe className="h-40 w-40 text-white opacity-20 group-hover:scale-110 transition-transform duration-700" />
               </div>
               <div className="absolute bottom-10 left-10 p-8 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20">
                  <p className="text-white font-black text-2xl mb-1">Kigali, Rwanda</p>
                  <p className="text-white/60 text-sm font-bold capitalize tracking-widest">Global HQ</p>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 bg-ink-dark text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-4xl font-black mb-16">Our Core Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { icon: <ShieldCheck />, title: "Trust Verified", desc: "Transparency is our foundation. We verify every partner to ensure every trade is safe." },
              { icon: <Zap />, title: "Creator First", desc: "We design our tools for the people driving the future of the internet economy." },
              { icon: <TrendingUp />, title: "Hyper Growth", desc: "We are obsessed with helping our partners scale their revenue and reach." }
            ].map((v, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="h-16 w-16 rounded-2xl bg-[var(--color-accent)] flex items-center justify-center mb-8 shadow-xl shadow-[var(--color-accent)]/20">
                  {v.icon}
                </div>
                <h3 className="text-2xl font-black mb-4">{v.title}</h3>
                <p className="text-white/50 leading-relaxed max-w-xs">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team CTA */}
      <section className="py-24 max-w-6xl mx-auto px-4 sm:px-6 text-center">
         <div className="bg-[var(--color-surface-secondary)] rounded-[3rem] p-16 border border-[var(--color-border)]">
           <Users className="h-12 w-12 text-[var(--color-accent)] mx-auto mb-6" />
           <h2 className="text-4xl font-black text-[var(--color-text-primary)] mb-6">Join the Revolution</h2>
           <p className="text-[var(--color-text-secondary)] text-xl mb-10 max-w-2xl mx-auto">
             We are always looking for visionary talent to help us build the future of commerce.
           </p>
           <Button variant="outline" size="xl" className="font-black rounded-xl border-2 h-16 px-10">
             View Open Roles <ArrowRight className="ml-2 h-5 w-5" />
           </Button>
         </div>
      </section>
    </div>
  );
}
