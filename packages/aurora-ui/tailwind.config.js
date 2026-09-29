// Re-export tailwind configuration for both CJS and ESM consumers
const config = {
  theme: {
    extend: {
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
        "aurora-sm": "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        "aurora-md": "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        "aurora-lg": "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        "aurora-danger": "0 1px 2px 0 rgba(225, 29, 72, 0.2)",
      },
      backdropBlur: {
        aurora: "8px",
      },
      transitionDuration: {
        aurora: "150ms",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        aurora: "0.625rem",
        "aurora-sm": "0.375rem",
        "aurora-lg": "0.875rem",
      },
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
