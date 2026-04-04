import React from "react";
import { UGCPostForm } from "@/components/ugc/ugc-post-form";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";

export default async function NewUGCPostPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  // Load products for the post form
  const { data } = await supabase
    .from("products")
    .select("id, name, slug, images")
    .eq("is_active", true)
    .eq("status", "active")
    .limit(100);
    
  const products = data ?? [];

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link 
          href="/dashboard/influencer" 
          className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-[var(--color-border)] text-zinc-500 hover:text-zinc-900 shadow-sm transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight flex items-center gap-2">
            Create UGC Post
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Share reviews, unboxings, or tutorials with the Jimvio community.
          </p>
        </div>
      </div>

      {/* Main Form */}
      <div className="bg-white rounded-[32px] border border-[var(--color-border)] shadow-xl p-6 sm:p-8 relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
          <Sparkles className="w-32 h-32" />
        </div>
        
        <div className="relative z-10">
          <UGCPostForm products={products} />
        </div>
      </div>
    </div>
  );
}
