import { defineConfig } from "vitest/config";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nobleUtilsPath = require.resolve("@noble/hashes/utils");

export default defineConfig({
  resolve: {
    alias: {
      // Force a concrete file path so Vite doesn't resolve a nested version without `anumber`
      "@noble/hashes/utils": nobleUtilsPath,
    },
    conditions: ["import", "module", "browser", "default"],
  },
  test: {
    // aztec sandbox tests take quite some time
    hookTimeout: 200000,
    testTimeout: 200000,
    fileParallelism: false,
    pool: "forks",
    maxWorkers: 1,
    isolate: false,
    execArgv: ["--experimental-vm-modules"],
    // Use new API to inline dependencies through Vite's transform pipeline
    // This ensures viem, @aztec, @noble, and @scure packages use Vite's module resolution with proper aliasing
    server: {
      deps: {
        inline: [/@aztec/, /@noble\/(hashes|curves|ciphers)/, /viem/, /@scure/],
      },
    },
  },
});
