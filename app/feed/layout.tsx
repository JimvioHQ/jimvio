import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feed | Jimvio",
  description: "Your creator feed — live sessions, communities, and more.",
};

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
