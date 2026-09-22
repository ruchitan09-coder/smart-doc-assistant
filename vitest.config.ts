import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    // Mirrors tsconfig.json's "@/*" -> "./src/*" path alias, needed now that
    // tests import modules (rate-limit.ts) that themselves import via "@/...".
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
