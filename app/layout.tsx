
import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { DialogProvider } from "@/components/providers/dialog-provider";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { Toaster } from "sonner";
import NextTopLoader from "nextjs-toploader";
import "../styles/globals.css";
import { constructMetadata } from "@/lib/seo";
import { JimvioJsonLd } from "@/components/seo/JimvioJsonLd";

import { Analytics } from "@vercel/analytics/next"
import { ReferralTracker } from "@/components/affiliate/referral-tracker";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { PlatformStatsProvider } from "@/components/platform/platform-stats-provider";
import { JimvioCopilotLoader } from "@/components/copilot/JimvioCopilotLoader";

import { Outfit, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-family-display",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-family-body",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-family-mono",
  display: "swap",
});

export const metadata: Metadata = constructMetadata();

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fd5000" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${outfit.variable} ${plusJakarta.variable} ${jetbrainsMono.variable}`}
    >
      <body
        suppressHydrationWarning
        className={`${plusJakarta.variable} antialiased min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] transition-colors duration-200`}
      >
        <JimvioJsonLd />
        <ThemeProvider>
          <DialogProvider>
          <NextTopLoader
            color="#fd5000"
            height={3}
            showSpinner={false}
            easing="ease"
            speed={200}
            shadow="0 0 10px #fd5000,0 0 5px #fd5000"
          />
          <ReferralTracker />
          <PlatformStatsProvider>
            <CurrencyProvider>{children}</CurrencyProvider>
          </PlatformStatsProvider>
          <JimvioCopilotLoader />
          <Toaster
            richColors
            position="top-right"
            toastOptions={{
              style: {
                borderRadius: "10px",
                fontFamily: "var(--font-family-body), sans-serif",
                fontWeight: 600,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                color: "var(--color-text-primary)",
              },
            }}
          />
          </DialogProvider>
        </ThemeProvider>
        <ServiceWorkerRegister />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}