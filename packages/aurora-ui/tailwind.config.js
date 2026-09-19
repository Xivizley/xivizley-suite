// Re-export tailwind configuration for both CJS and ESM consumers
const config = {
  theme: {
    extend: {
      colors: {
        aurora: {
          dark: "var(--aurora-bg-dark)",
          deeper: "var(--aurora-bg-deeper)",
          surface: "var(--aurora-bg-surface)",
          card: "var(--aurora-bg-card)",
          elevated: "var(--aurora-bg-elevated)",
          cyan: "var(--aurora-cyan)",
          purple: "var(--aurora-purple)",
          green: "var(--aurora-green)",
          amber: "var(--aurora-amber)",
          rose: "var(--aurora-rose)",
          "text-primary": "var(--aurora-text-primary)",
          "text-secondary": "var(--aurora-text-secondary)",
          "text-muted": "var(--aurora-text-muted)",
        },
      },
      borderColor: {
        aurora: {
          DEFAULT: "var(--aurora-border)",
          glow: "var(--aurora-border-glow)",
        },
      },
      boxShadow: {
        "aurora-sm": "0 0 8px var(--aurora-cyan-glow)",
        "aurora-md": "0 0 16px var(--aurora-cyan-glow), 0 0 4px var(--aurora-purple-glow)",
        "aurora-lg": "0 0 24px var(--aurora-cyan-glow), 0 0 8px var(--aurora-purple-glow)",
        "aurora-danger": "0 0 12px var(--aurora-rose-glow)",
      },
      backdropBlur: {
        aurora: "12px",
      },
      transitionDuration: {
        aurora: "200ms",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      borderRadius: {
        aurora: "0.75rem",
        "aurora-sm": "0.5rem",
        "aurora-lg": "1rem",
      },
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
