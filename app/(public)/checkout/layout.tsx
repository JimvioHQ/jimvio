import type { Metadata } from "next";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = noIndexMetadata(
  "Checkout",
  "Secure checkout on Jimvio.",
  "/checkout",
);

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
