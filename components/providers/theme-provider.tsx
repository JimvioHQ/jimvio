

// // "use client";

// // import { ThemeProvider as NextThemesProvider } from "@wrksz/themes";

// // export function ThemeProvider({ children }: { children: React.ReactNode }) {
// //   return (
// //     <NextThemesProvider
// //       attribute="class"
// //       defaultTheme="system"
// //       enableSystem
// //       disableTransitionOnChange={false}
// //     >
// //       {children}
// //     </NextThemesProvider>
// //   );
// // }

// "use client";

// import * as React from "react";
// import { ThemeProvider as NextThemesProvider } from "next-themes";

// export function ThemeProvider({ children }: { children: React.ReactNode }) {
//   React.useEffect(() => {
//     const orig = console.error.bind(console);
//     console.error = (...args: unknown[]) => {
//       if (typeof args[0] === "string" && args[0].includes("Encountered a script tag")) return;
//       orig(...args);
//     };
//     return () => { console.error = orig; };
//   }, []);

//   return (
//     <NextThemesProvider
//       disableTransitionOnChange={false}
//       attribute="class"
//       defaultTheme="system"
//       enableSystem
//     >
//       {children}
//     </NextThemesProvider>
//   );
// }

"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

if (typeof window !== "undefined") {
  const _orig = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Encountered a script tag")
    ) return;
    _orig(...args);
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemesProvider>
  );
}