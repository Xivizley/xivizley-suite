import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "./preview/**/*.{ts,tsx,html}"],
  theme: {
    extend: {
      // ─── Aurora Night Renk Paleti ───────────────────────────
      colors: {
        nextcloud: {
          blue: "#0082c9",
          "blue-hover": "#006aa3",
          header: "#0082c9",
          surface: "#222933",
          bg: "#181e24",
          border: "#2d3748",
          text: "#f8fafc",
          muted: "#94a3b8",
        },
        aurora: {
          dark: "var(--aurora-bg-dark)",
          "bg-dark": "var(--aurora-bg-dark)",
          deeper: "var(--aurora-bg-deeper)",
          surface: "var(--aurora-bg-surface)",
          "bg-surface": "var(--aurora-bg-surface)",
          card: "var(--aurora-bg-card)",
          elevated: "var(--aurora-bg-elevated)",

          // Aksanlar (Nextcloud Blue & Uyumlu Tonlar)
          cyan: "var(--aurora-cyan)",
          purple: "var(--aurora-purple)",
          green: "var(--aurora-green)",
          amber: "var(--aurora-amber)",
          rose: "var(--aurora-rose)",

          // Metin
          "text-primary": "var(--aurora-text-primary)",
          "text-secondary": "var(--aurora-text-secondary)",
          "text-muted": "var(--aurora-text-muted)",
        },
      },

      // ─── Kenar Renkleri ─────────────────────────────────────
      borderColor: {
        aurora: {
          DEFAULT: "var(--aurora-border)",
          glow: "var(--aurora-border-glow)",
        },
      },

      // ─── Doğal Gölgeler (Nextcloud Tarzı) ───────────────────
      boxShadow: {
        "aurora-sm": "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        "aurora-md":
          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        "aurora-lg":
          "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        "aurora-danger": "0 1px 2px 0 rgba(225, 29, 72, 0.2)",
      },

      // ─── Backdrop Blur ─────────────────────────────────────
      backdropBlur: {
        aurora: "8px",
      },

      // ─── Geçiş Animasyonları ───────────────────────────────
      transitionDuration: {
        aurora: "150ms",
      },

      // ─── Font Ailesi ───────────────────────────────────────
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "monospace"],
      },

      // ─── Border Radius ─────────────────────────────────────
      borderRadius: {
        aurora: "0.625rem", // 10px — standart Nextcloud kart/input radius
        "aurora-sm": "0.375rem", // 6px — badge/chip radius
        "aurora-lg": "0.875rem", // 14px — modal/dialog radius
      },

      // ─── Animasyonlar ──────────────────────────────────────
      keyframes: {
        "aurora-pulse": {
          "0%, 100%": { opacity: "0.7" },
          "50%": { opacity: "1" },
        },
        "aurora-spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "aurora-glow": {
          "0%, 100%": { borderColor: "rgba(0, 130, 201, 0.3)" },
          "50%": { borderColor: "rgba(0, 130, 201, 0.7)" },
        },
      },
      animation: {
        "aurora-pulse": "aurora-pulse 2s ease-in-out infinite",
        "aurora-spin": "aurora-spin 1s linear infinite",
        "aurora-glow": "aurora-glow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
