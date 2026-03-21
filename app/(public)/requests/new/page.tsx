import React from "react";
import { 
  Send, 
  Search, 
  HelpCircle, 
  CheckCircle2, 
  FileText, 
  Type, 
  List,
  Mail,
  Smartphone,
  MapPin,
  Package,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function PostBuyingLeadPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="bg-[var(--color-accent-light)] text-[var(--color-accent)] border-none mb-4 px-4 py-1">
            RFX (REQUEST FOR QUOTE)
          </Badge>
          <h1 className="text-3xl md:text-4xl font-[900] text-[var(--color-text-primary)] mb-4">
            Tell Suppliers What You <span className="text-[var(--color-accent)]">Need</span>
          </h1>
          <p className="text-[var(--color-text-secondary)] text-lg max-w-2xl mx-auto">
            Get multiple quotes within 24 hours from verified global suppliers. Save time and money with Jimvio Sourcing.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr,300px] gap-10">
          {/* Main Form */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-8 shadow-[var(--shadow-sm)]">
            <form className="space-y-8">
              
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[var(--color-text-primary)] font-bold">
                  <Type className="h-5 w-5 text-[var(--color-accent)]" />
                  Product Name
                </div>
                <div>
                  <Label htmlFor="product_name" className="sr-only">Product Name</Label>
                  <Input 
                    id="product_name" 
                    placeholder="Example: Raw cotton 100% organic, 500kg" 
                    className="h-12 border-2 focus-visible:ring-[var(--color-accent)]"
                  />
                  <p className="text-xs text-[var(--color-text-muted)] mt-2 italic flex items-center gap-1">
                    <Info className="h-3 w-3" /> Be specific for better results.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[var(--color-text-primary)] font-bold">
                    <List className="h-5 w-5 text-[var(--color-accent)]" />
                    Category
                  </div>
                  <select className="w-full h-12 bg-white border-2 border-[var(--color-border)] rounded-lg px-4 text-sm focus:outline-none focus:border-[var(--color-accent)] transition-colors">
                    <option>Select a category</option>
                    <option>Electronics</option>
                    <option>Fashion & Apparel</option>
                    <option>Machinery</option>
                    <option>Agriculture</option>
                    <option>Industrial Parts</option>
                  </select>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[var(--color-text-primary)] font-bold">
                    <Package className="h-5 w-5 text-[var(--color-accent)]" />
                    Estimated Quantity
                  </div>
                  <div className="flex gap-2">
                    <Input placeholder="Quantity" className="h-12 border-2" />
                    <select className="w-24 bg-white border-2 border-[var(--color-border)] rounded-lg px-2 text-sm">
                      <option>PCS</option>
                      <option>KGs</option>
                      <option>TONS</option>
                      <option>MT</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[var(--color-text-primary)] font-bold">
                  <FileText className="h-5 w-5 text-[var(--color-accent)]" />
                  Detailed Requirements
                </div>
                <Textarea 
                  placeholder="Describe your requirements: color, size, shipping terms (FOB/CIF), certification needs, etc." 
                  className="min-h-[150px] border-2 focus-visible:ring-[var(--color-accent)]"
                />
              </div>

              <div className="pt-6 border-t border-[var(--color-border)]">
                <h3 className="text-[var(--color-text-primary)] font-bold mb-6 flex items-center gap-2">
                  <Mail className="h-5 w-5 text-[var(--color-accent)]" /> Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Business Email</Label>
                    <Input placeholder="name@company.com" className="h-12 border-2" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Phone Number</Label>
                    <Input placeholder="+250 78x xxx xxx" className="h-12 border-2" />
                  </div>
                </div>
              </div>

              <Button className="w-full h-14 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-black text-lg rounded-xl shadow-lg shadow-[var(--color-accent)]/20">
                Post Buying Lead <Send className="ml-2 h-5 w-5" />
              </Button>

              <p className="text-center text-xs text-[var(--color-text-muted)]">
                By submitting, you agree to Jimvio’s Terms of Use and Privacy Policy. Your request will be reviewed by our team before being shared with suppliers.
              </p>
            </form>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            <div className="bg-[var(--color-accent)] rounded-2xl p-6 text-white shadow-xl shadow-[var(--color-accent)]/20">
              <h3 className="font-black text-xl mb-4">Why post a lead?</h3>
              <ul className="space-y-4">
                {[
                  "Get quotes from verified suppliers",
                  "Jimvio Escrow available for all RFQs",
                  "Dedicated sourcing specialist assigned",
                  "Average saving of 15% on procurement"
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-white/60" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white border border-[var(--color-border)] rounded-2xl p-6 shadow-sm">
              <h4 className="font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-[var(--color-accent)]" /> Pro Tips
              </h4>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                Adding your <strong>target price</strong> and <strong>destination port</strong> helps suppliers provide more accurate quotes quickly.
              </p>
            </div>

            <div className="bg-[var(--color-surface-secondary)] rounded-2xl p-6 border border-[var(--color-border)]">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-[var(--color-accent)]" />
                </div>
                <div>
                  <h5 className="font-bold text-sm">Need help?</h5>
                  <p className="text-xs text-[var(--color-text-secondary)]">Talk to a specialist</p>
                </div>
              </div>
              <p className="text-sm font-bold text-[var(--color-text-primary)]">+250 788 000 000</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
