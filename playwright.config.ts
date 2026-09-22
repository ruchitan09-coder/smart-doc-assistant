import { defineConfig } from "@playwright/test";

// NOTE: this is a starting skeleton, not a full suite -- see README
// "Known limitations". Running it requires a seeded Supabase test project
// and a running dev server (npm run dev) on the baseURL below.
export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:3000" },
});
