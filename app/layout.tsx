
import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { DialogProvider } from "@/components/providers/dialog-provider";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { Toaster } from "sonner";
import NextTopLoader from "nextjs-toploader";
import "../styles/globals.css";
import { constructMetadata } from "@/lib/seo";
import { JimvioJsonLd } from "@/components/seo/JimvioJsonLd";
import { dmSans, jetbrainsMono } from "./self-hosted-fonts";
import { Analytics } from "@vercel/analytics/next"
import { ReferralTracker } from "@/components/affiliate/referral-tracker";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { ChunkReloadGuard } from "@/components/pwa/chunk-reload-guard";
import { JimvioCopilotLoader } from "@/components/copilot/JimvioCopilotLoader";
import { SoftLaunchProviders } from "@/components/soft-launch/SoftLaunchProviders";
import { CommandCenterLoader } from "@/components/command-center/CommandCenterLoader";
import { normalizeUgcLocale, UGC_LOCALE_COOKIE } from "@/lib/ugc/i18n/messages";
import { handleFromJimvioSubdomain } from "@/lib/commerce-os/domains/host";

export const metadata: Metadata = constructMetadata();

export const viewport: Viewport = {
  // Match the page canvas. An orange theme color is what iOS/Chrome paint
  // into the status bar and the pull-down overscroll area.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1115" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const lang = normalizeUgcLocale(cookieStore.get(UGC_LOCALE_COOKIE)?.value);
  const headerStore = await headers();
  const hostname =
    headerStore.get("x-forwarded-host") || headerStore.get("host") || "";
  const onMerchantStoreHost = Boolean(
    headerStore.get("x-jimvio-store-handle") ||
      headerStore.get("x-jimvio-storefront-path") ||
      handleFromJimvioSubdomain(hostname)
  );
  return (
    <html
      lang={lang}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body
        suppressHydrationWarning
        data-deployment-id={process.env.VERCEL_DEPLOYMENT_ID ?? ""}
        className="antialiased min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] transition-colors duration-200"
      >
        {!onMerchantStoreHost ? <JimvioJsonLd /> : null}
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
          <CurrencyProvider>{children}</CurrencyProvider>
          {!onMerchantStoreHost ? (
            <>
              <JimvioCopilotLoader />
              <CommandCenterLoader />
            </>
          ) : null}
          <SoftLaunchProviders />
          <Toaster
            richColors
            position="top-right"
            toastOptions={{
              style: {
                borderRadius: "10px",
                fontFamily: "var(--font-dm-sans), sans-serif",
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
        <ChunkReloadGuard />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}