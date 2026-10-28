import { MarketplacePage } from "@/components/marketplace/new/Marketplacepage ";

/** Shared Physical and Digital shell. Cached catalog reads stay inside MarketplacePage. */
export const revalidate = 60;
export default function MarketplaceBrowseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MarketplacePage />
      {children}
    </>
  );
}
