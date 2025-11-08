#!/usr/bin/env bun
/**
 * ChainEquity CLI Tool
 * Command-line interface for admin operations
 */
import { readFileSync } from "fs";
import { join } from "path";
// Import commands
import { approveCommand } from "./commands/approve";
import { buybackCommand } from "./commands/buyback";
import { captableCommand } from "./commands/captable";
import { metadataCommand } from "./commands/metadata";
import { mintCommand } from "./commands/mint";
import { revokeCommand } from "./commands/revoke";
import { splitCommand } from "./commands/split";
import { statusCommand } from "./commands/status";
import chalk from "chalk";
import { Command } from "commander";

// Get package version
const packagePath = join(__dirname, "..", "..", "..", "package.json");
const packageJson = JSON.parse(readFileSync(packagePath, "utf-8"));
const version = packageJson.version || "1.0.0";

const program = new Command();

program
  .name("chain-equity")
  .description(chalk.blue("ChainEquity CLI - Manage gated equity tokens on-chain"))
  .version(version);

// Approve command
program
  .command("approve <address>")
  .description("Add an address to the allowlist")
  .option("-r, --rpc <url>", "RPC URL to connect to")
  .option("-c, --contract <address>", "Contract address")
  .option("-k, --private-key <key>", "Private key for signing")
  .action(approveCommand);

// Revoke command
program
  .command("revoke <address>")
  .description("Remove an address from the allowlist")
  .option("-r, --rpc <url>", "RPC URL to connect to")
  .option("-c, --contract <address>", "Contract address")
  .option("-k, --private-key <key>", "Private key for signing")
  .action(revokeCommand);

// Mint command
program
  .command("mint <address> <amount>")
  .description("Mint tokens to an address")
  .option("-r, --rpc <url>", "RPC URL to connect to")
  .option("-c, --contract <address>", "Contract address")
  .option("-k, --private-key <key>", "Private key for signing")
  .action(mintCommand);

// Buyback command
program
  .command("buyback <address> <amount>")
  .description("Buy back shares from a holder (burns tokens)")
  .option("-r, --rpc <url>", "RPC URL to connect to")
  .option("-c, --contract <address>", "Contract address")
  .option("-k, --private-key <key>", "Private key for signing")
  .action(buybackCommand);

// Split command
program
  .command("split <multiplier>")
  .description("Execute a stock split (e.g., split 7 for 7-for-1)")
  .option("-r, --rpc <url>", "RPC URL to connect to")
  .option("-c, --contract <address>", "Contract address")
  .option("-k, --private-key <key>", "Private key for signing")
  .action(splitCommand);

// Metadata command
program
  .command("metadata <name> <symbol>")
  .description("Change token name and symbol")
  .option("-r, --rpc <url>", "RPC URL to connect to")
  .option("-c, --contract <address>", "Contract address")
  .option("-k, --private-key <key>", "Private key for signing")
  .action(metadataCommand);

// Cap table command
program
  .command("captable")
  .alias("cap")
  .description("Display current cap table")
  .option("-b, --block <number>", "Historical block number")
  .option("-f, --format <type>", "Output format: table, json, csv", "table")
  .option("-r, --rpc <url>", "RPC URL to connect to")
  .option("-c, --contract <address>", "Contract address")
  .action(captableCommand);

// Status command
program
  .command("status [address]")
  .description("Check allowlist status and balance for an address")
  .option("-r, --rpc <url>", "RPC URL to connect to")
  .option("-c, --contract <address>", "Contract address")
  .action(statusCommand);

// Info command
program
  .command("info")
  .description("Display contract information")
  .option("-r, --rpc <url>", "RPC URL to connect to")
  .option("-c, --contract <address>", "Contract address")
  .action(async (options) => {
    const { getConfig } = await import("../lib/config");
    const { createContract } = await import("../lib/contract");

    try {
      const config = getConfig();
      if (options.rpc) config.rpcUrl = options.rpc;
      if (options.contract) config.contractAddress = options.contract;

      const contract = createContract(config);

      console.log(chalk.blue("\n📋 Contract Information\n"));

      const [name, symbol, decimals, totalSupply, owner] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals(),
        contract.totalSupply(),
        contract.owner(),
      ]);

      console.log(chalk.gray("Address:"), chalk.white(contract.getContractAddress()));
      console.log(chalk.gray("Name:"), chalk.white(name));
      console.log(chalk.gray("Symbol:"), chalk.white(symbol));
      console.log(chalk.gray("Decimals:"), chalk.white(decimals));
      console.log(
        chalk.gray("Total Supply:"),
        chalk.white(contract.formatTokenAmount(totalSupply, decimals)),
      );
      console.log(chalk.gray("Owner:"), chalk.white(owner));

      const blockNumber = await contract.getBlockNumber();
      console.log(chalk.gray("Current Block:"), chalk.white(blockNumber.toString()));
      console.log();
    } catch (error: any) {
      console.error(chalk.red("Error:"), error.message);
      process.exit(1);
    }
  });

// Parse arguments
program.parse();

// Show help if no arguments
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
