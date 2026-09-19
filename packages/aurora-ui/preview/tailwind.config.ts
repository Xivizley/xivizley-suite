import type { Config } from "tailwindcss";
import baseConfig from "../tailwind.config.js";

const config: Config = {
  ...baseConfig,
  content: [
    "./src/**/*.{ts,tsx,html}",
    "../src/**/*.{ts,tsx}",
    "./index.html",
  ],
};

export default config;
