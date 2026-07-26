import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create | Jimvio",
  description: "Create and publish posts to your communities.",
};

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f4f4f5]">
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">{children}</div>
    </div>
  );
}
