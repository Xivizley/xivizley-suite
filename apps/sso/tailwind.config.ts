import type { Config } from "tailwindcss";
import baseConfig from "../../packages/aurora-ui/tailwind.config.js";

const config: Config = {
  ...baseConfig,
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/aurora-ui/src/**/*.{ts,tsx}",
  ],
};

export default config;
