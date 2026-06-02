import { Suspense } from "react";
import { MarketplaceData } from "@/components/marketplace/new";
import { HeroBanner } from "@/components/marketplace/new/HeroBanner";
import { Sidebar } from "@/components/marketplace/new/Sidebar";
import { MarketplaceProvider } from "@/components/marketplace/new/marketplace-context";

export default function MarketplacePage() {
    return (
        <div className="min-h-screen bg-background">
            <MarketplaceProvider>
                <main className="mx-auto flex max-w-[1500px] gap-5 px-4 py-5">
                    <Sidebar />
                    <div className="flex min-w-0 flex-1 flex-col gap-5">
                        <HeroBanner />
                        <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-muted" />}>
                            <MarketplaceData />
                        </Suspense>
                    </div>
                </main>
            </MarketplaceProvider>
        </div>
    );
}