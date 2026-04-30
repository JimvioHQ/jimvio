// import type { Metadata } from "next";
// import { ThemeProvider } from "@/components/providers/theme-provider";
// import { CurrencyProvider } from "@/context/CurrencyContext";
// import { Toaster } from "sonner";
// import NextTopLoader from "nextjs-toploader";
// import "../styles/globals.css";
// import { constructMetadata } from "@/lib/seo";
// import { JimvioJsonLd } from "@/components/seo/JimvioJsonLd";
// import { DM_Sans, JetBrains_Mono } from "next/font/google";

// export const metadata = constructMetadata();

// import { ReferralTracker } from "@/components/affiliate/referral-tracker";
// import Script from "next/script";

// const jetbrainsMono = JetBrains_Mono({
//   subsets: ['latin'],
//   variable: '--font-jetbrains-mono',
//   weight: ['400', '500', '700'],
//   display: 'swap',
// })

// const dmSans = DM_Sans({
//   subsets: ['latin'],
//   weight: ['400', '500', '600', '700'],
//   variable: '--font-dm-sans',
// })
// export default function RootLayout({ children }: { children: React.ReactNode }) {
//   return (
//     <html
//       lang="en"
//       suppressHydrationWarning
//       className={`${dmSans.className} ${jetbrainsMono.variable}`}
//     >
//       <body
//         className={`  antialiased min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] transition-colors duration-200`}
//       >
//         <ThemeProvider>
//           <JimvioJsonLd />
//           <NextTopLoader color="#fd5000" height={3} showSpinner={false} easing="ease" speed={200} shadow="0 0 10px #fd5000,0 0 5px #fd5000" />
//           <ReferralTracker />
//           <CurrencyProvider>{children} </CurrencyProvider>
//           <Toaster
//             richColors
//             position="top-right"
//             toastOptions={{
//               style: {
//                 borderRadius: "16px",
//                 fontFamily: '"Vend Sans", sans-serif',
//                 fontWeight: 600,
//                 border: "1px solid var(--color-border)",
//                 background: "var(--color-surface)",
//                 color: "var(--color-text)",
//               },
//             }}
//           />

//         </ThemeProvider>
//         <Script
//           id="tawk-to"
//           strategy="afterInteractive"
//           dangerouslySetInnerHTML={{
//             __html: `
//               var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
//               (function(){
//                 var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
//                 s1.async=true;
//                 s1.src='https://embed.tawk.to/69dc3f6fe317ee1c32277901/1jm25fj6v';
//                 s1.charset='UTF-8';
//                 s1.setAttribute('crossorigin','*');
//                 s0.parentNode.insertBefore(s1,s0);
//               })();
//             `,
//           }}
//         />
//       </body>
//     </html>
//   );
// }

import type { Metadata } from "next";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { Toaster } from "sonner";
import NextTopLoader from "nextjs-toploader";
import "../styles/globals.css";
import { constructMetadata } from "@/lib/seo";
import { JimvioJsonLd } from "@/components/seo/JimvioJsonLd";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { ReferralTracker } from "@/components/affiliate/referral-tracker";
import Script from "next/script";

export const metadata = constructMetadata();

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] transition-colors duration-200">
        <ThemeProvider>
          <JimvioJsonLd />
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
                borderRadius: "16px",
                fontFamily: 'var(--font-dm-sans), sans-serif',  // 👈 fixed
                fontWeight: 600,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                color: "var(--color-text-primary)",             // 👈 was --color-text (doesn't exist)
              },
            }}
          />
        </ThemeProvider>

        <Script
          id="tawk-to"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
              (function(){
                var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
                s1.async=true;
                s1.src='https://embed.tawk.to/69dc3f6fe317ee1c32277901/1jm25fj6v';
                s1.charset='UTF-8';
                s1.setAttribute('crossorigin','*');
                s0.parentNode.insertBefore(s1,s0);
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}