import { startSandbox } from "./scripts/start-sandbox.js";

/**
 * Vitest global setup - runs before all tests
 * Returns a teardown function that runs after all tests
 */
export async function setup() {
  console.log("\n🔧 Setting up Aztec testing environment\n");

  const sandbox = await startSandbox();

  // Return teardown function
  return async () => {
    console.log("\n🧹 Cleaning up Aztec testing environment");
    await sandbox.stop();
    console.log("✅ Cleanup complete\n");
  };
}
