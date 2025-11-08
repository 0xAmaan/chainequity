/**
 * Cap table command - Display capitalization table
 */

import { getConfig } from "../../lib/config";
import { createContract } from "../../lib/contract";
import { Database } from "../../lib/db";
import chalk from "chalk";

export async function captableCommand(options: any) {
  try {
    console.log(chalk.blue("\n📊 Capitalization Table\n"));

    const config = getConfig();
    if (options.rpc) config.rpcUrl = options.rpc;
    if (options.contract) config.contractAddress = options.contract;

    const contract = createContract(config);
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
    console.error(chalk.red("\n❌ Error:"), error.message);
    if (error.cause) {
      console.error(chalk.red("Cause:"), error.cause);
    }
    process.exit(1);
  }
}
