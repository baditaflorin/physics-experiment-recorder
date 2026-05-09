import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    exclude: ["node_modules/**", "docs/**", "test/e2e/**"],
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      reporter: ["text", "lcov"],
    },
  },
});
