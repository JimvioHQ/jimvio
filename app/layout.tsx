import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { Toaster } from "sonner";
import NextTopLoader from "nextjs-toploader";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jimvio.com";

export const metadata: Metadata = {
  title: {
    default: "Jimvio – Global Creator-Commerce Ecosystem",
    template: "%s | Jimvio",
  },
  description:
    "Buy, sell, affiliate, and influence. Jimvio is the global creator-commerce platform built for Africa and beyond.",
  keywords: ["marketplace", "ecommerce", "affiliate", "influencer", "B2B", "Rwanda", "Africa"],
  authors: [{ name: "Jimvio" }],
  creator: "Jimvio",
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    title: "Jimvio – Global Creator-Commerce Ecosystem",
    description: "The all-in-one platform for buyers, vendors, affiliates, and influencers.",
    siteName: "Jimvio",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jimvio – Global Creator-Commerce Ecosystem",
    description: "The all-in-one platform for buyers, vendors, affiliates, and influencers.",
    creator: "@jimvio",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1 },
  },
  icons: {
    icon: "/jimvio-logo.png",
    shortcut: "/jimvio-logo.png",
    apple: "/jimvio-logo.png",
  },
};

// Do not add <head> here: Next injects CSS into <head>; a manual <head> can drop stylesheets. Fonts: globals.css @import.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="font-sans antialiased min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] transition-colors duration-200"
        style={{ backgroundColor: "#ffffff", color: "var(--color-text-primary)" }}
      >
        <ThemeProvider>
          <NextTopLoader color="#f97316" height={3} showSpinner={false} easing="ease" speed={200} shadow="0 0 10px #f97316,0 0 5px #f97316" />
          <CurrencyProvider>{children}</CurrencyProvider>
          <Toaster
            richColors
            position="top-right"
            toastOptions={{
              style: {
                borderRadius: "16px",
                fontFamily: '"Vend Sans", sans-serif',
                fontWeight: 600,
                border: "1px solid rgba(255,255,255,0.15)",
                backdropFilter: "blur(20px)",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
