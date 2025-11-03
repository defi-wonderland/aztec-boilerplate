import { createRequire } from "node:module";
import { defineConfig } from "vitest/config";

const require = createRequire(import.meta.url);
const nobleUtilsPath = require.resolve("@noble/hashes/utils");

export default defineConfig({
  resolve: {
    alias: {
      // Ensure Vitest always picks the hoisted version that includes `anumber`
      "@noble/hashes/utils": nobleUtilsPath,
    },
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
