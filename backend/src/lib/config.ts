/**
 * Configuration loader for ChainEquity backend
 */

import { join } from "path";
import type { Config } from "../types";
export type { Config };
import dotenv from "dotenv";
import type { Address, Hash } from "viem";

// Load environment variables
dotenv.config({ path: join(__dirname, "..", "..", ".env") });

/**
 * Load and validate configuration from environment variables
 */
export const loadConfig = (): Config => {
  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
  const chainId = parseInt(process.env.CHAIN_ID || "31337");
  const contractAddress = (process.env.CONTRACT_ADDRESS || "") as Address;
  const privateKey = (process.env.PRIVATE_KEY || "") as Hash;

  const dbUrl = process.env.DATABASE_URL || "postgresql://localhost:5432/chain_equity";
  const dbHost = process.env.DB_HOST || "localhost";
  const dbPort = parseInt(process.env.DB_PORT || "5432");
  const dbName = process.env.DB_NAME || "chain_equity";
  const dbUser = process.env.DB_USER || "postgres";
  const dbPassword = process.env.DB_PASSWORD || "";

  const indexerStartBlock = BigInt(process.env.INDEXER_START_BLOCK || "0");
  const indexerPollInterval = parseInt(process.env.INDEXER_POLL_INTERVAL || "1000");
  const indexerBatchSize = parseInt(process.env.INDEXER_BATCH_SIZE || "1000");

  const logLevel = process.env.LOG_LEVEL || "info";

  return {
    rpcUrl,
    chainId,
    contractAddress,
    privateKey,
    database: {
      url: dbUrl,
      host: dbHost,
      port: dbPort,
      name: dbName,
      user: dbUser,
      password: dbPassword,
    },
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
export const validateConfig = (config: Config): void => {
  const errors: string[] = [];

  if (!config.rpcUrl) {
    errors.push("RPC_URL is required");
  }

  if (!config.contractAddress || !process.env.CONTRACT_ADDRESS) {
    errors.push(
      "CONTRACT_ADDRESS is required. Deploy the contract first or set it in .env",
    );
  }

  if (!config.privateKey || !process.env.PRIVATE_KEY) {
    errors.push("PRIVATE_KEY is required for signing transactions");
  }

  if (!config.database.url) {
    errors.push("DATABASE_URL is required");
  }

  if (errors.length > 0) {
    console.error("❌ Configuration errors:");
    errors.forEach((err) => console.error(`   - ${err}`));
    process.exit(1);
  }
};

/**
 * Get configuration with validation
 */
export const getConfig = (): Config => {
  const config = loadConfig();
  validateConfig(config);
  return config;
};
