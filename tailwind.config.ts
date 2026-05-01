import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0d12",
        surface: "#11141b",
        card: "#161a23",
        border: "#222836",
        muted: "#8a93a6",
        text: "#e6e8ee",
        accent: "#7c5cff",
        accent2: "#22d3ee",
        good: "#10b981",
        warn: "#f59e0b",
        bad: "#ef4444",
        wb: "#cb11ab",
        ozon: "#005bff",
        kaspi: "#f14635",
        flip: "#f0a500",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
