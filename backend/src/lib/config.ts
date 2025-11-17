/**
 * Configuration loader for ChainEquity backend
 */

import type { Config } from "../types";
import type { Address, Hash } from "viem";
import { baseSepolia, foundry, type Chain } from "viem/chains";

export type { Config };

// Bun automatically loads .env files, no need for dotenv package

/**
 * Load and validate configuration from environment variables
 * Database config removed - using Convex exclusively
 */
export const loadConfig = (): Config => {
  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
  const chainId = parseInt(process.env.CHAIN_ID || "31337");
  const contractAddress = (process.env.CONTRACT_ADDRESS || null) as Address | null;
  const privateKey = (process.env.PRIVATE_KEY || "") as Hash;

  const indexerStartBlock = BigInt(process.env.INDEXER_START_BLOCK || "0");
  const indexerPollInterval = parseInt(process.env.INDEXER_POLL_INTERVAL || "1000");
  const indexerBatchSize = parseInt(process.env.INDEXER_BATCH_SIZE || "1000");

  const logLevel = process.env.LOG_LEVEL || "info";

  return {
    rpcUrl,
    chainId,
    contractAddress,
    privateKey,
    indexer: {
      startBlock: indexerStartBlock,
      pollInterval: indexerPollInterval,
      batchSize: indexerBatchSize,
    },
    logLevel,
  };
};

/**
 * Validate that required configuration is present
 */
export const validateConfig = (
  config: Config,
  requireContractAddress = false,
): void => {
  const errors: string[] = [];

  if (!config.rpcUrl) {
    errors.push("RPC_URL is required");
  }

  if (
    requireContractAddress &&
    (!config.contractAddress || !process.env.CONTRACT_ADDRESS)
  ) {
    errors.push(
      "CONTRACT_ADDRESS is required. Deploy the contract first or set it in .env",
    );
  }

  // Removed database validation - using Convex

  if (errors.length > 0) {
    console.error("❌ Configuration errors:");
    errors.forEach((err) => console.error(`   - ${err}`));
    process.exit(1);
  }
};

/**
 * Get configuration with validation
 */
export const getConfig = (requireContractAddress = false): Config => {
  const config = loadConfig();
  validateConfig(config, requireContractAddress);
  return config;
};

/**
 * Get the appropriate viem chain object based on chain ID
 */
export const getChain = (chainId: number): Chain => {
  switch (chainId) {
    case 31337: // Anvil/Foundry local
      return foundry;
    case 84532: // Base Sepolia
      return baseSepolia;
    default:
      throw new Error(
        `Unsupported chain ID: ${chainId}. Supported chains: 31337 (Anvil), 84532 (Base Sepolia)`,
      );
  }
};
