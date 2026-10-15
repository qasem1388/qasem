import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1320px" } },
    extend: {
      fontFamily: { sans: ["Tajawal", "IBM Plex Sans Arabic", "system-ui", "sans-serif"] },
      colors: {
        brand: {
          50: "#f2f7f5", 100: "#dfece6", 200: "#c0d9ce", 300: "#94beaf",
          400: "#659d8b", 500: "#468170", 600: "#346759", 700: "#2b5349",
          800: "#25433c", 900: "#1f3832", 950: "#0f1f1b",
        },
        gold: { 400: "#d9b46a", 500: "#c99a45", 600: "#a87b30" },
        ink: "#111312",
      },
      keyframes: {
        marquee: { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(50%)" } },
        "fade-up": { "0%": { opacity: "0", transform: "translateY(12px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        marquee: "marquee 30s linear infinite",
        "fade-up": "fade-up .5s ease-out both",
      },
    },
  },
  plugins: [],
} satisfies Config;
