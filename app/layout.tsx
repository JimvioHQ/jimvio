// import type { Metadata } from "next";
// import { ThemeProvider } from "@/components/providers/theme-provider";
// import { CurrencyProvider } from "@/context/CurrencyContext";
// import { Toaster } from "sonner";
// import NextTopLoader from "nextjs-toploader";
// import "../styles/globals.css";
// import { constructMetadata } from "@/lib/seo";
// import { JimvioJsonLd } from "@/components/seo/JimvioJsonLd";
// import { DM_Sans, JetBrains_Mono } from "next/font/google";
// import { ReferralTracker } from "@/components/affiliate/referral-tracker";
// import { StructuredData } from "@/lib/StructuredData";

// export const metadata = constructMetadata();

// const dmSans = DM_Sans({
//   subsets: ["latin"],
//   weight: ["400", "500", "600", "700"],
//   variable: "--font-dm-sans",
//   display: "swap",
// });

// const jetbrainsMono = JetBrains_Mono({
//   subsets: ["latin"],
//   weight: ["400", "500", "700"],
//   variable: "--font-jetbrains-mono",
//   display: "swap",
// });

// export default function RootLayout({ children }: { children: React.ReactNode }) {
//   return (
//     <html
//       lang="en"
//       data-scroll-behavior="smooth"
//       suppressHydrationWarning
//       className={`${dmSans.variable} ${jetbrainsMono.variable}`}
//     >
//       <StructuredData />
//       <body
//         suppressHydrationWarning
//         className="antialiased min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] transition-colors duration-200"
//       >
//         <ThemeProvider>
//           <JimvioJsonLd />
//           <NextTopLoader
//             color="#fd5000"
//             height={3}
//             showSpinner={false}
//             easing="ease"
//             speed={200}
//             shadow="0 0 10px #fd5000,0 0 5px #fd5000"
//           />
//           <ReferralTracker />
//           <CurrencyProvider>{children}</CurrencyProvider>
//           <Toaster
//             richColors
//             position="top-right"
//             toastOptions={{
//               style: {
//                 borderRadius: "10px",
//                 fontFamily: "var(--font-dm-sans), sans-serif",
//                 fontWeight: 600,
//                 border: "1px solid var(--color-border)",
//                 background: "var(--color-surface)",
//                 color: "var(--color-text-primary)",
//               },
//             }}
//           />
//         </ThemeProvider>
//       </body>
//     </html>
//   );
// }

// app/layout.tsx
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { Toaster } from "sonner";
import NextTopLoader from "nextjs-toploader";
import "../styles/globals.css";
import { constructMetadata } from "@/lib/seo";
import { JimvioJsonLd } from "@/components/seo/JimvioJsonLd";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next"
import { ReferralTracker } from "@/components/affiliate/referral-tracker";
export const metadata = constructMetadata();
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <JimvioJsonLd />
      </head>
      <body
        suppressHydrationWarning
        className="antialiased min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] transition-colors duration-200"
      >
        <ThemeProvider>
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
        </ThemeProvider>
      </body>
    </html>
  );
}