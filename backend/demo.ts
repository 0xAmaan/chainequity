#!/usr/bin/env bun
/**
 * ChainEquity End-to-End Demo Script
 * Demonstrates complete workflow from deployment to cap table generation
 */
import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import chalk from "chalk";

const log = (
  message: string,
  color: "blue" | "green" | "yellow" | "red" | "gray" = "gray",
) => {
  const colorFn = {
    blue: chalk.blue,
    green: chalk.green,
    yellow: chalk.yellow,
    red: chalk.red,
    gray: chalk.gray,
  }[color];
  console.log(colorFn(message));
};

const section = (title: string) => {
  console.log("\n" + chalk.bold.blue("═".repeat(80)));
  console.log(chalk.bold.blue(`  ${title}`));
  console.log(chalk.bold.blue("═".repeat(80)) + "\n");
};

const runCommand = (command: string, description: string): string => {
  log(`▶ ${description}...`, "gray");
  try {
    const output = execSync(command, { encoding: "utf-8", stdio: "pipe" });
    log(`✓ ${description} completed`, "green");
    return output.trim();
  } catch (error: any) {
    log(`✗ ${description} failed: ${error.message}`, "red");
    throw error;
  }
};

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const main = async () => {
  console.log(chalk.bold.cyan("\n🚀 ChainEquity Phase 2 Demo\n"));
  console.log(chalk.gray("This script will demonstrate the complete workflow:\n"));
  console.log(chalk.white("  1. Deploy contract to Anvil"));
  console.log(chalk.white("  2. Initialize PostgreSQL database"));
  console.log(chalk.white("  3. Start event indexer"));
  console.log(chalk.white("  4. Execute admin operations via CLI"));
  console.log(chalk.white("  5. Generate cap table snapshots\n"));

  // Step 1: Deploy Contract
  section("Step 1: Deploy Contract to Anvil");

  log("Checking if Anvil is running on port 8545...", "gray");
  try {
    runCommand(
      'curl -s -X POST -H "Content-Type: application/json" --data \'{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}\' http://127.0.0.1:8545',
      "Check Anvil connection",
    );
    log("✓ Anvil is running", "green");
  } catch (error) {
    log("✗ Anvil is not running. Please start it with: anvil", "red");
    log("  Run: anvil --port 8545", "yellow");
    process.exit(1);
  }

  log("Deploying GatedEquityToken contract...", "blue");
  const deployOutput = runCommand(
    "forge script script/DeployGatedEquity.s.sol:DeployGatedEquity --rpc-url http://127.0.0.1:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    "Deploy contract",
  );

  // Extract contract address from deployment logs
  const addressMatch = deployOutput.match(
    /Deployed GatedEquityToken at: (0x[a-fA-F0-9]{40})/,
  );
  if (!addressMatch) {
    log("✗ Could not find contract address in deployment output", "red");
    log("Checking broadcast logs...", "gray");

    try {
      const broadcastFiles = execSync(
        "ls -t broadcast/DeployGatedEquity.s.sol/31337/*.json",
        { encoding: "utf-8" },
      )
        .trim()
        .split("\n");
      const latestBroadcast = broadcastFiles[0];
      const broadcastData = JSON.parse(readFileSync(latestBroadcast, "utf-8"));

      const contractAddress = broadcastData.transactions.find(
        (tx: any) => tx.contractName === "GatedEquityToken",
      )?.contractAddress;

      if (!contractAddress) {
        throw new Error("Contract address not found in broadcast logs");
      }

      log(`✓ Contract deployed at: ${contractAddress}`, "green");

      // Update .env file (now in root directory)
      const envPath = join(__dirname, "..", ".env");
      let envContent = readFileSync(envPath, "utf-8");
      envContent = envContent.replace(
        /CONTRACT_ADDRESS=.*/,
        `CONTRACT_ADDRESS=${contractAddress}`,
      );
      writeFileSync(envPath, envContent);
      log("✓ Updated .env with contract address", "green");
    } catch (error: any) {
      log(`✗ Failed to extract contract address: ${error.message}`, "red");
      process.exit(1);
    }
  }

  await sleep(2000);

  // Step 2: Initialize Database
  section("Step 2: Initialize PostgreSQL Database");

  log("Checking PostgreSQL connection...", "gray");
  try {
    runCommand("pg_isready -h localhost -p 5432", "Check PostgreSQL");
    log("✓ PostgreSQL is running", "green");
  } catch (error) {
    log("⚠ PostgreSQL may not be running", "yellow");
    log("  Please ensure PostgreSQL is installed and running", "yellow");
    log("  macOS: brew services start postgresql", "gray");
    log("  Linux: sudo systemctl start postgresql", "gray");
  }

  log("Initializing database schema...", "blue");
  runCommand("bun run db:init", "Initialize database");

  await sleep(1000);

  // Step 3: Test CLI Commands
  section("Step 3: Execute CLI Operations");

  const testAddresses = [
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Anvil account #1
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Anvil account #2
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906", // Anvil account #3
  ];

  log("Testing CLI - Contract Info", "blue");
  runCommand("bun run cli info", "Get contract info");

  await sleep(500);

  log("Testing CLI - Approve addresses", "blue");
  for (const addr of testAddresses) {
    runCommand(`bun run cli approve ${addr}`, `Approve ${addr}`);
    await sleep(500);
  }

  log("Testing CLI - Mint tokens", "blue");
  runCommand(
    `bun run cli mint ${testAddresses[0]} 1000`,
    "Mint 1000 tokens to address #1",
  );
  await sleep(500);
  runCommand(
    `bun run cli mint ${testAddresses[1]} 500`,
    "Mint 500 tokens to address #2",
  );
  await sleep(500);
  runCommand(
    `bun run cli mint ${testAddresses[2]} 250`,
    "Mint 250 tokens to address #3",
  );
  await sleep(500);

  log("Testing CLI - Check status", "blue");
  runCommand(`bun run cli status ${testAddresses[0]}`, "Check status of address #1");

  await sleep(1000);

  // Step 4: Start Indexer (in background)
  section("Step 4: Start Event Indexer");

  log("Starting indexer in background...", "blue");
  log(
    "⚠ Note: Indexer will sync historical events and then listen for new ones",
    "yellow",
  );
  log("  Press Ctrl+C to stop the demo and indexer\n", "yellow");

  runCommand(
    "bun run indexer > backend/logs/indexer.log 2>&1 &",
    "Start indexer daemon",
  );
  log("✓ Indexer started (check backend/logs/indexer.log for output)", "green");

  await sleep(3000);

  // Step 5: Generate Cap Table
  section("Step 5: Generate Cap Table");

  log("Generating cap table...", "blue");
  runCommand("bun run cli captable", "Display cap table");

  await sleep(500);

  log("Generating cap table in JSON format...", "blue");
  const jsonOutput = runCommand(
    "bun run cli captable --format json",
    "Generate JSON cap table",
  );
  writeFileSync(join(__dirname, "logs", "captable.json"), jsonOutput);
  log("✓ Cap table saved to backend/logs/captable.json", "green");

  await sleep(500);

  log("Generating cap table in CSV format...", "blue");
  const csvOutput = runCommand(
    "bun run cli captable --format csv",
    "Generate CSV cap table",
  );
  writeFileSync(join(__dirname, "logs", "captable.csv"), csvOutput);
  log("✓ Cap table saved to backend/logs/captable.csv", "green");

  // Step 6: Advanced Operations
  section("Step 6: Advanced Operations");

  log("Testing stock split (2-for-1)...", "blue");
  runCommand("bun run cli split 2", "Execute 2-for-1 split");

  await sleep(2000);

  log("Displaying updated cap table after split...", "blue");
  runCommand("bun run cli captable", "Display cap table after split");

  await sleep(500);

  log("Testing metadata change...", "blue");
  runCommand('bun run cli metadata "ChainEquity Updated" "CEQV2"', "Change metadata");

  await sleep(500);

  log("Verifying metadata change...", "blue");
  runCommand("bun run cli info", "Verify new metadata");

  // Summary
  section("Demo Complete! 🎉");

  console.log(chalk.green("✅ All operations completed successfully!\n"));
  console.log(chalk.white("Summary:"));
  console.log(chalk.gray("  • Contract deployed to Anvil"));
  console.log(chalk.gray("  • Database initialized with schema"));
  console.log(chalk.gray("  • 3 addresses approved on allowlist"));
  console.log(chalk.gray("  • 1750 tokens minted across 3 holders"));
  console.log(chalk.gray("  • Event indexer synced and running"));
  console.log(chalk.gray("  • Cap table generated (table, JSON, CSV)"));
  console.log(chalk.gray("  • Stock split executed (2-for-1)"));
  console.log(chalk.gray("  • Metadata changed successfully\n"));

  console.log(chalk.blue("Next Steps:"));
  console.log(chalk.white("  • Check indexer logs: tail -f backend/logs/indexer.log"));
  console.log(chalk.white("  • View cap table: bun run cli captable"));
  console.log(
    chalk.white(
      "  • Query historical cap table: bun run cli captable --block <number>",
    ),
  );
  console.log(chalk.white('  • Stop indexer: pkill -f "bun.*indexer"'));
  console.log();

  log("Note: The indexer is still running in the background", "yellow");
  log("      It will continue listening for blockchain events", "yellow");
  log('      Stop it with: pkill -f "bun.*indexer"\n', "yellow");
};

main().catch((error) => {
  console.error(chalk.red("\n❌ Demo failed:"), error);
  process.exit(1);
});
