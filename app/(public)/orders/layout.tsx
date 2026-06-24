import type { Metadata } from "next";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = noIndexMetadata(
  "Orders",
  "Your Jimvio order history.",
  "/orders",
);

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
