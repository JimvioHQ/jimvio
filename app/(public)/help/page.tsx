import React from "react";
import { HelpCircle, Search, Book, MessageSquare, Zap, ShieldCheck, Mail, ArrowRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function HelpCenterPage() {
  const categories = [
    { icon: <ShieldCheck />, title: "Trust & Safety", count: "12 articles" },
    { icon: <Zap />, title: "Getting Started", count: "8 articles" },
    { icon: <FileText />, title: "Selling Guide", count: "15 articles" },
    { icon: <Book />, title: "Buying Guide", count: "10 articles" },
    { icon: <MessageSquare />, title: "Messenger", count: "5 articles" },
    { icon: <HelpCircle />, title: "FAQ", count: "24 articles" },
  ];

  const commonQuestions = [
    "How do I verify my vendor account?",
    "What is Jimvio Trade Assurance?",
    "How to withdraw affiliate earnings?",
    "Shipping and logistics support for creators",
    "Managing your community subscriptions"
  ];

  return (
    <div className="bg-[var(--color-bg)] min-h-screen">
      {/* Search Header */}
      <section className="bg-white border-b border-[var(--color-border)] py-24 pb-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl md:text-6xl font-[900] text-[var(--color-text-primary)] mb-8 tracking-tighter">
            How can we <span className="text-[var(--color-accent)]">help you?</span>
          </h1>
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-[var(--color-text-muted)] group-focus-within:text-[var(--color-accent)] transition-colors" />
            <Input 
              placeholder="Search for articles, guides, and tutorials..." 
              className="h-20 pl-16 pr-8 text-xl border-2 rounded-2xl shadow-xl shadow-black/5 focus-visible:ring-[var(--color-accent)]"
            />
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
             <span className="text-sm font-bold text-[var(--color-text-muted)] tracking-widest capitalize py-1">Popular:</span>
             {["Verificaton", "Shipping", "Refunds", "API"].map(tag => (
               <span key={tag} className="text-sm font-black text-[var(--color-text-primary)] hover:text-[var(--color-accent)] cursor-pointer transition-colors leading-6">{tag}</span>
             ))}
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 -mt-16 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat, i) => (
            <div key={i} className="bg-white border border-[var(--color-border)] p-8 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 group cursor-pointer">
              <div className="h-12 w-12 rounded-xl bg-[var(--color-accent-light)] text-[var(--color-accent)] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                {cat.icon}
              </div>
              <h3 className="text-xl font-black text-[var(--color-text-primary)] mb-2">{cat.title}</h3>
              <p className="text-xs text-[var(--color-text-muted)] font-bold capitalize tracking-widest">{cat.count}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Articles */}
      <section className="py-24 max-w-4xl mx-auto px-4 sm:px-6">
        <h2 className="text-3xl font-black text-[var(--color-text-primary)] mb-10 text-center">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {commonQuestions.map((q, i) => (
            <div key={i} className="bg-white border border-[var(--color-border)] p-6 rounded-2xl flex items-center justify-between group hover:border-[var(--color-accent)] transition-colors cursor-pointer">
              <span className="font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)]">{q}</span>
              <ArrowRight className="h-5 w-5 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)]" />
            </div>
          ))}
        </div>
      </section>

      {/* Support CTA */}
      <section className="py-24 px-4 bg-white border-y border-[var(--color-border)]">
         <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-black mb-6">Still need assistance?</h2>
            <p className="text-[var(--color-text-secondary)] mb-10 max-w-xl mx-auto">Our support representatives are standing by to help you with your specific issues.</p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
               <div className="bg-[var(--color-surface-secondary)] p-8 rounded-3xl border border-[var(--color-border)] flex-1">
                  <Mail className="h-8 w-8 text-[var(--color-accent)] mx-auto mb-4" />
                  <h4 className="font-black mb-2">Email Support</h4>
                  <p className="text-sm text-[var(--color-text-secondary)] mb-4">Response within 24 hours</p>
                  <Button variant="outline" className="w-full font-black rounded-xl">Contact Us</Button>
               </div>
               <div className="bg-ink-dark p-8 rounded-3xl text-white flex-1">
                  <MessageSquare className="h-8 w-8 text-[var(--color-accent)] mx-auto mb-4" />
                  <h4 className="font-black mb-2 text-white">Live Chat</h4>
                  <p className="text-sm text-white/50 mb-4">Real-time assistance</p>
                  <Button className="w-full bg-[var(--color-accent)] font-black rounded-xl">Start Chat</Button>
               </div>
            </div>
         </div>
      </section>
    </div>
  );
}
