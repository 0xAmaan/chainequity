/**
 * Buyback command - Company buys back shares from holder
 */

import { getConfig } from "../../lib/config";
import { createContract } from "../../lib/contract";
import chalk from "chalk";
import type { Address } from "viem";

export async function buybackCommand(address: string, amount: string, options: any) {
  try {
    console.log(chalk.blue("\n💰 Executing share buyback...\n"));

    const config = getConfig();
    if (options.rpc) config.rpcUrl = options.rpc;
    if (options.contract) config.contractAddress = options.contract;
    if (options.privateKey) config.privateKey = options.privateKey;

    const contract = createContract(config);

    // Validate address format
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error("Invalid address format");
    }

    // Get decimals
    const decimals = await contract.decimals();

    // Parse amount
    const amountBigInt = contract.parseTokenAmount(amount, decimals);

    // Get current balance
    const currentBalance = await contract.balanceOf(address as Address);

    console.log(chalk.gray("Buying back from:"), chalk.white(address));
    console.log(chalk.gray("Amount:"), chalk.white(`${amount} tokens`));
    console.log(
      chalk.gray("Current balance:"),
      chalk.white(contract.formatTokenAmount(currentBalance, decimals)),
    );
    console.log(chalk.gray("Contract:"), chalk.white(config.contractAddress));
    console.log(chalk.gray("Signer:"), chalk.white(contract.getAccountAddress()));
    console.log();

    // Validate holder has enough tokens
    if (currentBalance < amountBigInt) {
      throw new Error(
        `Holder only has ${contract.formatTokenAmount(currentBalance, decimals)} tokens`,
      );
    }

    // Send transaction
    console.log(chalk.gray("Sending transaction..."));
    const hash = await contract.buyback(address as Address, amountBigInt);
    console.log(chalk.gray("Transaction hash:"), chalk.cyan(hash));

    // Wait for confirmation
    console.log(chalk.gray("Waiting for confirmation..."));
    const receipt = await contract.waitForTransaction(hash);

    if (receipt.status === "success") {
      const newBalance = await contract.balanceOf(address as Address);
      const totalSupply = await contract.totalSupply();

      console.log(chalk.green("\n✅ Shares bought back successfully!"));
      console.log(
        chalk.gray("Block number:"),
        chalk.white(receipt.blockNumber.toString()),
      );
      console.log(chalk.gray("Gas used:"), chalk.white(receipt.gasUsed.toString()));
      console.log(
        chalk.gray("Holder's new balance:"),
        chalk.white(contract.formatTokenAmount(newBalance, decimals)),
      );
      console.log(
        chalk.gray("New total supply:"),
        chalk.white(contract.formatTokenAmount(totalSupply, decimals)),
      );
      console.log(
        chalk.yellow(
          "\nNote: Off-chain payment must be completed separately via wire/stablecoin",
        ),
      );
      console.log();
    } else {
      throw new Error("Transaction failed");
    }
  } catch (error: any) {
    console.error(chalk.red("\n❌ Error:"), error.message);
    if (error.cause) {
      console.error(chalk.red("Cause:"), error.cause);
    }
    process.exit(1);
  }
}
