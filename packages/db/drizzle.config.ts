import { defineConfig } from "drizzle-kit";

// Her uygulama bu config'i kendi schema adıyla kullanır.
// Örnek: apps/sso → DRIZZLE_SCHEMA=sso pnpm --filter @xivizley/db db:generate

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schemas/**/*.ts",
  out: "./drizzle/migrations",
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "postgresql://xivizley:xivizley@localhost:5432/xivizley_suite",
  },
  // Multi-schema: her uygulama kendi schema namespace'inde çalışır
  schemaFilter: ["sso", "game_panel", "drive", "cinema", "vault", "pulse", "sound", "docs", "shield", "fortress", "brain"],
  verbose: true,
  strict: true,
});
