import React from "react";
import { Users, Globe, Zap, ArrowRight, Heart, Star, Sparkles, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function CareersPage() {
  const jobs = [
    { title: "Senior Backend Engineer (Go/Node)", team: "Infrastructure", type: "Remote / Kigali", category: "Engineering" },
    { title: "Lead Product Designer", team: "Experience", type: "Remote / Paris", category: "Design" },
    { title: "Growth Marketing Manager", team: "Marketing", type: "Remote / Lagos", category: "Marketing" },
    { title: "Customer Success Specialist", team: "Support", type: "Remote", category: "Support" },
    { title: "Sales Executive (B2B)", team: "Ecosystem", type: "Kigali", category: "Sales" },
    { title: "AI Research Scientist", team: "Jimvio Intelligence", type: "Remote", category: "Engineering" }
  ];

  const values = [
    { icon: <Globe className="h-6 w-6" />, title: "Global by Design", desc: "Our team spans 15+ timezones. We believe talent is distributed, but opportunity should be too." },
    { icon: <Heart className="h-6 w-6" />, title: "Empathy Driven", desc: "We build for the creators and small businesses. Their success is our only metric." },
    { icon: <Zap className="h-6 w-6" />, title: "Fast or Last", desc: "We iterate quickly, ship daily, and embrace organized chaos to solve big problems." },
    { icon: <Star className="h-6 w-6" />, title: "Excellence First", desc: "We are obsessed with quality. From code to copy, we sweat the smallest details." }
  ];

  return (
    <div className="bg-[var(--color-bg)] min-h-screen">
      {/* Hero */}
      <section className="bg-white border-b border-[var(--color-border)] py-24 md:py-32 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-orange-50 to-transparent" />
        <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 relative z-10 text-center">
          <Badge className="bg-[var(--color-accent-light)] text-[var(--color-accent)] border-none mb-6 px-4 py-1.5 capitalize tracking-widest font-black text-[10px]">
             Work with us
          </Badge>
          <h1 className="text-5xl md:text-8xl font-[900] text-[var(--color-text-primary)] mb-8 tracking-tighter leading-[0.9] max-w-4xl mx-auto">
            Build the Future of <span className="text-[var(--color-accent)]">Global Commerce</span>
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xl mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
            Jimvio is a remote-first team of polymaths, builders, and dreamers dedicated to empowering independent creators worldwide.
          </p>
          <div className="flex justify-center gap-4">
            <Button size="xl" className="bg-[var(--color-accent)] font-black rounded-2xl h-16 px-10 shadow-xl shadow-[var(--color-accent)]/20">
              View Openings
            </Button>
            <Button size="xl" variant="outline" className="font-black rounded-2xl h-16 px-10 border-2">
              Our Culture
            </Button>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 max-w-[var(--container-max)] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {values.map((v, i) => (
            <div key={i} className="space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-[var(--color-surface-secondary)] text-[var(--color-accent)] flex items-center justify-center border border-[var(--color-border)] shadow-sm">
                {v.icon}
              </div>
              <h3 className="text-xl font-black text-[var(--color-text-primary)]">{v.title}</h3>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Perks */}
      <section className="py-24 bg-ink-dark text-white">
        <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
             <div className="flex-1 space-y-10">
                <h2 className="text-4xl md:text-5xl font-black leading-tight">Perks that actually <br /><span className="text-[var(--color-accent)]">matter.</span></h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                   {[
                     { title: "Remote-First", desc: "Work from anywhere in the world, on your own schedule." },
                     { title: "Equity Options", desc: "Every employee is an owner at Jimvio." },
                     { title: "Learning Fund", desc: "$2,000 annual stipend for books, courses, or conferences." },
                     { title: "Global Events", desc: "Bi-annual team retreats in incredible locations." },
                     { title: "Setup Stipend", desc: "$2,500 to build your perfect home office." },
                     { title: "Flexible PTO", desc: "Rest is a requirement, not a reward. Take what you need." }
                   ].map((p, i) => (
                     <div key={i} className="space-y-2">
                        <p className="font-black text-lg text-[var(--color-accent)]">{p.title}</p>
                        <p className="text-sm text-white/50">{p.desc}</p>
                     </div>
                   ))}
                </div>
             </div>
             <div className="w-full lg:w-96 aspect-square bg-gradient-to-br from-[var(--color-accent)] to-[#4f46e5]/40 rounded-[3rem] relative overflow-hidden group">
                <div className="absolute inset-0 flex items-center justify-center">
                   <Sparkles className="h-40 w-40 text-white opacity-20 group-hover:rotate-12 transition-transform duration-700" />
                </div>
                <div className="absolute top-10 right-10 p-6 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20">
                   <p className="text-white font-black text-lg leading-tight">"The best work I've ever done with the best people I've ever met."</p>
                   <p className="text-white/60 text-xs mt-4 font-bold capitalize tracking-widest">— Marie, Lead Designer</p>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Jobs Listing */}
      <section className="py-32 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-20">
           <h2 className="text-4xl font-black text-[var(--color-text-primary)] mb-6">Open Roles</h2>
           <p className="text-[var(--color-text-secondary)] font-medium">Don't see a fit? Send us an email at <span className="text-[var(--color-accent)] font-bold">careers@jimvio.com</span></p>
        </div>

        <div className="space-y-4">
          {jobs.map((job, i) => (
            <div key={i} className="group bg-white border border-[var(--color-border)] p-8 rounded-[2rem] flex flex-col md:flex-row md:items-center justify-between gap-8 hover:border-[var(--color-accent)] hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer">
               <div className="space-y-2">
                  <div className="flex items-center gap-3">
                     <h4 className="text-xl font-black text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">{job.title}</h4>
                     <Badge className="bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] border-none text-[8px] font-black">{job.category}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold text-muted-c capitalize tracking-widest">
                     <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {job.team}</span>
                     <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {job.type}</span>
                  </div>
               </div>
               <Button variant="ghost" className="h-12 w-12 rounded-full border-2 border-transparent group-hover:border-[var(--color-accent)] group-hover:text-[var(--color-accent)]">
                  <ArrowRight className="h-6 w-6" />
               </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
