import type { Metadata } from "next";
import { JimvioAiExperience } from "@/components/ai/JimvioAiExperience";

export const metadata: Metadata = {
  title: "Jimvio AI",
  description: "Ask Jimvio AI for help selling, creating, and growing on Jimvio.",
};

export default function JimvioAiPage() {
  return (
    <div
      className="flex h-[calc(100dvh-var(--navbar-height)-60px)] flex-col md:h-[calc(100dvh-var(--navbar-height))]"
      style={{
        background:
          "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(255,122,69,0.16), transparent 60%), radial-gradient(ellipse 40% 30% at 8% 20%, rgba(255,176,140,0.18), transparent 70%), radial-gradient(ellipse 36% 28% at 92% 30%, rgba(255,214,196,0.45), transparent 70%), #fffaf7",
      }}
    >
      <JimvioAiExperience variant="page" />
    </div>
  );
}
