import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Doğrudan kaynak kodu import eder (dist build gerekmez)
      "@xivizley/aurora-ui": path.resolve(__dirname, "../src"),
    },
  },
});
