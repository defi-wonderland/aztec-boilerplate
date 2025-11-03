import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {},
    conditions: ["import", "module", "browser", "default"],
  },
  test: {
    // aztec sandbox tests take quite some time
    hookTimeout: 200000,
    testTimeout: 200000,
    globalSetup: "./vitest.setup.ts",
    fileParallelism: false,
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
        execArgv: ["--experimental-vm-modules"],
      },
    },
    deps: {
      // Inline noble deps so Vite applies aliasing (ESM) instead of Node loading CJS directly
      inline: [/@noble\/(hashes|curves|ciphers)/],
    },
  },
});
