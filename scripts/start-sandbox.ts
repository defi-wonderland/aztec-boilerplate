import { spawn, ChildProcess } from "child_process";
import { createAztecNodeClient } from "@aztec/aztec.js/node";

const SANDBOX_URL = "http://localhost:8080";
const MAX_WAIT_TIME = 180000; // 3 minutes
const RETRY_DELAY = 3000; // 3 seconds

/**
 * Wait for sandbox to be ready by checking connectivity
 */
async function waitForSandbox(url: string): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_WAIT_TIME) {
    try {
      const aztecNode = await createAztecNodeClient(url, {});
      await aztecNode.getNodeInfo();
      return; // Success!
    } catch {
      // Not ready yet, wait and retry
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    }
  }

  throw new Error(
    `Sandbox failed to start within ${MAX_WAIT_TIME / 1000} seconds`,
  );
}

/**
 * Start Aztec sandbox and return process handle
 */
export async function startSandbox(): Promise<{ stop: () => Promise<void> }> {
  console.log("🚀 Starting Aztec sandbox");

  // Spawn sandbox process
  const process = spawn("aztec", ["start", "--sandbox", "--port", "8080"], {
    stdio: "pipe",
  });

  // Handle spawn errors
  process.on("error", (error: any) => {
    if (error.code === "ENOENT") {
      throw new Error("Aztec CLI not found. Please install it with aztec-up");
    }
    throw error;
  });

  // Wait for sandbox to be ready
  await waitForSandbox(SANDBOX_URL);
  console.log("✅ Sandbox ready");

  return {
    stop: async () => {
      console.log("🛑 Stopping Aztec sandbox");
      process.kill("SIGTERM");

      // Wait for process to exit (with timeout)
      await Promise.race([
        new Promise<void>((resolve) => {
          process.once("exit", () => resolve());
        }),
        new Promise<void>((resolve) => {
          setTimeout(() => {
            process.kill("SIGKILL");
            resolve();
          }, 5000);
        }),
      ]);
    },
  };
}
