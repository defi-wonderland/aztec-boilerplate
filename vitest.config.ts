import { defineConfig } from "vitest/config";

export default defineConfig({
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
      optimizer: {
        web: {
          enabled: true,
        },
      },
    },
  },
});
