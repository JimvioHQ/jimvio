import React from "react";
import { FileText, Gavel, Scale, AlertTriangle, CheckSquare, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function TermsPage() {
  const laws = [
    {
      title: "Platform Usage",
      content: "Users must be at least 18 years old to use Jimvio. You are responsible for maintaining the confidentiality of your account and all activities that occur under your credentials."
    },
    {
      title: "Vendor Agreements",
      content: "Vendors agree to provide accurate product descriptions, maintain inventory levels, and fulfill orders within the stated timeframe. Fees are clearly outlined in the vendor dashboard."
    },
    {
      title: "Affiliate Ethics",
      content: "Affiliates must disclose their relationship with Jimvio when promoting products. Deceptive marketing practices (spam, click-fraud) will result in immediate account termination."
    },
    {
      title: "Limitation of Liability",
      content: "Jimvio is a marketplace ecosystem. While we verify partners, we are not liable for disputes between parties beyond the scope of our Trade Assurance program."
    }
  ];

  return (
    <div className="bg-[var(--color-bg)] min-h-screen py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-20">
          <Badge className="bg-amber-100 text-amber-700 border-none mb-6 px-4 py-1.5 capitalize tracking-widest font-black text-[10px]">
            Legal Framework v2.1
          </Badge>
          <h1 className="text-4xl md:text-6xl font-[900] text-[var(--color-text-primary)] mb-6 tracking-tighter">
            Terms of <span className="text-amber-500">Service.</span>
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xl font-medium leading-relaxed max-w-2xl mx-auto">
            These terms govern your use of the Jimvio platform. By joining our network, you agree to these rules.
          </p>
        </div>

        <div className="space-y-8">
           {laws.map((law, i) => (
             <div key={i} className="bg-white border border-[var(--color-border)] p-10 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all duration-500 group">
                <div className="flex flex-col md:flex-row gap-8">
                   <div className="h-14 w-14 shrink-0 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors duration-500">
                      {i === 0 ? <FileText /> : i === 1 ? <Scale /> : i === 2 ? <Gavel /> : <Shield />}
                   </div>
                   <div className="space-y-4">
                      <h3 className="text-2xl font-black text-[var(--color-text-primary)]">{law.title}</h3>
                      <p className="text-md text-[var(--color-text-secondary)] leading-relaxed">
                         {law.content}
                      </p>
                   </div>
                </div>
             </div>
           ))}

           <div className="bg-orange-600 rounded-[3rem] p-12 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 -mr-32 -mt-32 rounded-full" />
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                 <div className="h-20 w-20 shrink-0 rounded-full bg-white/20 flex items-center justify-center">
                    <AlertTriangle className="h-10 w-10 text-white" />
                 </div>
                 <div className="space-y-4">
                    <h2 className="text-3xl font-black">Violation Policy</h2>
                    <p className="text-white/80 leading-relaxed font-medium">
                       We take our community standards seriously. Any breach of these terms may result in temporary suspension or permanent ban from the Jimvio ecosystem. We reserve the right to report illegal activities to the relevant authorities in Rwanda or internationally.
                    </p>
                 </div>
              </div>
           </div>
        </div>

        <div className="mt-20 border-t border-[var(--color-border)] pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-emerald-500" />
              <span className="text-sm font-bold text-[var(--color-text-secondary)]">I agree to these terms by using the site.</span>
           </div>
           <p className="text-xs text-muted-c font-bold capitalize tracking-widest">© 2026 Jimvio Legal Dept.</p>
        </div>
      </div>
    </div>
  );
}
