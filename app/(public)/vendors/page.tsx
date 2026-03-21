import React from "react";
import Link from "next/link";
import { 
  Globe, 
  MapPin, 
  Star, 
  ShieldCheck, 
  Package, 
  Users, 
  Search,
  ArrowRight,
  TrendingUp,
  Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getTopVendors } from "@/services/db";

export default async function VendorsPage() {
  const vendors = await getTopVendors(20);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Hero Header */}
      <section className="bg-white border-b border-[var(--color-border)] py-16">
        <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6">
          <div className="max-w-3xl">
            <Badge className="bg-[var(--color-accent-light)] text-[var(--color-accent)] border-none mb-4 px-3 py-1">
              SUPPLIER DIRECTORY
            </Badge>
            <h1 className="text-4xl md:text-5xl font-black text-[var(--color-text-primary)] mb-6 leading-tight">
              Connect with Global <span className="text-[var(--color-accent)]">Verified</span> Manufacturers
            </h1>
            <p className="text-lg text-[var(--color-text-secondary)] mb-10 leading-relaxed">
              Browse through our network of thousands of verified suppliers, manufacturers, and wholesalers. Every vendor is audited for quality and reliability.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-text-muted)]" />
                <Input 
                  placeholder="Search by company name or industry..." 
                  className="pl-12 h-14 rounded-xl border-2 shadow-sm focus-visible:ring-[var(--color-accent)]"
                />
              </div>
              <Button className="h-14 px-8 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] font-black rounded-xl">
                Search Suppliers
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Sectors */}
      <section className="py-20 max-w-[var(--container-max)] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: <TrendingUp />, label: "High Growth", desc: "Fastest growing manufacturers this quarter" },
            { icon: <ShieldCheck />, label: "Gold Suppliers", desc: "Top tier verified premium vendors" },
            { icon: <Award />, label: "Award Winning", desc: "Recognized for product quality and service" }
          ].map((item, i) => (
            <div key={i} className="bg-white border border-[var(--color-border)] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-xl bg-[var(--color-accent-light)] text-[var(--color-accent)] flex items-center justify-center mb-6">
                {item.icon}
              </div>
              <h3 className="text-lg font-black text-[var(--color-text-primary)] mb-2">{item.label}</h3>
              <p className="text-sm text-[var(--color-text-secondary)] mb-4">{item.desc}</p>
              <Link href="#" className="text-sm font-bold text-[var(--color-accent)] flex items-center gap-1 hover:gap-2 transition-all">
                Explore All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Vendor List */}
      <section className="py-10 max-w-[var(--container-max)] mx-auto px-4 sm:px-6 mb-20">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-2xl font-black text-[var(--color-text-primary)]">Verified Suppliers</h2>
          <select className="bg-white border border-[var(--color-border)] rounded-lg px-4 py-2 text-sm font-bold">
            <option>Top Sales</option>
            <option>Highest Rated</option>
            <option>Newest</option>
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {vendors.map((vendor: any) => (
            <div key={vendor.id} className="bg-white border border-[var(--color-border)] rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-start gap-5">
                <div className="h-24 w-24 rounded-2xl bg-[var(--color-accent-light)] border border-[var(--color-accent-subtle)] flex items-center justify-center text-[var(--color-accent)] font-black text-3xl overflow-hidden shrink-0">
                  {vendor.business_logo ? (
                    <img src={vendor.business_logo} alt={vendor.business_name} className="w-full h-full object-cover" />
                  ) : (
                    vendor.business_name.charAt(0)
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-black text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors">
                      <Link href={`/vendors/${vendor.business_slug}`}>{vendor.business_name}</Link>
                    </h3>
                    <Badge className="bg-green-50 text-green-600 border border-green-200 capitalize text-[10px] font-bold">
                      VERIFIED
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-[var(--color-text-secondary)] mb-4">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-[#f59e0b] text-[#f59e0b]" />
                      <span className="font-bold text-[var(--color-text-primary)]">{vendor.rating || "4.8"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{vendor.business_country || "Global"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      <span className="font-bold text-[var(--color-text-primary)]">{(vendor.total_sales || 0).toLocaleString()}</span>
                      <span>Sales</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-6">
                    <Badge variant="secondary" className="bg-[#f5f5f5] text-[var(--color-text-secondary)]">Electronics</Badge>
                    <Badge variant="secondary" className="bg-[#f5f5f5] text-[var(--color-text-secondary)]">Wholesale</Badge>
                    <Badge variant="secondary" className="bg-[#f5f5f5] text-[var(--color-text-secondary)]">Fast Delivery</Badge>
                  </div>

                  <div className="flex gap-3">
                    <Button className="flex-1 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] font-bold rounded-xl h-11">
                      Contact Supplier
                    </Button>
                    <Button variant="outline" className="flex-1 font-bold rounded-xl h-11 border-2" asChild>
                      <Link href={`/vendors/${vendor.business_slug}`}>Visit Store</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {vendors.length === 0 && (
            <div className="col-span-full py-20 text-center bg-[var(--color-surface-secondary)] rounded-3xl border-2 border-dashed border-[var(--color-border)]">
              <Users className="h-12 w-12 text-[var(--color-text-muted)] mx-auto mb-4" />
              <p className="text-[var(--color-text-secondary)] font-medium">No vendors found. Try a different search.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
