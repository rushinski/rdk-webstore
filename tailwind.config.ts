// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          page: "#EFEFEF",
          surface: "#FFFFFF",
          text: "#111111",
          muted: "#888888",
          accent: "#111111",
          sale: "#CC0000",
          border: "#E0E0E0",
          overlay: "rgba(0,0,0,0.45)",
        },
      },
      maxWidth: {
        brand: "1440px",
      },
    },
  },
  plugins: [require("tailwind-scrollbar-hide")],
};

export default config;
