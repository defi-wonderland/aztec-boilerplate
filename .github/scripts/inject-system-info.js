#!/usr/bin/env node

/**
 * Injects system information into benchmark JSON files
 * This adds CPU, cores, RAM, and architecture metadata for the comparison action
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { cpus, totalmem, arch } from "os";
import { join } from "path";

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

function injectSystemInfo(benchmarkDir) {
  const systemInfo = getSystemInfo();

  console.log("System Information:");
  console.log(`  CPU: ${systemInfo.cpuModel}`);
  console.log(`  Cores: ${systemInfo.cpuCores}`);
  console.log(`  RAM: ${systemInfo.totalMemoryGiB} GiB`);
  console.log(`  Arch: ${systemInfo.arch}`);
  console.log("");

  // Find all benchmark JSON files
  const files = readdirSync(benchmarkDir).filter((file) =>
    file.endsWith(".benchmark.json"),
  );

  if (files.length === 0) {
    console.log("⚠️  No benchmark JSON files found in", benchmarkDir);
    return;
  }

  console.log(`Processing ${files.length} benchmark file(s)...`);

  for (const file of files) {
    const filePath = join(benchmarkDir, file);

    try {
      // Read existing benchmark data
      const data = JSON.parse(readFileSync(filePath, "utf8"));

      // Inject system info
      data.systemInfo = systemInfo;

      // Write back
      writeFileSync(filePath, JSON.stringify(data, null, 2));

      console.log(`✓ Updated ${file}`);
    } catch (error) {
      console.error(`✗ Failed to process ${file}:`, error.message);
      process.exit(1);
    }
  }

  console.log("\n✓ System information injected successfully");
}

// Get benchmark directory from command line argument or use default
const benchmarkDir = process.argv[2] || "./benchmarks";

injectSystemInfo(benchmarkDir);
