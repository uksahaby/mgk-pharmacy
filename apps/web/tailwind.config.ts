import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: { DEFAULT: "1rem", sm: "1.5rem", lg: "2rem" }, screens: { "2xl": "1280px" } },
    extend: {
      colors: {
        brand: {
          50: "#fff1f2",
          100: "#ffe1e3",
          200: "#ffc8cc",
          300: "#ffa0a7",
          400: "#fd6874",
          500: "#f43a4a",
          600: "#d71f33",
          700: "#b3152a",
          800: "#941528",
          900: "#7c1627",
          950: "#450610",
        },
        ink: {
          DEFAULT: "#0f172a",
          soft: "#334155",
          muted: "#64748b",
        },
        care: {
          50: "#ecfdf5",
          100: "#d1fae5",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
        },
        canvas: "#f7f7f5",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,.04), 0 4px 16px -4px rgba(15,23,42,.08)",
        lift: "0 2px 4px rgba(15,23,42,.04), 0 16px 40px -12px rgba(15,23,42,.18)",
      },
      borderRadius: { xl2: "1.25rem" },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "none" } },
        "ken-burns": { from: { transform: "scale(1.07) translate3d(-1%, 0, 0)" }, to: { transform: "scale(1) translate3d(0, 0, 0)" } },
        "slide-progress": { from: { transform: "scaleX(0)" }, to: { transform: "scaleX(1)" } },
      },
      animation: {
        "fade-up": "fade-up .35s ease-out both",
        "ken-burns": "ken-burns 24s ease-out both",
        "slide-progress": "slide-progress linear both",
      },
    },
  },
  plugins: [],
} satisfies Config;
