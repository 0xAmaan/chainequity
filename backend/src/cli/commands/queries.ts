/**
 * Query commands - All read operations
 */

import { Database } from "../../lib/db";
import { handleCommandError, setupCommand } from "./utils";
import chalk from "chalk";
import type { Address } from "viem";

/**
 * Info command - Display contract information
 */
export const infoCommand = async (options: any) => {
  try {
    console.log(chalk.blue("\nℹ️  Contract Information\n"));

    const { config, contract } = setupCommand(options);

    // Fetch contract information
    const [name, symbol, decimals, totalSupply, owner] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.decimals(),
      contract.totalSupply(),
      contract.owner(),
    ]);

    // Display information
    console.log(chalk.gray("Contract Address:"), chalk.white(config.contractAddress));
    console.log(chalk.gray("RPC URL:"), chalk.white(config.rpcUrl));
    console.log(chalk.gray("Chain ID:"), chalk.white(config.chainId));
    console.log();

    console.log(chalk.cyan("Token Information:"));
    console.log(chalk.gray("  Name:"), chalk.white(name));
    console.log(chalk.gray("  Symbol:"), chalk.white(symbol));
    console.log(chalk.gray("  Decimals:"), chalk.white(decimals));
    console.log(
      chalk.gray("  Total Supply:"),
      chalk.white(contract.formatTokenAmount(totalSupply, decimals)),
    );
    console.log(
      chalk.gray("  Raw Total Supply:"),
      chalk.white(totalSupply.toString()),
    );
    console.log();

    console.log(chalk.cyan("Access Control:"));
    console.log(chalk.gray("  Owner:"), chalk.white(owner));
    console.log(
      chalk.gray("  Current Signer:"),
      chalk.white(contract.getAccountAddress()),
    );
    console.log(
      chalk.gray("  Is Owner:"),
      owner.toLowerCase() === contract.getAccountAddress().toLowerCase()
        ? chalk.green("✓ Yes")
        : chalk.red("✗ No"),
    );
    console.log();
  } catch (error: any) {
    handleCommandError(error);
  }
};

/**
 * Status command - Check address status and balance
 */
export const statusCommand = async (address: string | undefined, options: any) => {
  try {
    const { config, contract } = setupCommand(options);

    // Use provided address or default to account address
    const targetAddress = (address || contract.getAccountAddress()) as Address;

    console.log(chalk.blue("\n📋 Address Status\n"));
    console.log(chalk.gray("Address:"), chalk.white(targetAddress));
    console.log(chalk.gray("Contract:"), chalk.white(config.contractAddress));
    console.log();

    // Fetch data in parallel
    const [isAllowlisted, balance, decimals, symbol, totalSupply] = await Promise.all([
      contract.isAllowlisted(targetAddress),
      contract.balanceOf(targetAddress),
      contract.decimals(),
      contract.symbol(),
      contract.totalSupply(),
    ]);

    // Calculate ownership percentage
    const ownershipPct =
      totalSupply > 0n
        ? ((Number(balance) / Number(totalSupply)) * 100).toFixed(4)
        : "0.0000";

    // Display status
    console.log(chalk.bold("Allowlist Status:"));
    if (isAllowlisted) {
      console.log(
        chalk.green("  ✓ Approved - This address can hold and transfer tokens"),
      );
    } else {
      console.log(
        chalk.red("  ✗ Not Approved - This address cannot hold or receive tokens"),
      );
    }
    console.log();

    console.log(chalk.bold("Token Holdings:"));
    console.log(
      chalk.gray("  Balance:"),
      chalk.white(`${contract.formatTokenAmount(balance, decimals)} ${symbol}`),
    );
    console.log(chalk.gray("  Raw balance:"), chalk.white(balance.toString()));
    console.log(chalk.gray("  Ownership:"), chalk.white(`${ownershipPct}%`));
    console.log();

    console.log(chalk.bold("Contract Info:"));
    console.log(
      chalk.gray("  Total Supply:"),
      chalk.white(`${contract.formatTokenAmount(totalSupply, decimals)} ${symbol}`),
    );
    console.log(chalk.gray("  Decimals:"), chalk.white(decimals.toString()));
    console.log();

    // Show actionable info
    if (!isAllowlisted && balance > 0n) {
      console.log(
        chalk.yellow("⚠️  Warning: This address holds tokens but is not allowlisted."),
      );
      console.log(chalk.yellow("   It cannot transfer tokens until approved."));
      console.log();
    }
  } catch (error: any) {
    handleCommandError(error);
  }
};

/**
 * Cap table command - Display capitalization table
 */
export const captableCommand = async (options: any) => {
  try {
    console.log(chalk.blue("\n📊 Capitalization Table\n"));

    const { config, contract } = setupCommand(options);
    const db = new Database(config);
    const decimals = await contract.decimals();

    // Get cap table (historical or current)
    const blockNumber = options.block ? BigInt(options.block) : null;
    let capTable;

    if (blockNumber) {
      console.log(chalk.gray(`📅 Historical cap table at block ${blockNumber}\n`));
      capTable = await db.getCapTableAtBlock(blockNumber);
    } else {
      console.log(chalk.gray("📅 Current cap table\n"));
      capTable = await db.getCurrentCapTable();
    }

    const totalSupply = await db.getTotalSupply();
    const symbol = await contract.symbol();

    if (capTable.length === 0) {
      console.log(chalk.yellow("   No token holders found"));
      await db.close();
      return;
    }

    // Format output based on --format option
    const format = options.format || "table";

    switch (format) {
      case "json":
        console.log(
          JSON.stringify(
            {
              timestamp: new Date().toISOString(),
              blockNumber: blockNumber?.toString() || "latest",
              contractAddress: config.contractAddress,
              totalSupply: totalSupply.toString(),
              holders: capTable.length,
              distribution: capTable.map((entry) => ({
                address: entry.address,
                balance: entry.balance,
                ownershipPercentage: entry.ownership_percentage,
                isAllowlisted: entry.is_allowlisted,
              })),
            },
            null,
            2,
          ),
        );
        break;

      case "csv":
        console.log("Address,Balance,Ownership%,Allowlisted");
        capTable.forEach((entry) => {
          console.log(
            `${entry.address},${entry.balance},${entry.ownership_percentage},${entry.is_allowlisted || false}`,
          );
        });
        break;

      case "table":
      default:
        console.log(chalk.gray("═".repeat(100)));
        console.log(
          chalk.white(
            `${"#".padEnd(4)} ${"Address".padEnd(44)} ${"Balance".padEnd(20)} ${"Ownership %".padEnd(15)} ${"Status"}`,
          ),
        );
        console.log(chalk.gray("═".repeat(100)));

        capTable.forEach((entry, index) => {
          const rank = `${index + 1}.`.padEnd(4);
          const address = entry.address.padEnd(44);
          const balance =
            `${contract.formatTokenAmount(BigInt(entry.balance), decimals)} ${symbol}`.padEnd(
              20,
            );
          const ownership = `${entry.ownership_percentage}%`.padEnd(15);
          const status = entry.is_allowlisted
            ? chalk.green("✓ Allowed")
            : chalk.red("✗ Blocked");

          console.log(
            `${chalk.cyan(rank)} ${chalk.white(address)} ${chalk.yellow(balance)} ${chalk.magenta(ownership)} ${status}`,
          );
        });

        console.log(chalk.gray("═".repeat(100)));
        console.log(
          chalk.white(
            `Total: ${contract.formatTokenAmount(totalSupply, decimals)} ${symbol} across ${capTable.length} holders`,
          ),
        );
        console.log(chalk.gray("═".repeat(100)));
        console.log();
        break;
    }

    await db.close();
  } catch (error: any) {
    handleCommandError(error);
  }
};
