import React from "react";
import { ShieldCheck, Factory, Globe, Award, CheckCircle2, Search, ArrowRight, Star, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getTopVendors } from "@/services/db";
import Link from "next/link";

export default async function VerifiedExportersPage() {
  const vendors = await getTopVendors(12);

  return (
    <div className="bg-[var(--color-bg)] min-h-screen">
      {/* Hero */}
      <section className="bg-white border-b border-[var(--color-border)] py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-[var(--color-accent)]/5 to-transparent" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 flex flex-col items-center text-center">
          <Badge className="bg-ink-dark text-white border-none mb-6 px-4 py-1.5 capitalize tracking-widest font-black text-[10px]">
            <ShieldCheck className="h-3.5 w-3.5 mr-2" /> Verified Exporters
          </Badge>
          <h1 className="text-5xl md:text-7xl font-[900] text-[var(--color-text-primary)] mb-8 tracking-tighter leading-[0.95]">
            Hand-Picked <span className="text-[var(--color-accent)]">Top Tier</span> Factories
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xl mb-12 max-w-2xl font-medium leading-relaxed">
            The elite 5% of our supplier network. Every exporter in this category has passed rigorous on-site inspections, background checks, and manufacturing capacity audits.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
            {[
              { icon: <Factory />, label: "On-site Audited", desc: "Physical factory inspections completed by 3rd party agencies." },
              { icon: <ShieldCheck />, label: "License Verified", desc: "Business registrations and export licenses fully authenticated." },
              { icon: <Award />, label: "Quality Certified", desc: "ISO, CE, and RoHS certifications verified and kept up to date." }
            ].map((item, i) => (
              <div key={i} className="bg-white border border-[var(--color-border)] p-8 rounded-[2.5rem] shadow-sm flex flex-col items-center">
                <div className="h-12 w-12 rounded-xl bg-[var(--color-accent-light)] text-[var(--color-accent)] flex items-center justify-center mb-6">
                  {item.icon}
                </div>
                <h3 className="text-lg font-black text-[var(--color-text-primary)] mb-2">{item.label}</h3>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Directory Section */}
      <section className="py-24 max-w-[var(--container-max)] mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-16">
          <div>
            <h2 className="text-3xl font-black text-[var(--color-text-primary)] mb-2">Exporters Index</h2>
            <p className="text-[var(--color-text-secondary)]">Search through our elite manufacturers by category or country.</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
              <input placeholder="Search factories..." className="w-full h-11 pl-10 pr-4 bg-white border border-[var(--color-border)] rounded-xl text-sm" />
            </div>
            <Button className="bg-[var(--color-accent)] font-black rounded-xl h-11 px-6">Filter</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {vendors.map((vendor: any) => (
            <div key={vendor.id} className="bg-white border border-[var(--color-border)] rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
               <div className="flex items-start gap-6">
                 <div className="h-28 w-28 rounded-2xl bg-[var(--color-accent-light)] border border-[var(--color-accent-subtle)] flex items-center justify-center text-[var(--color-accent)] font-black text-4xl overflow-hidden shrink-0">
                    {vendor.business_logo ? (
                      <img src={vendor.business_logo} alt={vendor.business_name} className="w-full h-full object-cover" />
                    ) : (
                      vendor.business_name.charAt(0)
                    )}
                 </div>
                 <div className="flex-1">
                   <div className="flex items-center justify-between mb-4">
                     <h3 className="text-2xl font-black text-[var(--color-text-primary)] truncate max-w-[240px]">{vendor.business_name}</h3>
                     <Badge className="bg-green-50 text-green-600 border border-green-200 capitalize text-[10px] font-bold">
                       AUDITED
                     </Badge>
                   </div>
                   
                   <div className="flex items-center gap-6 text-sm text-[var(--color-text-secondary)] mb-6">
                     <div className="flex items-center gap-1.5 font-bold text-[var(--color-text-primary)]">
                        <Star className="h-4 w-4 fill-[#f59e0b] text-[#f59e0b]" /> {vendor.rating || "4.9"}
                     </div>
                     <div className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" /> {vendor.business_country || "Regional"}
                     </div>
                     <div className="flex items-center gap-1.5">
                        <Globe className="h-4 w-4" /> Export: Global
                     </div>
                   </div>

                   <p className="text-sm text-[var(--color-text-secondary)] mb-8 line-clamp-2 leading-relaxed">
                     Specialized in high-end manufacturing with over 15 years of export experience to EU, US, and African markets.
                   </p>

                   <div className="flex gap-4">
                     <Button className="flex-1 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] font-black h-12 rounded-xl">
                       Inquire Now
                     </Button>
                     <Button variant="outline" className="flex-1 font-black h-12 rounded-xl border-2" asChild>
                       <Link href={`/vendors/${vendor.business_slug}`}>View Factory</Link>
                     </Button>
                   </div>
                 </div>
               </div>
            </div>
          ))}
        </div>
        
        <div className="mt-16 text-center">
          <Button variant="ghost" className="font-black text-lg text-[var(--color-text-secondary)]" asChild>
            <Link href="/vendors">View All Manufacturers <ArrowRight className="ml-2 h-5 w-5" /></Link>
          </Button>
        </div>
      </section>

      {/* Verification Steps */}
      <section className="py-24 bg-ink-dark text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl md:text-5xl font-black mb-16 text-center">Our 5-Step Verification</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            {[
              { step: "01", title: "Registration", desc: "Legal business identity check." },
              { step: "02", title: "Capacity", desc: "Audit of machinery and staff." },
              { step: "03", title: "QA/QC", desc: "Review of quality control systems." },
              { step: "04", title: "Financial", desc: "Tax and credit report analysis." },
              { step: "05", title: "R&D", desc: "Innovation and toolchain audit." }
            ].map((s, i) => (
              <div key={i} className="relative pt-10 border-t border-white/20">
                <span className="absolute top-0 left-0 text-3xl font-black text-[var(--color-accent)] -translate-y-1/2 bg-ink-dark pr-4">{s.step}</span>
                <h4 className="font-black mb-3">{s.title}</h4>
                <p className="text-sm text-white/50 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
