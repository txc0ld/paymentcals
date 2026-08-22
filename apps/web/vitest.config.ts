import { defineConfig } from "vitest/config";

/** Unit tests only — Playwright owns *.spec.ts under e2e/. */
export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
});
