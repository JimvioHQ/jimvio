import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "sonner";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jimvio.com";

export const metadata: Metadata = {
  title: {
    default: "Jimvio – Global Creator-Commerce Ecosystem",
    template: "%s | Jimvio",
  },
  description:
    "Buy, sell, affiliate, influence, and build communities. Jimvio is the global creator-commerce platform built for Africa and beyond.",
  keywords: ["marketplace", "ecommerce", "affiliate", "influencer", "community", "Rwanda", "Africa"],
  authors: [{ name: "Jimvio" }],
  creator: "Jimvio",
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    title: "Jimvio – Global Creator-Commerce Ecosystem",
    description: "The all-in-one platform for buyers, vendors, affiliates, influencers, and communities.",
    siteName: "Jimvio",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jimvio – Global Creator-Commerce Ecosystem",
    description: "The all-in-one platform for buyers, vendors, affiliates, influencers, and communities.",
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Vend+Sans:ital,wght@0,300..700;1,300..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="font-sans antialiased min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] transition-colors duration-200"
        style={{ backgroundColor: "#ffffff", color: "var(--color-text-primary)" }}
      >
        <ThemeProvider>
          {children}
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
