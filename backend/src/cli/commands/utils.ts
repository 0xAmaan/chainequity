/**
 * Shared utility functions for CLI commands
 */

import { getConfig, type Config } from "../../lib/config";
import { createContract, type ChainEquityContract } from "../../lib/contract";
import chalk from "chalk";
import type { Hash, TransactionReceipt } from "viem";

/**
 * Setup command with config overrides and contract creation
 */
export const setupCommand = (
  options: any,
): { config: Config; contract: ChainEquityContract } => {
  const config = getConfig();
  if (options.rpc) config.rpcUrl = options.rpc;
  if (options.contract) config.contractAddress = options.contract;
  if (options.privateKey) config.privateKey = options.privateKey;

  const contract = createContract(config);
  return { config, contract };
};

/**
 * Validate Ethereum address format
 */
export const validateAddress = (address: string): void => {
  if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
    throw new Error("Invalid address format");
  }
};

/**
 * Display contract and signer information
 */
export const displayCommandInfo = (
  config: Config,
  contract: ChainEquityContract,
): void => {
  console.log(chalk.gray("Contract:"), chalk.white(config.contractAddress));
  console.log(chalk.gray("Signer:"), chalk.white(contract.getAccountAddress()));
};

/**
 * Execute a transaction with standardized flow
 */
export const executeTransaction = async (
  contract: ChainEquityContract,
  txFn: () => Promise<Hash>,
  successMessage: string,
  extraOutputFn?: (receipt: TransactionReceipt) => Promise<void>,
): Promise<void> => {
  // Send transaction
  console.log(chalk.gray("Sending transaction..."));
  const hash = await txFn();
  console.log(chalk.gray("Transaction hash:"), chalk.cyan(hash));

  // Wait for confirmation
  console.log(chalk.gray("Waiting for confirmation..."));
  const receipt = await contract.waitForTransaction(hash);

  if (receipt.status === "success") {
    console.log(chalk.green(`\n✅ ${successMessage}`));
    console.log(
      chalk.gray("Block number:"),
      chalk.white(receipt.blockNumber.toString()),
    );
    console.log(chalk.gray("Gas used:"), chalk.white(receipt.gasUsed.toString()));

    // Call extra output function if provided
    if (extraOutputFn) {
      await extraOutputFn(receipt);
    }

    console.log();
  } else {
    throw new Error("Transaction failed");
  }
};

/**
 * Handle command errors with standardized format
 */
export const handleCommandError = (error: any): never => {
  console.error(chalk.red("\n❌ Error:"), error.message);
  if (error.cause) {
    console.error(chalk.red("Cause:"), error.cause);
  }
  process.exit(1);
};
