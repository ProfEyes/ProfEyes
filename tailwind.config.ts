import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        montserrat: ['Montserrat', 'sans-serif'],
        mollen: ['Mollen', 'Arial', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        market: {
          up: "#22C55E",
          down: "#EF4444",
          neutral: "#64748B",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade": {
          "0%": { 
            opacity: "0"
          },
          "100%": {
            opacity: "1"
          }
        },
        "toast-in": {
          "0%": { 
            opacity: "0",
            transform: "translateY(25px) scale(0.9)",
            filter: "blur(8px)"
          },
          "20%": {
            opacity: "0.5",
            transform: "translateY(-15px) scale(1.02)",
            filter: "blur(0px)"
          },
          "35%": {
            opacity: "0.75",
            transform: "translateY(5px) scale(0.98)"
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0) scale(1)"
          }
        },
        "toast-out": {
          "0%": {
            opacity: "1",
            transform: "translateX(0) scale(1)",
            filter: "blur(0px)"
          },
          "100%": {
            opacity: "0",
            transform: "translateX(100%) scale(0.9)",
            filter: "blur(8px)"
          }
        },
        "shimmer": {
          "0%": {
            backgroundPosition: "-500px 0",
          },
          "100%": {
            backgroundPosition: "500px 0",
          },
        },
        "glow": {
          "0%, 100%": {
            opacity: "1",
            boxShadow: "0 0 20px rgba(255, 255, 255, 0.1)"
          },
          "50%": {
            opacity: "0.8",
            boxShadow: "0 0 30px rgba(255, 255, 255, 0.2)"
          }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade": "fade 0.4s ease-in-out",
        "toast-in": "toast-in 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "toast-out": "toast-out 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        "shimmer": "shimmer 2.5s linear infinite",
        "glow": "glow 3s ease-in-out infinite",
        "fade-up": "fade-up 0.3s ease-out",
        "slide-in-from-bottom-full": "slide-in-from-bottom-full 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
