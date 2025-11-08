/**
 * Split command - Execute stock split
 */

import { getConfig } from "../../lib/config";
import { createContract } from "../../lib/contract";
import { Database } from "../../lib/db";
import chalk from "chalk";
import type { Address } from "viem";

export async function splitCommand(multiplierStr: string, options: any) {
  try {
    console.log(chalk.blue("\n📊 Executing stock split...\n"));

    const config = getConfig();
    if (options.rpc) config.rpcUrl = options.rpc;
    if (options.contract) config.contractAddress = options.contract;
    if (options.privateKey) config.privateKey = options.privateKey;

    const contract = createContract(config);
    const db = new Database(config);

    // Parse multiplier
    const multiplier = parseInt(multiplierStr);
    if (isNaN(multiplier) || multiplier < 2) {
      throw new Error("Multiplier must be an integer >= 2");
    }

    // Get token holders from database
    console.log(chalk.gray("Fetching token holders from database..."));
    const balances = await db.getAllBalances();

    if (balances.length === 0) {
      throw new Error("No token holders found. Cannot execute split.");
    }

    const holders = balances.map((b) => b.address as Address);

    // Get current total supply
    const currentSupply = await contract.totalSupply();
    const decimals = await contract.decimals();
    const newSupply = currentSupply * BigInt(multiplier);

    console.log(chalk.gray("Multiplier:"), chalk.white(`${multiplier}x`));
    console.log(chalk.gray("Holders:"), chalk.white(holders.length.toString()));
    console.log(
      chalk.gray("Current supply:"),
      chalk.white(contract.formatTokenAmount(currentSupply, decimals)),
    );
    console.log(
      chalk.gray("New supply:"),
      chalk.white(contract.formatTokenAmount(newSupply, decimals)),
    );
    console.log(chalk.gray("Contract:"), chalk.white(config.contractAddress));
    console.log(chalk.gray("Signer:"), chalk.white(contract.getAccountAddress()));
    console.log();

    // Send transaction
    console.log(chalk.gray("Sending transaction..."));
    const hash = await contract.executeSplit(BigInt(multiplier), holders);
    console.log(chalk.gray("Transaction hash:"), chalk.cyan(hash));

    // Wait for confirmation
    console.log(chalk.gray("Waiting for confirmation..."));
    const receipt = await contract.waitForTransaction(hash);

    if (receipt.status === "success") {
      const finalSupply = await contract.totalSupply();
      console.log(chalk.green("\n✅ Stock split executed successfully!"));
      console.log(
        chalk.gray("Block number:"),
        chalk.white(receipt.blockNumber.toString()),
      );
      console.log(chalk.gray("Gas used:"), chalk.white(receipt.gasUsed.toString()));
      console.log(
        chalk.gray("Final supply:"),
        chalk.white(contract.formatTokenAmount(finalSupply, decimals)),
      );
      console.log();
    } else {
      throw new Error("Transaction failed");
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
