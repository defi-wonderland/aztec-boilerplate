import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve as pathResolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const nobleUtilsPath = pathResolve(
  __dirname,
  "node_modules/@noble/hashes/esm/utils.js",
);

export default defineConfig({
  resolve: {
    alias: {
      // Force a concrete file path so CI doesn't resolve a nested version without `anumber`
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
