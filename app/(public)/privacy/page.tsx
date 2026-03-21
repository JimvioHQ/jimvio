import React from "react";
import { Shield, Lock, Eye, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PrivacyPolicyPage() {
  const sections = [
    {
      title: "Data We Collect",
      icon: <Eye className="h-5 w-5" />,
      content: "We collect information you provide directly to us (registration details, profile info), automated data (IP addresses, Cookies), and data from third-party integrations (Supabase, Payment processors)."
    },
    {
      title: "How We Use Data",
      icon: <Shield className="h-5 w-5" />,
      content: "Primarily to provide and improve the Jimvio ecosystem, facilitate transactions between vendors and buyers, manage affiliate commissions, and ensure the security of our community."
    },
    {
      title: "Data Security",
      icon: <Lock className="h-5 w-5" />,
      content: "We use industry-standard encryption (AES-256) and secure cloud infrastructure to protect your data. We never store raw credit card information on our servers."
    }
  ];

  return (
    <div className="bg-[var(--color-bg)] min-h-screen py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-20">
          <Badge className="bg-emerald-100 text-emerald-700 border-none mb-6 px-4 py-1.5 capitalize tracking-widest font-black text-[10px]">
            Updated Mar 13, 2026
          </Badge>
          <h1 className="text-4xl md:text-6xl font-[900] text-[var(--color-text-primary)] mb-6 tracking-tighter">
            Privacy <span className="text-emerald-500">First.</span>
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xl font-medium leading-relaxed">
            Your trust is our most valuable asset. Here is how we handle your information at Jimvio.
          </p>
        </div>

        <div className="bg-white border border-[var(--color-border)] rounded-[3rem] p-8 md:p-16 shadow-xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-[4rem]" />
           
           <div className="space-y-16">
              {sections.map((s, i) => (
                <section key={i} className="space-y-6">
                   <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                         {s.icon}
                      </div>
                      <h2 className="text-2xl font-black text-[var(--color-text-primary)]">{s.title}</h2>
                   </div>
                   <p className="text-md text-[var(--color-text-secondary)] leading-relaxed pl-14">
                      {s.content}
                   </p>
                </section>
              ))}

              <section className="space-y-6">
                 <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                       <CheckCircle className="h-5 w-5" />
                    </div>
                    <h2 className="text-2xl font-black text-[var(--color-text-primary)]">Your Choices</h2>
                 </div>
                 <div className="pl-14 space-y-4">
                    {[
                      "Access and export your personal data anytime.",
                      "Request deletion of your Jimvio account and associated info.",
                      "Opt-out of marketing communications with one click.",
                      "Manage cookie preferences via our settings panel."
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                         <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                         <p className="text-sm text-[var(--color-text-secondary)]">{item}</p>
                      </div>
                    ))}
                 </div>
              </section>

              <div className="p-8 bg-emerald-50 rounded-3xl border border-emerald-100 flex items-start gap-4">
                 <AlertCircle className="h-6 w-6 text-emerald-600 mt-1 shrink-0" />
                 <div>
                    <h4 className="font-black text-emerald-800 mb-1">Important Note</h4>
                    <p className="text-sm text-emerald-700/80 leading-relaxed">
                       This is a simplified summary of our Privacy Policy. For the full legal version, please contact our data protection officer at <span className="font-bold underline cursor-pointer">privacy@jimvio.com</span>.
                    </p>
                 </div>
              </div>
           </div>
        </div>

        <div className="mt-20 text-center text-xs text-muted-c font-bold capitalize tracking-widest">
           Jimvio, Inc. · Global HQ · Kigali, Rwanda
        </div>
      </div>
    </div>
  );
}
