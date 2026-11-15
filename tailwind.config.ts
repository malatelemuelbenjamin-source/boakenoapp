import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#2a0a0a",
        brand: {
          50: "#fff1f1",
          100: "#ffdede",
          200: "#ffc4c4",
          300: "#ff9a9a",
          400: "#ff6464",
          500: "#f52f2f",
          600: "#e01414",
          700: "#bc0f0f",
          800: "#9b1212",
          900: "#801414",
          950: "#460707"
        },
        // The site accent scale (formerly green) — now a warm red/maroon ramp.
        moss: {
          50: "#fef4f4",
          100: "#fde6e6",
          200: "#f8caca",
          300: "#eda6a6",
          400: "#dd7a7a",
          500: "#c94f4f",
          600: "#ab3535",
          700: "#8c2626",
          800: "#701f1f",
          900: "#581a1a",
          950: "#330d0d"
        },
        gold: {
          50: "#fdf8e9",
          100: "#f9edc6",
          200: "#f2da8f",
          300: "#e9c257",
          400: "#dfa92f",
          500: "#c8901c",
          600: "#a76f15",
          700: "#855214",
          800: "#6f4217",
          900: "#5e3718"
        }
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        display: ["Georgia", "Cambria", "Times New Roman", "serif"]
      },
      boxShadow: {
        card: "0 1px 2px rgba(70,7,7,.08), 0 16px 34px -22px rgba(120,6,6,.45)",
        glow: "0 10px 30px -12px rgba(224,20,20,.65)"
      },
      keyframes: {
        aurora: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" }
        },
        blobDrift: {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "33%": { transform: "translate3d(6%, -4%, 0) scale(1.08)" },
          "66%": { transform: "translate3d(-5%, 5%, 0) scale(0.96)" }
        },
        riseIn: {
          "0%": { opacity: "0", transform: "translateY(14px) scale(.985)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" }
        },
        floaty: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" }
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(239,43,43,.55)" },
          "50%": { boxShadow: "0 0 0 10px rgba(239,43,43,0)" }
        },
        shine: {
          "0%": { transform: "translateX(-130%)" },
          "100%": { transform: "translateX(230%)" }
        },
        bob: {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-4px) rotate(-2deg)" }
        }
      },
      animation: {
        aurora: "aurora 18s ease-in-out infinite",
        "aurora-slow": "aurora 30s ease-in-out infinite",
        drift: "blobDrift 22s ease-in-out infinite",
        "rise-in": "riseIn .55s cubic-bezier(.22,1,.36,1) both",
        floaty: "floaty 6s ease-in-out infinite",
        "glow-pulse": "glowPulse 2.6s ease-in-out infinite",
        shine: "shine 1.1s ease",
        bob: "bob 4.5s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
