import { checkAztecVersion } from "./scripts/check-aztec-version.js";
import { startSandbox } from "./scripts/start-sandbox.js";

/**
 * Vitest global setup - runs before all tests
 * Returns a teardown function that runs after all tests
 */
export async function setup() {
  console.log("\n🔧 Setting up Aztec testing environment\n");

  let sandboxManager: any;

  try {
    // Step 1: Check Aztec CLI version
    console.log("Step 1: Checking Aztec CLI version compatibility");
    await checkAztecVersion();
    console.log("");

    // Step 2: Start sandbox and wait for readiness
    console.log("Step 2: Starting Aztec sandbox");
    sandboxManager = await startSandbox();
    console.log("");

    // Store sandbox manager globally for teardown
    globalThis.__AZTEC_SANDBOX_MANAGER__ = sandboxManager;
  } catch (error) {
    console.error(`\n❌ Setup failed: ${error.message}`);
    process.exit(1);
  }

  // Return teardown function
  return async () => {
    console.log("\nLast Step: Cleaning up Aztec testing environment");

    try {
      if (sandboxManager) {
        await sandboxManager.stop();
        console.log("✅ Sandbox stopped successfully");
      } else {
        console.log("ℹ️  No sandbox manager found, skipping cleanup");
      }

      console.log("✅ Aztec testing environment cleanup complete\n");
    } catch (error) {
      console.error("⚠️  Error during cleanup:", error.message);
      // Don't exit with error code during cleanup, just log the issue
    }
  };
}
