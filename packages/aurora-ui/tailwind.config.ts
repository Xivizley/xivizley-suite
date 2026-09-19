import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
    "./preview/**/*.{ts,tsx,html}",
  ],
  theme: {
    extend: {
      // ─── Aurora Night Renk Paleti ───────────────────────────
      colors: {
        aurora: {
          // Arka planlar (koyudan açığa)
          dark: "var(--aurora-bg-dark)",
          deeper: "var(--aurora-bg-deeper)",
          surface: "var(--aurora-bg-surface)",
          card: "var(--aurora-bg-card)",
          elevated: "var(--aurora-bg-elevated)",

          // Neon Aksanlar
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

      // ─── Aurora Kenar Renkleri ──────────────────────────────
      borderColor: {
        aurora: {
          DEFAULT: "var(--aurora-border)",
          glow: "var(--aurora-border-glow)",
        },
      },

      // ─── Neon Gölgeler ─────────────────────────────────────
      boxShadow: {
        "aurora-sm": "0 0 8px var(--aurora-cyan-glow)",
        "aurora-md": "0 0 16px var(--aurora-cyan-glow), 0 0 4px var(--aurora-purple-glow)",
        "aurora-lg": "0 0 24px var(--aurora-cyan-glow), 0 0 8px var(--aurora-purple-glow)",
        "aurora-danger": "0 0 12px var(--aurora-rose-glow)",
      },

      // ─── Backdrop Blur (Glassmorphism) ─────────────────────
      backdropBlur: {
        aurora: "12px",
      },

      // ─── Geçiş Animasyonları ───────────────────────────────
      transitionDuration: {
        aurora: "200ms",
      },

      // ─── Font Ailesi ───────────────────────────────────────
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },

      // ─── Border Radius ─────────────────────────────────────
      borderRadius: {
        aurora: "0.75rem",    // 12px — standart kart/input radius
        "aurora-sm": "0.5rem", // 8px — badge/chip radius
        "aurora-lg": "1rem",   // 16px — modal/dialog radius
      },

      // ─── Animasyonlar ──────────────────────────────────────
      keyframes: {
        "aurora-pulse": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        "aurora-spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "aurora-glow": {
          "0%, 100%": { boxShadow: "0 0 8px var(--aurora-cyan-glow)" },
          "50%": { boxShadow: "0 0 20px var(--aurora-cyan-glow), 0 0 8px var(--aurora-purple-glow)" },
        },
      },
      animation: {
        "aurora-pulse": "aurora-pulse 2s ease-in-out infinite",
        "aurora-spin": "aurora-spin 1s linear infinite",
        "aurora-glow": "aurora-glow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
