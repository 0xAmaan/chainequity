/**
 * Metadata command - Change token name and symbol
 */

import { getConfig } from "../../lib/config";
import { createContract } from "../../lib/contract";
import chalk from "chalk";

export async function metadataCommand(name: string, symbol: string, options: any) {
  try {
    console.log(chalk.blue("\n📝 Changing token metadata...\n"));

    const config = getConfig();
    if (options.rpc) config.rpcUrl = options.rpc;
    if (options.contract) config.contractAddress = options.contract;
    if (options.privateKey) config.privateKey = options.privateKey;

    const contract = createContract(config);

    // Get current metadata
    const currentName = await contract.name();
    const currentSymbol = await contract.symbol();

    console.log(chalk.gray("Current name:"), chalk.white(currentName));
    console.log(chalk.gray("Current symbol:"), chalk.white(currentSymbol));
    console.log(chalk.gray("New name:"), chalk.white(name));
    console.log(chalk.gray("New symbol:"), chalk.white(symbol));
    console.log(chalk.gray("Contract:"), chalk.white(config.contractAddress));
    console.log(chalk.gray("Signer:"), chalk.white(contract.getAccountAddress()));
    console.log();

    // Send transaction
    console.log(chalk.gray("Sending transaction..."));
    const hash = await contract.changeMetadata(name, symbol);
    console.log(chalk.gray("Transaction hash:"), chalk.cyan(hash));

    // Wait for confirmation
    console.log(chalk.gray("Waiting for confirmation..."));
    const receipt = await contract.waitForTransaction(hash);

    if (receipt.status === "success") {
      const newName = await contract.name();
      const newSymbol = await contract.symbol();
      console.log(chalk.green("\n✅ Metadata changed successfully!"));
      console.log(
        chalk.gray("Block number:"),
        chalk.white(receipt.blockNumber.toString()),
      );
      console.log(chalk.gray("Gas used:"), chalk.white(receipt.gasUsed.toString()));
      console.log(chalk.gray("Confirmed name:"), chalk.white(newName));
      console.log(chalk.gray("Confirmed symbol:"), chalk.white(newSymbol));
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
