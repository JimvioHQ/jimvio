import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Communities",
  description: "Explore Jimvio communities — learn, earn, and grow together.",
};

export default function CommunitiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}

