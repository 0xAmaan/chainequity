/**
 * Transaction commands - All write operations
 */

import { Database } from "../../lib/db";
import {
  displayCommandInfo,
  executeTransaction,
  handleCommandError,
  setupCommand,
  validateAddress,
} from "./utils";
import chalk from "chalk";
import type { Address } from "viem";

/**
 * Approve command - Add address to allowlist
 */
export const approveCommand = async (address: string, options: any) => {
  try {
    console.log(chalk.blue("\n✅ Approving address for allowlist...\n"));

    const { config, contract } = setupCommand(options);
    validateAddress(address);

    // Check if already allowlisted
    const isAllowlisted = await contract.isAllowlisted(address as Address);
    if (isAllowlisted) {
      console.log(chalk.yellow("⚠️  Address is already allowlisted"));
      return;
    }

    console.log(chalk.gray("Address:"), chalk.white(address));
    displayCommandInfo(config, contract);
    console.log();

    await executeTransaction(
      contract,
      () => contract.addToAllowlist(address as Address),
      "Address approved successfully!",
    );
  } catch (error: any) {
    handleCommandError(error);
  }
};

/**
 * Revoke command - Remove address from allowlist
 */
export const revokeCommand = async (address: string, options: any) => {
  try {
    console.log(chalk.blue("\n❌ Revoking address from allowlist...\n"));

    const { config, contract } = setupCommand(options);
    validateAddress(address);

    // Check if allowlisted
    const isAllowlisted = await contract.isAllowlisted(address as Address);
    if (!isAllowlisted) {
      console.log(chalk.yellow("⚠️  Address is not currently allowlisted"));
      return;
    }

    console.log(chalk.gray("Address:"), chalk.white(address));
    displayCommandInfo(config, contract);
    console.log();

    await executeTransaction(
      contract,
      () => contract.removeFromAllowlist(address as Address),
      "Address revoked successfully!",
    );
  } catch (error: any) {
    handleCommandError(error);
  }
};

/**
 * Mint command - Mint tokens to address
 */
export const mintCommand = async (address: string, amount: string, options: any) => {
  try {
    console.log(chalk.blue("\n🪙  Minting tokens...\n"));

    const { config, contract } = setupCommand(options);
    validateAddress(address);

    // Get decimals and parse amount
    const decimals = await contract.decimals();
    const amountBigInt = contract.parseTokenAmount(amount, decimals);

    // Get current balance
    const currentBalance = await contract.balanceOf(address as Address);

    console.log(chalk.gray("To:"), chalk.white(address));
    console.log(chalk.gray("Amount:"), chalk.white(`${amount} tokens`));
    console.log(
      chalk.gray("Current balance:"),
      chalk.white(contract.formatTokenAmount(currentBalance, decimals)),
    );
    displayCommandInfo(config, contract);
    console.log();

    await executeTransaction(
      contract,
      () => contract.mint(address as Address, amountBigInt),
      "Tokens minted successfully!",
      async () => {
        const newBalance = await contract.balanceOf(address as Address);
        console.log(
          chalk.gray("New balance:"),
          chalk.white(contract.formatTokenAmount(newBalance, decimals)),
        );
      },
    );
  } catch (error: any) {
    handleCommandError(error);
  }
};

/**
 * Buyback command - Company buys back shares from holder
 */
export const buybackCommand = async (
  address: string,
  amount: string,
  options: any,
) => {
  try {
    console.log(chalk.blue("\n💰 Executing share buyback...\n"));

    const { config, contract } = setupCommand(options);
    validateAddress(address);

    // Get decimals and parse amount
    const decimals = await contract.decimals();
    const amountBigInt = contract.parseTokenAmount(amount, decimals);

    // Get current balance
    const currentBalance = await contract.balanceOf(address as Address);

    console.log(chalk.gray("Buying back from:"), chalk.white(address));
    console.log(chalk.gray("Amount:"), chalk.white(`${amount} tokens`));
    console.log(
      chalk.gray("Current balance:"),
      chalk.white(contract.formatTokenAmount(currentBalance, decimals)),
    );
    displayCommandInfo(config, contract);
    console.log();

    // Validate holder has enough tokens
    if (currentBalance < amountBigInt) {
      throw new Error(
        `Holder only has ${contract.formatTokenAmount(currentBalance, decimals)} tokens`,
      );
    }

    await executeTransaction(
      contract,
      () => contract.buyback(address as Address, amountBigInt),
      "Shares bought back successfully!",
      async () => {
        const newBalance = await contract.balanceOf(address as Address);
        const totalSupply = await contract.totalSupply();

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
      },
    );
  } catch (error: any) {
    handleCommandError(error);
  }
};

/**
 * Metadata command - Change token name and symbol
 */
export const metadataCommand = async (name: string, symbol: string, options: any) => {
  try {
    console.log(chalk.blue("\n📝 Changing token metadata...\n"));

    const { config, contract } = setupCommand(options);

    // Get current metadata
    const currentName = await contract.name();
    const currentSymbol = await contract.symbol();

    console.log(chalk.gray("Current name:"), chalk.white(currentName));
    console.log(chalk.gray("Current symbol:"), chalk.white(currentSymbol));
    console.log(chalk.gray("New name:"), chalk.white(name));
    console.log(chalk.gray("New symbol:"), chalk.white(symbol));
    displayCommandInfo(config, contract);
    console.log();

    await executeTransaction(
      contract,
      () => contract.changeMetadata(name, symbol),
      "Metadata changed successfully!",
      async () => {
        const newName = await contract.name();
        const newSymbol = await contract.symbol();
        console.log(chalk.gray("Confirmed name:"), chalk.white(newName));
        console.log(chalk.gray("Confirmed symbol:"), chalk.white(newSymbol));
      },
    );
  } catch (error: any) {
    handleCommandError(error);
  }
};

/**
 * Split command - Execute stock split
 */
export const splitCommand = async (multiplierStr: string, options: any) => {
  try {
    console.log(chalk.blue("\n📊 Executing stock split...\n"));

    const { config, contract } = setupCommand(options);
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
    displayCommandInfo(config, contract);
    console.log();

    await executeTransaction(
      contract,
      () => contract.executeSplit(BigInt(multiplier), holders),
      "Stock split executed successfully!",
      async () => {
        const finalSupply = await contract.totalSupply();
        console.log(
          chalk.gray("Final supply:"),
          chalk.white(contract.formatTokenAmount(finalSupply, decimals)),
        );
      },
    );

    await db.close();
  } catch (error: any) {
    handleCommandError(error);
  }
};
