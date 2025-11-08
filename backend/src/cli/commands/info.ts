/**
 * Info command - Display contract information
 */

import { getConfig } from "../../lib/config";
import { createContract } from "../../lib/contract";
import chalk from "chalk";

export async function infoCommand(options: any) {
  try {
    console.log(chalk.blue("\nℹ️  Contract Information\n"));

    const config = getConfig();
    if (options.rpc) config.rpcUrl = options.rpc;
    if (options.contract) config.contractAddress = options.contract;
    if (options.privateKey) config.privateKey = options.privateKey;

    const contract = createContract(config);

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
    console.error(chalk.red("\n❌ Error:"), error.message);
    if (error.cause) {
      console.error(chalk.red("Cause:"), error.cause);
    }
    process.exit(1);
  }
}
