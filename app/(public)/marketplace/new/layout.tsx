import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Upload Product | Jimvio",
  description: "Add a product to your Jimvio store",
};

export default function UploadProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
