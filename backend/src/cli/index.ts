#!/usr/bin/env bun
/**
 * ChainEquity CLI Tool
 * Command-line interface for admin operations
 */
import { readFileSync } from "fs";
import { join } from "path";
import { captableCommand, infoCommand, statusCommand } from "./commands/queries";
// Import commands
import {
  approveCommand,
  buybackCommand,
  metadataCommand,
  mintCommand,
  revokeCommand,
  splitCommand,
} from "./commands/transactions";
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
  .action(infoCommand);

// Parse arguments
program.parse();

// Show help if no arguments
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
