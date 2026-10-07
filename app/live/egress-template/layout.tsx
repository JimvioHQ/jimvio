import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jimvio Live Recorder",
  robots: { index: false, follow: false },
};

/** Minimal chrome-free shell for LiveKit headless Chrome egress. */
export default function EgressTemplateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[9999] m-0 h-screen w-screen overflow-hidden bg-black p-0">
      {children}
    </div>
  );
}
