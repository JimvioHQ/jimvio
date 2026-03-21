import React from "react";
import Link from "next/link";
import { Check, Zap, Star, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const plans = [
  {
    name: "Starter",
    description: "Perfect for getting started",
    icon: <Zap className="h-5 w-5" />,
    color: "from-blue-600 to-cyan-600",
    monthlyPrice: 0,
    yearlyPrice: 0,
    badge: null,
    cta: "Get Started Free",
    features: [
      "Buyer account (unlimited orders)",
      "Affiliate role (up to 5 links)",
      "5% platform fee on sales",
      "Basic analytics",
      "Community membership",
      "Email support",
    ],
    limitations: ["No vendor storefront", "Limited affiliate links", "Standard payouts (5–7 days)"],
  },
  {
    name: "Creator",
    description: "For serious creators & sellers",
    icon: <Star className="h-5 w-5" />,
    color: "from-brand-600 to-accent-600",
    monthlyPrice: 15000,
    yearlyPrice: 150000,
    badge: "Most Popular",
    cta: "Start Creator Plan",
    features: [
      "Everything in Starter",
      "Vendor storefront (up to 100 products)",
      "Unlimited affiliate links",
      "Influencer dashboard",
      "Create 1 community",
      "3% platform fee (vs 5%)",
      "Viral clip uploads (up to 20)",
      "Advanced analytics",
      "AI product descriptions (50/mo)",
      "Priority support",
      "Fast payouts (1–2 days)",
    ],
    limitations: [],
  },
  {
    name: "Business",
    description: "For scaling businesses",
    icon: <Building2 className="h-5 w-5" />,
    color: "from-accent-600 to-pink-600",
    monthlyPrice: 50000,
    yearlyPrice: 480000,
    badge: "Best Value",
    cta: "Start Business Plan",
    features: [
      "Everything in Creator",
      "Unlimited products",
      "Create unlimited communities",
      "2% platform fee",
      "Unlimited viral clips",
      "AI generation unlimited",
      "Bulk pricing management",
      "Advanced influencer tools",
      "API access",
      "Custom domain",
      "Dedicated account manager",
      "Instant payouts",
      "White-label options",
    ],
    limitations: [],
  },
];

const faqs = [
  { q: "Can I change plans later?", a: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately." },
  { q: "What payment methods are accepted?", a: "We accept all major mobile money services (MTN, Airtel), Irembopay, and card payments." },
  { q: "Is there a transaction fee?", a: "Platform fees vary by plan: 5% (Starter), 3% (Creator), 2% (Business). There are no hidden fees." },
  { q: "Can I try paid features before subscribing?", a: "Yes! All new accounts get a 14-day free trial of the Creator plan." },
  { q: "What happens to my data if I downgrade?", a: "Your data is always safe. Products and orders remain active, some features may become limited." },
];

export default function PricingPage() {
  return (
    <div className="pt-20 min-h-screen">
      {/* Hero */}
      <section className="py-16 px-4 text-center">
        <Badge variant="default" className="mb-4">Pricing</Badge>
        <h1 className="text-5xl font-black text-white mb-4">
          Simple, <span className="gradient-text">Transparent</span> Pricing
        </h1>
        <p className="text-white/60 text-xl max-w-2xl mx-auto mb-8">
          Start free. Upgrade when you&apos;re ready. No hidden fees, no surprises.
        </p>
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="text-sm text-white/50">Monthly</span>
          <div className="relative">
            <div className="w-12 h-6 bg-brand-600 rounded-full" />
            <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow" />
          </div>
          <span className="text-sm text-white">Yearly</span>
          <Badge variant="success" className="text-xs">Save 20%</Badge>
        </div>
      </section>

      {/* Plans */}
      <section className="py-10 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <Card
              key={plan.name}
              className={`relative ${i === 1 ? "ring-2 ring-primary-500/30" : ""}`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="default" className="px-3 py-1 shadow-brand">{plan.badge}</Badge>
                </div>
              )}
              <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${plan.color} text-white`}>
                    {plan.icon}
                  </div>
                  <div>
                    <h3 className="text-white font-black text-lg">{plan.name}</h3>
                    <p className="text-white/50 text-xs">{plan.description}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-6">
                  {plan.monthlyPrice === 0 ? (
                    <div>
                      <span className="text-4xl font-black text-white">Free</span>
                      <p className="text-white/40 text-sm mt-1">Forever</p>
                    </div>
                  ) : (
                    <div>
                      <span className="text-4xl font-black text-white">
                        RWF {plan.yearlyPrice.toLocaleString()}
                      </span>
                      <span className="text-white/40 text-sm">/year</span>
                      <p className="text-white/40 text-xs mt-1">
                        or RWF {plan.monthlyPrice.toLocaleString()}/month
                      </p>
                    </div>
                  )}
                </div>

                <Button className="w-full mb-6" variant={i === 1 ? "default" : "outline"} size="lg" asChild>
                  <Link href="/register">
                    {plan.cta} <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>

                {/* Features */}
                <ul className="space-y-2.5">
                  {plan.features.map((feature, fi) => (
                    <li key={fi} className="flex items-start gap-2.5 text-sm">
                      <Check className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-white/70">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black text-white text-center mb-10">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-surface rounded-2xl border border-base shadow-card p-5">
                <h3 className="text-white font-semibold mb-2">{faq.q}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
