"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createCommunity } from "@/lib/actions/community";
import { toast } from "sonner";
import { slugify, cn } from "@/lib/utils";
import {
  Users, Globe, Lock, ArrowLeft, Loader2, Sparkles, Crown, ArrowRight
} from "lucide-react";
import Link from "next/link";

const CATEGORIES = [
  "Technology", "Business", "Marketing", "Design", "Finance",
  "Health", "Fitness", "Education", "Music", "Gaming",
  "Crypto", "AI & ML", "Photography", "Writing", "Other"
];

export default function CreateCommunityPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    category: "",
    isPrivate: false,
    monthlyPrice: undefined as number | undefined,
    yearlyPrice: undefined as number | undefined,
  });

  const handleNameChange = (name: string) => {
    setFormData({ ...formData, name, slug: slugify(name) });
  };

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.description.trim() || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    startTransition(async () => {
      const res = await createCommunity(formData);
      if (res.success) {
        toast.success("Community created! 🎉", {
          description: "Your community is live. Start inviting members!",
        });
        router.push(`/communities/${formData.slug}`);
      } else {
        toast.error(res.error || "Failed to create community");
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/community">
          <Button variant="ghost" size="icon" className="rounded-xl">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight">Create Community</h1>
          <p className="text-sm text-[var(--color-text-muted)] font-medium">Build your own audience and monetize your expertise.</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={cn(
              "h-2 rounded-full flex-1 transition-all duration-500",
              s <= step ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"
            )} />
          </div>
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <div className="bg-white/80 backdrop-blur-xl border border-[var(--color-border)] rounded-3xl p-8 space-y-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-[var(--color-accent-light)] flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-[var(--color-accent)]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[var(--color-text-primary)]">Basic Information</h2>
              <p className="text-xs text-[var(--color-text-muted)]">Tell us about your community</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="text-xs font-black text-[var(--color-text-primary)] capitalize tracking-wider mb-2 block">Community Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Tech Founders Club"
                className="w-full h-12 px-4 rounded-2xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] transition-all"
              />
              <p className="text-[10px] text-[var(--color-text-muted)] mt-1.5 font-medium">URL: jimvio.com/communities/{formData.slug || "your-slug"}</p>
            </div>

            <div>
              <label className="text-xs font-black text-[var(--color-text-primary)] capitalize tracking-wider mb-2 block">Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What is your community about? What will members gain?"
                rows={4}
                className="w-full px-4 py-3 rounded-2xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] transition-all resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-black text-[var(--color-text-primary)] capitalize tracking-wider mb-2 block">Category *</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: cat })}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold border transition-all",
                      formData.category === cat
                        ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)] shadow-lg shadow-[var(--color-accent)]/20 scale-105"
                        : "bg-white text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={() => setStep(2)}
              disabled={!formData.name.trim() || !formData.description.trim() || !formData.category}
              className="bg-[var(--color-accent)] text-white font-black rounded-xl px-8 h-12 shadow-lg shadow-[var(--color-accent)]/20"
            >
              Next <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Privacy */}
      {step === 2 && (
        <div className="bg-white/80 backdrop-blur-xl border border-[var(--color-border)] rounded-3xl p-8 space-y-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-[var(--color-accent-light)] flex items-center justify-center">
              <Lock className="h-5 w-5 text-[var(--color-accent)]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[var(--color-text-primary)]">Privacy & Access</h2>
              <p className="text-xs text-[var(--color-text-muted)]">Control who can join and view content</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { value: false, label: "Public", desc: "Anyone can view posts and join", icon: <Globe className="h-6 w-6" /> },
              { value: true, label: "Private", desc: "Only members can view posts", icon: <Lock className="h-6 w-6" /> },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setFormData({ ...formData, isPrivate: opt.value })}
                className={cn(
                  "p-6 rounded-2xl border-2 text-left transition-all",
                  formData.isPrivate === opt.value
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-light)] shadow-lg"
                    : "border-[var(--color-border)] bg-white hover:border-[var(--color-accent)]/50"
                )}
              >
                <div className={cn("mb-3", formData.isPrivate === opt.value ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]")}>{opt.icon}</div>
                <h3 className="font-black text-[var(--color-text-primary)]">{opt.label}</h3>
                <p className="text-xs text-[var(--color-text-muted)] font-medium mt-1">{opt.desc}</p>
              </button>
            ))}
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="ghost" onClick={() => setStep(1)} className="font-bold rounded-xl">
              Back
            </Button>
            <Button onClick={() => setStep(3)} className="bg-[var(--color-accent)] text-white font-black rounded-xl px-8 h-12 shadow-lg shadow-[var(--color-accent)]/20">
              Next <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Pricing */}
      {step === 3 && (
        <div className="bg-white/80 backdrop-blur-xl border border-[var(--color-border)] rounded-3xl p-8 space-y-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-[var(--color-accent-light)] flex items-center justify-center">
              <Crown className="h-5 w-5 text-[var(--color-accent)]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[var(--color-text-primary)]">Pricing</h2>
              <p className="text-xs text-[var(--color-text-muted)]">Set your membership pricing (leave empty for free)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-[var(--color-text-primary)] capitalize tracking-wider mb-2 block">Monthly Price (RWF)</label>
              <input
                type="number"
                value={formData.monthlyPrice || ""}
                onChange={(e) => setFormData({ ...formData, monthlyPrice: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="0.00"
                className="w-full h-12 px-4 rounded-2xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-black text-[var(--color-text-primary)] capitalize tracking-wider mb-2 block">Yearly Price (RWF)</label>
              <input
                type="number"
                value={formData.yearlyPrice || ""}
                onChange={(e) => setFormData({ ...formData, yearlyPrice: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="0.00"
                className="w-full h-12 px-4 rounded-2xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] transition-all"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gradient-to-br from-ink-dark to-[#431407] rounded-2xl p-6 text-white">
            <p className="text-[10px] font-black text-white/40 capitalize tracking-[0.2em] mb-3">Preview</p>
            <h3 className="text-xl font-black mb-1">{formData.name || "Your Community"}</h3>
            <p className="text-xs text-white/50 mb-4">{formData.category} · {formData.isPrivate ? "Private" : "Public"}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black">
                {formData.monthlyPrice ? `RWF ${formData.monthlyPrice.toLocaleString()}` : "FREE"}
              </span>
              {formData.monthlyPrice && <span className="text-white/30 font-bold">/mo</span>}
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="ghost" onClick={() => setStep(2)} className="font-bold rounded-xl">
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              className="bg-[var(--color-accent)] text-white font-black rounded-xl px-8 h-12 shadow-2xl shadow-[var(--color-accent)]/20"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Create Community
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
