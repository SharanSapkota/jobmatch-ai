import { config as loadEnv } from "dotenv";
import path from "node:path";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

loadEnv({ path: [".env.local", ".env"], quiet: true });

const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? "";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: { "server-only": path.resolve("tests/helpers/server-only-stub.ts") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    env: {
      // Tests never touch the development database.
      DATABASE_URL: testDatabaseUrl,
      TEST_DATABASE_URL: testDatabaseUrl,
      LLM_PROVIDER: "mock",
    },
  },
});
