import { MarketplaceIntelligenceDashboard } from "@/components/admin/marketplace-intelligence/marketplace-intelligence-dashboard";

export default function MarketplaceIntelligencePage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#111827]">Marketplace Intelligence</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          AI-powered ranking, trending, quality, and health analytics — read-only intelligence layer.
        </p>
      </div>
      <MarketplaceIntelligenceDashboard />
    </div>
  );
}
