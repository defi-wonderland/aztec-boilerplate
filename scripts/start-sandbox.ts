import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";
import { createAztecNodeClient } from "@aztec/aztec.js/node";

// Global reference for the active sandbox manager
let activeSandboxManager: SandboxManager | null = null;
let signalHandlersSetup = false;

interface SandboxManagerOptions {
  verbose?: boolean;
}

interface ManagedTimer {
  id: NodeJS.Timeout;
  name: string;
  clear: () => void;
}

/**
 * Setup global signal handlers for graceful shutdown
 */
function setupSignalHandlers(): void {
  if (signalHandlersSetup) return;

  const handleShutdown = async (signal: string): Promise<void> => {
    // Stop the active sandbox manager if it exists
    if (activeSandboxManager) {
      try {
        await activeSandboxManager.stop();
        console.log("✅ Sandbox manager stopped");
      } catch (err) {
        console.error("Error stopping manager:", err);
      }
      activeSandboxManager = null;
    }

    process.exit(0);
  };

  process.on("SIGINT", () => handleShutdown("SIGINT"));
  process.on("SIGTERM", () => handleShutdown("SIGTERM"));

  signalHandlersSetup = true;
}

/**
 * Start the Aztec sandbox and wait for it to be ready
 */
class SandboxManager extends EventEmitter {
  public process: ChildProcess | null = null;
  public isReady = false;
  public isExternalSandbox = false; // Track if we're using external sandbox vs our own process
  public sandboxTimeout = 180000;
  public forceKillTimeout = 5000;
  public maxRetries = 3;
  public verbose: boolean;

  // Timer/interval tracking for centralized cleanup
  private timers: Record<string, NodeJS.Timeout> = {};

  // Capture stderr for error reporting
  private stderrBuffer: string[] = [];

  constructor(options: SandboxManagerOptions = {}) {
    super();
    // Enable verbose mode in CI environments by default
    this.verbose = options.verbose ?? Boolean(process.env.CI);

    // Register this manager for signal handling
    activeSandboxManager = this;
    setupSignalHandlers();
  }

  /**
   * Create a managed timer that will be automatically cleaned up
   */
  createManagedTimer(
    callback: () => void,
    delay: number,
    name: string,
  ): ManagedTimer {
    const timerId = setTimeout(() => {
      // Remove from tracked timers when it executes
      delete this.timers[name];
      callback();
    }, delay);

    // Track the timer for cleanup
    this.timers[name] = timerId;

    return {
      id: timerId,
      name,
      clear: () => this.clearManagedTimer(name),
    };
  }

  /**
   * Clear a specific managed timer
   */
  clearManagedTimer(name: string): void {
    if (this.timers[name]) {
      clearTimeout(this.timers[name]);
      delete this.timers[name];
    }
  }

  /**
   * Centralized cleanup of all timers and intervals
   */
  cleanupTimers(): void {
    const timerNames = Object.keys(this.timers);

    for (const name of timerNames) {
      this.clearManagedTimer(name);
    }
  }

  /**
   * Centralized state reset - handles all instance and global state cleanup
   */
  resetState(preserveExternalFlag = false): void {
    // Clean up timers first
    this.cleanupTimers();

    // Reset instance state
    this.process = null;
    this.isReady = false;
    this.stderrBuffer = [];

    // Only reset external flag if not preserving it
    if (!preserveExternalFlag) {
      this.isExternalSandbox = false;
    }

    // Clear global reference
    activeSandboxManager = null;
  }

  /**
   * Standardized error handling - cleanup, logging, and rejection
   */
  handleError(
    error: Error | string,
    context: string,
    safeReject: (error: Error) => void,
  ): void {
    // Always reset state on error
    this.resetState();

    // Create standardized error message
    const errorMessage = error instanceof Error ? error.message : error;
    const contextualError = new Error(`❌ ${errorMessage}`);

    // Log error with context if verbose
    if (this.verbose) {
      console.error(`🚨 Error in ${context}:`, errorMessage);
    }

    // Reject with the error
    safeReject(contextualError);
  }

  /**
   * Spawn the Aztec sandbox process
   */
  spawnSandboxProcess(): ChildProcess {
    // In devnet.2, an L1 RPC URL is required
    // The sandbox will start its own Anvil instance on the default port
    const l1RpcUrl = process.env.L1_RPC_URL || "http://127.0.0.1:8545";

    return spawn("aztec", ["start", "--sandbox", "--l1-rpc-urls", l1RpcUrl], {
      stdio: "pipe",
    });
  }

  /**
   * Setup event handlers for the sandbox process
   */
  setupProcessHandlers(
    process: ChildProcess,
    safeResolve: (value: SandboxManager) => void,
    safeReject: (error: Error) => void,
  ): void {
    // Handle process errors
    process.on("error", (error: any) => {
      if (error.code === "ENOENT") {
        this.handleError(
          "Aztec CLI not found. Please install it with aztec-up",
          "process-spawn",
          safeReject,
        );
      } else {
        this.handleError(
          `Failed to start sandbox: ${error.message}`,
          "process-spawn",
          safeReject,
        );
      }
    });

    // Monitor stdout for informational messages
    if (this.verbose && process.stdout) {
      process.stdout.on("data", (data: Buffer) => {
        const output = data.toString().trim();
        if (output) {
          console.log(`📡 Sandbox: ${output}`);
        }
      });
    }

    // Monitor stderr for errors
    if (process.stderr) {
      process.stderr.on("data", (data: Buffer) => {
        const output = data.toString().trim();
        if (output) {
          // Always capture stderr for error reporting
          this.stderrBuffer.push(output);

          if (this.verbose) {
            console.log(`🚨 Sandbox error: ${output}`);
          }

          // Check for port already in use
          if (output.includes("port is already")) {
            this.clearManagedTimer("startupTimeout"); // Clear startup timeout since we're switching to external
            console.log(
              "ℹ️ Port is already in use, checking if existing sandbox is responsive",
            );

            // Clean up our failed spawn process since we'll use external sandbox
            if (this.process) {
              this.process.kill("SIGTERM");
            }
            this.process = null;

            this.checkSandboxConnectivity()
              .then(() => {
                this.isExternalSandbox = true; // Mark that we're using external sandbox
                this.isReady = true;
                console.log("✅ Connected to existing external sandbox");
                safeResolve(this);
              })
              .catch(() => {
                this.handleError(
                  "Port 8080 is in use but sandbox is not responsive",
                  "external-sandbox-check",
                  safeReject,
                );
              });
          }
        }
      });
    }

    // Handle process exit
    process.on("exit", (code: number | null, signal: NodeJS.Signals | null) => {
      if (!this.isReady) {
        // Format stderr buffer for error message
        const stderrOutput =
          this.stderrBuffer.length > 0
            ? `\n\nStderr output:\n${this.stderrBuffer.slice(-10).join("\n")}`
            : "";

        if (code === 0) {
          this.handleError(
            `Sandbox process exited unexpectedly${stderrOutput}`,
            "process-exit",
            safeReject,
          );
        } else {
          this.handleError(
            `Sandbox process exited with code ${code} and signal ${signal}${stderrOutput}`,
            "process-exit",
            safeReject,
          );
        }
      }
    });
  }

  async checkSandboxConnectivity(): Promise<void> {
    console.time(`✅ Sandbox ready`);

    const maxRetries = 60; // 60 retries
    const retryDelayMs = 3000; // 3 seconds between retries
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Try to connect to the Aztec node
        const aztecNode = await createAztecNodeClient(
          "http://localhost:8080",
          {},
        );

        // Try to get node info to verify it's responsive
        const nodeInfo = await aztecNode.getNodeInfo();

        console.timeEnd(`✅ Sandbox ready`);
        console.log(`🔧 Node version: ${nodeInfo.nodeVersion}`);
        return; // Success!
      } catch (error: any) {
        lastError = error;

        if (attempt < maxRetries) {
          if (this.verbose) {
            console.log(
              `⏳ Sandbox not ready yet (attempt ${attempt}/${maxRetries}), retrying in ${retryDelayMs / 1000}s...`,
            );
          }
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
      }
    }

    // If we get here, all retries failed
    throw new Error(
      `Failed to connect to sandbox after ${maxRetries} attempts: ${lastError?.message}`,
    );
  }

  async start(): Promise<SandboxManager> {
    // Validate that we can start
    if (this.isReady || this.process) {
      throw new Error("Cannot start sandbox - already running or starting");
    }

    return new Promise((resolve, reject) => {
      console.log("🚀 Starting Aztec sandbox");
      let resolved = false; // Prevent double resolution

      const safeResolve = (value: SandboxManager): void => {
        if (!resolved) {
          resolved = true;
          resolve(value);
        }
      };

      const safeReject = (error: Error): void => {
        if (!resolved) {
          resolved = true;
          reject(error);
        }
      };

      // Set up startup timeout
      this.createManagedTimer(
        () => {
          this.cleanup();
          safeReject(
            new Error("❌ Sandbox startup timed out after 180 seconds"),
          );
        },
        this.sandboxTimeout,
        "startupTimeout",
      );

      // Start connectivity checking in parallel
      console.log("🔍 Waiting for sandbox to be ready");
      (async () => {
        try {
          await this.checkSandboxConnectivity();
          this.cleanupTimers();
          this.isExternalSandbox = false; // Mark that we're using our own process
          this.isReady = true;
          console.log("✅ Successfully started our own sandbox process");
          safeResolve(this);
        } catch (error: any) {
          this.handleError(
            `Failed to connect to sandbox: ${error.message}`,
            "connectivity-check",
            safeReject,
          );
        }
      })();

      // Spawn and setup process
      try {
        this.process = this.spawnSandboxProcess();
        this.setupProcessHandlers(this.process, safeResolve, safeReject);
      } catch (error: any) {
        this.handleError(
          `Failed to spawn sandbox process: ${error.message}`,
          "process-spawn",
          safeReject,
        );
      }
    });
  }

  async stop(): Promise<void> {
    // If already stopped, or never got to start just return
    if (!this.isReady && !this.process) {
      return;
    }

    // If using external sandbox, only clean up our state - don't stop external process
    if (this.isExternalSandbox) {
      console.log("🔌 Disconnecting from external sandbox");
      this.resetState();
      return;
    }

    if (!this.process) {
      this.resetState();
      return;
    }

    console.log("🛑 Stopping Aztec sandbox process");

    return new Promise((resolve) => {
      // Set up force kill timeout
      this.createManagedTimer(
        () => {
          if (this.process) {
            console.log("🔥 Force killing sandbox process");
            this.process.kill("SIGKILL");
          }
        },
        this.forceKillTimeout,
        "forceKillTimeout",
      );

      // Listen for process exit
      this.process!.once("exit", () => {
        this.resetState();
        resolve();
      });

      // Send graceful shutdown
      this.process!.kill("SIGTERM");
    });
  }

  cleanup(): void {
    // Only kill process if we own it, not if using external sandbox
    if (!this.isExternalSandbox && this.process) {
      this.process.kill("SIGTERM");
    }

    // Reset all state centrally
    this.resetState();
  }
}

/**
 * Start sandbox and return the manager instance
 */
async function startSandbox(
  options: SandboxManagerOptions = {},
): Promise<SandboxManager> {
  const manager = new SandboxManager(options);
  await manager.start();
  return manager;
}

// This script is designed for Jest testing only - no standalone CLI execution

export { startSandbox, SandboxManager };
