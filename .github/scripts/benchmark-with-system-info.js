#!/usr/bin/env node

/**
 * Runs benchmarks, injects system info, and generates comparison
 * This is a wrapper around the aztec-benchmark action that ensures system metadata is captured
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { cpus, totalmem, arch } from "os";
import { join } from "path";

// Get configuration from environment or use defaults
const reportsDir = process.env.BENCH_DIR || "./benchmarks";
const currentSuffix = "_new";
const baseSuffix = "_latest";
const threshold = 2.5;
const outputMarkdownPath = "benchmark-comparison.md";

console.log("=== Benchmark with System Info ===");
console.log(`Reports Directory: ${reportsDir}`);
console.log(`Current Suffix: ${currentSuffix}`);
console.log(`Base Suffix: ${baseSuffix}`);
console.log("");

// Step 1: Run aztec-benchmark to generate reports
console.log("📊 Running benchmarks...");
try {
  execSync(`npx aztec-benchmark --suffix ${currentSuffix}`, {
    stdio: "inherit",
    cwd: process.cwd(),
  });
  console.log("✓ Benchmarks generated successfully\n");
} catch (error) {
  console.error("✗ Benchmark generation failed:", error.message);
  process.exit(1);
}

// Step 2: Inject system information
console.log("💻 Injecting system information...");
function getSystemInfo() {
  const cpuInfo = cpus();
  const cpuModel = cpuInfo[0]?.model || "Unknown";
  const cpuCores = cpuInfo.length;
  const totalMemoryGiB = (totalmem() / 1024 ** 3).toFixed(2);
  const architecture = arch();

  return {
    cpuModel,
    cpuCores,
    totalMemoryGiB: parseFloat(totalMemoryGiB),
    arch: architecture,
  };
}

const systemInfo = getSystemInfo();
console.log(`  CPU: ${systemInfo.cpuModel}`);
console.log(`  Cores: ${systemInfo.cpuCores}`);
console.log(`  RAM: ${systemInfo.totalMemoryGiB} GiB`);
console.log(`  Arch: ${systemInfo.arch}`);

// Find and update benchmark files
const files = readdirSync(reportsDir).filter((file) =>
  file.endsWith(`${currentSuffix}.benchmark.json`),
);

if (files.length === 0) {
  console.log(`⚠️  No benchmark files found with suffix ${currentSuffix}`);
} else {
  console.log(`\nUpdating ${files.length} benchmark file(s)...`);
  for (const file of files) {
    const filePath = join(reportsDir, file);
    try {
      const data = JSON.parse(readFileSync(filePath, "utf8"));
      data.systemInfo = systemInfo;
      writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`  ✓ ${file}`);
    } catch (error) {
      console.error(`  ✗ Failed to process ${file}:`, error.message);
      process.exit(1);
    }
  }
  console.log("✓ System information injected successfully\n");
}

// Step 3: Run comparison using the same logic as the action
console.log("📝 Generating comparison report...");
try {
  // Import the comparison function from the package
  const { runComparison } = await import(
    "../node_modules/@defi-wonderland/aztec-benchmark/action/comparison.cjs"
  );

  const comparisonInputs = {
    reportsDir,
    baseSuffix,
    prSuffix: currentSuffix,
    threshold,
  };

  const markdownResult = runComparison(comparisonInputs);

  // Write the result
  writeFileSync(outputMarkdownPath, markdownResult);
  console.log(`✓ Comparison report written to ${outputMarkdownPath}\n`);

  console.log("=== Benchmark complete! ===");
} catch (error) {
  console.error("✗ Comparison generation failed:", error.message);
  process.exit(1);
}
