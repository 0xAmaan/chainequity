/**
 * Status command - Check address status and balance
 */

import { getConfig } from "../../lib/config";
import { createContract } from "../../lib/contract";
import chalk from "chalk";
import type { Address } from "viem";

export async function statusCommand(address: string | undefined, options: any) {
  try {
    const config = getConfig();
    if (options.rpc) config.rpcUrl = options.rpc;
    if (options.contract) config.contractAddress = options.contract;

    const contract = createContract(config);

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
    console.error(chalk.red("\n❌ Error:"), error.message);
    if (error.cause) {
      console.error(chalk.red("Cause:"), error.cause);
    }
    process.exit(1);
  }
}
