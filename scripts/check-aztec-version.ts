import { exec } from "child_process";
import { promisify } from "util";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface PackageJson {
  config?: {
    aztecVersion?: string;
  };
}

/**
 * Check if the installed Aztec CLI version matches the expected version in package.json
 */
async function checkAztecVersion(): Promise<void> {
  console.log("🔍 Checking Aztec CLI version");

  // Read expected version from package.json
  const packageJsonPath = join(__dirname, "..", "package.json");
  const packageJson: PackageJson = JSON.parse(
    readFileSync(packageJsonPath, "utf8"),
  );
  const expectedVersion = packageJson.config?.aztecVersion;

  if (!expectedVersion) {
    throw new Error("❌ No aztecVersion found in package.json config");
  }

  console.log(`📋 Expected Aztec version: ${expectedVersion}`);

  let installedVersion: string;

  try {
    // Check if aztec CLI is installed and get version
    const { stdout } = await execAsync("aztec --version");
    installedVersion = stdout.trim();

    console.log("✅ Aztec CLI version check passed");
  } catch (error: any) {
    if (error.code === "ENOENT") {
      throw new Error(
        `❌ Aztec CLI not found!\n` +
          `   Please install aztec-up and run: VERSION=${expectedVersion} aztec-up`,
      );
    } else if (error.stdout) {
      // Handle case where command exits with non-zero code (e.g., when sandbox is running)
      // but version is still available in stdout
      installedVersion = error.stdout.trim();
    } else {
      throw error;
    }
  }

  console.log(`🔧 Installed Aztec version: ${installedVersion}`);

  // Compare versions
  if (installedVersion !== expectedVersion) {
    throw new Error(
      `❌ Version mismatch!\n` +
        `   Expected: ${expectedVersion}\n` +
        `   Installed: ${installedVersion}\n` +
        `   Please run: VERSION=${expectedVersion} aztec-up`,
    );
  }
}

export { checkAztecVersion };
