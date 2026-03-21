import React from "react";
import { ShieldCheck, Lock, CreditCard, RotateCcw, CheckCircle2, Award, Zap, ArrowRight, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function TradeAssurancePage() {
  return (
    <div className="bg-[var(--color-bg)] min-h-screen">
      {/* Hero */}
      <section className="bg-white border-b border-[var(--color-border)] py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-blue-50 to-transparent" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1">
            <Badge className="bg-blue-50 text-blue-600 border-none mb-6 px-4 py-1.5 capitalize tracking-widest font-black text-[10px]">
              <ShieldCheck className="h-3.5 w-3.5 mr-2" /> Jimvio Secure
            </Badge>
            <h1 className="text-5xl md:text-7xl font-[900] text-[var(--color-text-primary)] mb-8 tracking-tighter leading-[0.95]">
              Source with <span className="text-blue-600">Total Confidence</span>
            </h1>
            <p className="text-[var(--color-text-secondary)] text-xl mb-12 font-medium leading-relaxed">
              Trade Assurance protects your orders from payment to delivery. We ensure your production meets quality standards and arrives on time.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="xl" className="bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl h-16 px-10 shadow-xl shadow-blue-600/20">
                Register as Buyer
              </Button>
              <Button size="xl" variant="outline" className="font-black rounded-xl h-16 px-10 border-2">
                How it Works
              </Button>
            </div>
          </div>
          <div className="flex-1 hidden md:block">
            <div className="relative">
              <div className="absolute -inset-4 bg-blue-600/10 blur-3xl rounded-full" />
              <div className="relative bg-white border border-[var(--color-border)] rounded-[3rem] p-10 shadow-2xl">
                <ShieldCheck className="h-24 w-24 text-blue-600 mx-auto mb-6" />
                <div className="space-y-6">
                  {[
                    "100% Payment Protection",
                    "100% Product Quality Protection",
                    "100% On-time Shipment Protection"
                  ].map((text, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
                      <span className="font-black text-[var(--color-text-primary)] text-sm">{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Pillars */}
      <section className="py-24 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { 
              icon: <Lock className="h-8 w-8 text-blue-600" />, 
              title: "Escrow Payment", 
              desc: "Your money is held securely and only released to the supplier once you confirm the order is satisfactory." 
            },
            { 
              icon: <RotateCcw className="h-8 w-8 text-orange-600" />, 
              title: "Easy Refunds", 
              desc: "If the product quality or shipping date varies from what was agreed, you're entitled to a full or partial refund." 
            },
            { 
              icon: <CreditCard className="h-8 w-8 text-green-600" />, 
              title: "Secure Checkout", 
              desc: "Pay via credit card, wire transfer, or Apple/Google Pay through our encrypted, PCI-compliant gateway." 
            }
          ].map((item, i) => (
            <div key={i} className="text-center">
              <div className="h-16 w-16 rounded-2xl bg-[var(--color-surface-secondary)] flex items-center justify-center mb-8 mx-auto">
                {item.icon}
              </div>
              <h3 className="text-2xl font-black text-[var(--color-text-primary)] mb-4">{item.title}</h3>
              <p className="text-[var(--color-text-secondary)] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quality Inspection */}
      <section className="py-24 bg-[var(--color-surface-secondary)] border-y border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1 order-2 md:order-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-[var(--color-border)] shadow-sm">
                <ShieldAlert className="h-10 w-10 text-orange-500 mb-4" />
                <h4 className="font-black mb-2">Pre-shipment</h4>
                <p className="text-xs text-[var(--color-text-secondary)]">We verify quality before goods leave the factory.</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-[var(--color-border)] shadow-sm mt-8">
                <Award className="h-10 w-10 text-blue-500 mb-4" />
                <h4 className="font-black mb-2">Certification</h4>
                <p className="text-xs text-[var(--color-text-secondary)]">Verification of all industrial standard certificates.</p>
              </div>
            </div>
          </div>
          <div className="flex-1 order-1 md:order-2">
            <h2 className="text-4xl font-black text-[var(--color-text-primary)] mb-6">Zero-Risk Global Sourcing</h2>
            <p className="text-[var(--color-text-secondary)] text-lg mb-8 leading-relaxed">
              We partner with world-class inspection companies like SGS and TUV to provide on-site factory audits and production monitoring. Jimvio is your eyes and ears on the ground.
            </p>
            <ul className="space-y-4 mb-10">
              {["Factory audit reports", "Production monitoring", "Pre-shipment inspection", "Lab testing services"].map((item, i) => (
                <li key={i} className="flex items-center gap-3 font-bold text-[var(--color-text-primary)]">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" /> {item}
                </li>
              ))}
            </ul>
            <Button className="bg-blue-600 hover:bg-blue-700 font-black h-14 rounded-xl px-8">
              Learn About Inspections <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto bg-blue-600 rounded-[3rem] p-16 text-center text-white relative overflow-hidden shadow-2xl shadow-blue-600/30">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 blur-[100px]" />
          <h2 className="text-4xl md:text-5xl font-black mb-6">Safe Trading Starts Here</h2>
          <p className="text-white/70 text-lg mb-10 max-w-xl mx-auto">
            Join thousands of businesses sourcing safely from verified manufacturers around the world.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="xl" className="bg-white text-blue-600 hover:bg-white/90 font-black rounded-xl h-16 px-10">
              Create Secure Account
            </Button>
            <Button size="xl" variant="outline" className="text-white border-white/20 hover:bg-white/5 font-black rounded-xl h-16 px-10">
               Contact Support
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
