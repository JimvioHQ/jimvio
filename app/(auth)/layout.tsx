import type { Metadata } from "next";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = noIndexMetadata(
  "Sign in",
  "Sign in to your Jimvio account.",
  "/login",
);

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
