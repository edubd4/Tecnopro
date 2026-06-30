import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        // TECNOPRO custom — theme-aware via CSS variables
        // Accent colors use RGB format for Tailwind opacity modifier support (e.g. bg-tp-cyan/15)
        tp: {
          bg: "var(--tp-bg)",
          card: "var(--tp-card)",
          input: "var(--tp-input)",
          cyan: "rgb(var(--tp-cyan) / <alpha-value>)",
          teal: "rgb(var(--tp-teal) / <alpha-value>)",
          green: "rgb(var(--tp-green) / <alpha-value>)",
          red: "rgb(var(--tp-red) / <alpha-value>)",
          amber: "rgb(var(--tp-amber) / <alpha-value>)",
          violet: "rgb(var(--tp-violet) / <alpha-value>)",
          text: "var(--tp-text)",
          secondary: "var(--tp-text-secondary)",
          muted: "var(--tp-text-muted)",
          surface: "var(--tp-surface)",
          "surface-low": "var(--tp-surface-low)",
          "surface-mid": "var(--tp-surface-mid)",
          "surface-high": "var(--tp-surface-high)",
          "surface-highest": "var(--tp-surface-highest)",
          steel: "var(--tp-steel)",
          outline: "var(--tp-outline)",
          line: "var(--tp-line)",
          "line-soft": "var(--tp-line-soft)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        sans: ["Inter", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "tp-grad": "linear-gradient(135deg, #22d3ee, #0891b2)",
        "tp-grad-2": "linear-gradient(135deg, #14b8a6, #0891b2)",
      },
    },
  },
  plugins: [],
};
export default config;
