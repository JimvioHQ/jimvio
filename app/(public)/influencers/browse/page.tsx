import React from "react";
import Link from "next/link";
import Image from "next/image";
import { getTopVendors } from "@/services/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export default async function InfluencersBrowsePage() {
  const vendors = await getTopVendors(24);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-[1280px] mx-auto px-4 py-10">
        <h1 className="text-3xl font-black text-[var(--color-text-primary)] mb-2">Browse Creators</h1>
        <p className="text-[var(--color-text-secondary)] mb-8">Stores and creators with viral clips and products.</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {vendors.map((v: any) => (
            <Link
              key={v.id}
              href={`/influencers/${v.business_slug}`}
              className="group bg-white border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="aspect-square bg-[var(--color-surface-secondary)] flex items-center justify-center p-6">
                <Avatar className="h-24 w-24 border-4 border-white shadow-lg group-hover:scale-105 transition-transform">
                  <AvatarImage src={v.business_logo} />
                  <AvatarFallback className="bg-[var(--color-accent)] text-white text-2xl font-black">
                    {v.business_name?.charAt(0) ?? "V"}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="p-4">
                <h3 className="font-black text-[var(--color-text-primary)] truncate">{v.business_name}</h3>
                <p className="text-xs text-[var(--color-text-muted)] font-bold mt-0.5">View profile & clips</p>
                <Button size="sm" className="w-full mt-3 rounded-xl bg-[var(--color-accent)] font-bold text-xs">
                  View Profile
                </Button>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
