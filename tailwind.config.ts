import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Vend Sans"', "sans-serif"],
        outfit: ['"Vend Sans"', "sans-serif"],
      },
      colors: {
        /* Map design tokens for Tailwind; components prefer CSS vars for dark mode */
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-secondary": "var(--color-surface-secondary)",
        border: "var(--color-border)",
        "border-strong": "var(--color-border-strong)",
        "text-primary": "var(--color-text-primary)",
        "text-secondary": "var(--color-text-secondary)",
        "text-muted": "var(--color-text-muted)",
        /** Deep purple surfaces (cards, hero gradients) */
        "ink-dark": "var(--color-bg-dark)",
        "ink-darker": "var(--color-bg-darker)",
        accent: {
          DEFAULT: "var(--color-accent)",
          hover: "var(--color-accent-hover)",
          light: "var(--color-accent-light)",
          400: "#f76707",
          500: "var(--color-accent)",
          600: "var(--color-accent)",
        },
        "accent-hover": "var(--color-accent-hover)",
        "accent-light": "var(--color-accent-light)",
        /* Primary/brand = orange accent for dashboard & components */
        primary: {
          50: "var(--color-accent-light)",
          100: "#ffe8cc",
          200: "#ffd8a8",
          300: "#fd7e14",
          400: "#f76707",
          500: "var(--color-accent)",
          600: "var(--color-accent)",
          700: "var(--color-accent-hover)",
          800: "#c2410c",
          900: "#9a3a0a",
        },
        brand: {
          400: "#f76707",
          500: "var(--color-accent)",
          600: "var(--color-accent)",
        },
        success: "var(--color-success)",
        "success-light": "var(--color-success-light)",
        warning: "var(--color-warning)",
        "warning-light": "var(--color-warning-light)",
        danger: "var(--color-danger)",
        "danger-light": "var(--color-danger-light)",
        muted: "var(--color-surface-secondary)",
      },
      boxShadow: {
        brand: "0 2px 8px rgba(232, 89, 12, 0.25)",
        primary: "0 2px 8px rgba(232, 89, 12, 0.2)",
      },
      spacing: {
        1: "var(--space-1)",
        2: "var(--space-2)",
        3: "var(--space-3)",
        4: "var(--space-4)",
        5: "var(--space-5)",
        6: "var(--space-6)",
        7: "var(--space-7)",
        8: "var(--space-8)",
        9: "var(--space-9)",
        10: "var(--space-10)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        full: "var(--radius-full)",
      },
      maxWidth: {
        container: "var(--container-max)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "fade-in-up": "fadeInUp 0.5s cubic-bezier(0.23, 1, 0.32, 1)",
        "fade-in-down": "fadeInDown 0.3s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        "slide-in": "slideIn 0.2s ease-out",
        "slide-in-left": "slideInLeft 0.4s ease-out",
        "slide-in-right": "slideInRight 0.4s ease-out",
        "shimmer": "shimmer 2s linear infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeInDown: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateY(-4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(249, 115, 22, 0.2)" },
          "50%": { boxShadow: "0 0 40px rgba(249, 115, 22, 0.4)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
