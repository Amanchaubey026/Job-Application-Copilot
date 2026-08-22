import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    exclude: ["node_modules", "build", ".plasmo", "coverage"],
    environment: "node",
    clearMocks: true
  },
  resolve: {
    alias: [
      {
        find: /^~/,
        replacement: `${path.resolve(__dirname)}/`
      }
    ]
  }
});
