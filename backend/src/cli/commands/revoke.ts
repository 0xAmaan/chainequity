/**
 * Revoke command - Remove address from allowlist
 */

import { getConfig } from "../../lib/config";
import { createContract } from "../../lib/contract";
import chalk from "chalk";
import type { Address } from "viem";

export async function revokeCommand(address: string, options: any) {
  try {
    console.log(chalk.blue("\n❌ Revoking address from allowlist...\n"));

    const config = getConfig();
    if (options.rpc) config.rpcUrl = options.rpc;
    if (options.contract) config.contractAddress = options.contract;
    if (options.privateKey) config.privateKey = options.privateKey;

    const contract = createContract(config);

    // Validate address format
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error("Invalid address format");
    }

    // Check if allowlisted
    const isAllowlisted = await contract.isAllowlisted(address as Address);
    if (!isAllowlisted) {
      console.log(chalk.yellow("⚠️  Address is not currently allowlisted"));
      return;
    }

    console.log(chalk.gray("Address:"), chalk.white(address));
    console.log(chalk.gray("Contract:"), chalk.white(config.contractAddress));
    console.log(chalk.gray("Signer:"), chalk.white(contract.getAccountAddress()));
    console.log();

    // Send transaction
    console.log(chalk.gray("Sending transaction..."));
    const hash = await contract.removeFromAllowlist(address as Address);
    console.log(chalk.gray("Transaction hash:"), chalk.cyan(hash));

    // Wait for confirmation
    console.log(chalk.gray("Waiting for confirmation..."));
    const receipt = await contract.waitForTransaction(hash);

    if (receipt.status === "success") {
      console.log(chalk.green("\n✅ Address revoked successfully!"));
      console.log(
        chalk.gray("Block number:"),
        chalk.white(receipt.blockNumber.toString()),
      );
      console.log(chalk.gray("Gas used:"), chalk.white(receipt.gasUsed.toString()));
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
