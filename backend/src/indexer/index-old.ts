#!/usr/bin/env bun
/**
 * ChainEquity Event Indexer Daemon
 * Listens to blockchain events and maintains cap table in PostgreSQL
 */
import { getConfig } from "../lib/config";
import { createContract } from "../lib/contract";
import { Database } from "../lib/db";
import { logger } from "../lib/logger";
import { EventListener } from "./event-listener";

class Indexer {
  private config = getConfig();
  private contract = createContract(this.config);
  private db = new Database(this.config);
  private eventListener = new EventListener(this.contract, this.db);
  private isShuttingDown = false;

  /**
   * Initialize the indexer
   */
  async initialize(): Promise<void> {
    logger.info("🚀 ChainEquity Indexer Starting...");
    logger.info(`📍 Contract Address: ${this.config.contractAddress}`);
    logger.info(`🔗 RPC URL: ${this.config.rpcUrl}`);
    logger.info(`🗄️  Database: ${this.config.database.name}`);

    // Test database connection
    logger.info("Testing database connection...");
    const dbConnected = await this.db.testConnection();
    if (!dbConnected) {
      throw new Error("Failed to connect to database");
    }
    logger.info("✅ Database connection successful");

    // Initialize contract ID
    logger.info("Looking up contract ID from database...");
    await this.db.initializeContractId();
    logger.info("✅ Contract ID initialized");

    // Get current block number
    const currentBlock = await this.contract.getBlockNumber();
    logger.info(`📦 Current block: ${currentBlock}`);

    // Get indexer state
    const state = await this.db.getIndexerState();
    logger.info(`📊 Last processed block: ${state.last_processed_block}`);

    // Sync historical events if needed
    if (state.last_processed_block < currentBlock) {
      const fromBlock = state.last_processed_block + BigInt(1);
      logger.info(
        `🔄 Syncing historical events from block ${fromBlock} to ${currentBlock}...`,
      );
      await this.eventListener.syncHistoricalEvents(fromBlock, currentBlock);
    } else {
      logger.info("✅ Indexer is up to date");
    }

    // Get contract info
    const name = await this.contract.name();
    const symbol = await this.contract.symbol();
    const totalSupply = await this.contract.totalSupply();

    logger.info(`\n📋 Contract Info:`);
    logger.info(`   Name: ${name}`);
    logger.info(`   Symbol: ${symbol}`);
    logger.info(`   Total Supply: ${totalSupply.toString()}`);

    // Start listening for new events
    await this.eventListener.start();

    logger.info("\n✅ Indexer is running and listening for events...\n");
  }

  /**
   * Start the indexer
   */
  async start(): Promise<void> {
    try {
      await this.initialize();

      // Set up graceful shutdown
      this.setupShutdownHandlers();

      // Keep the process running
      await this.keepAlive();
    } catch (error) {
      logger.error("❌ Fatal error starting indexer:", error);
      await this.shutdown();
      process.exit(1);
    }
  }

  /**
   * Keep the process alive
   */
  private async keepAlive(): Promise<void> {
    while (!this.isShuttingDown) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  /**
   * Set up graceful shutdown handlers
   */
  private setupShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) {
        return;
      }
      this.isShuttingDown = true;

      logger.info(`\n📡 Received ${signal}, shutting down gracefully...`);
      await this.shutdown();
      process.exit(0);
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGHUP", () => shutdown("SIGHUP"));
  }

  /**
   * Graceful shutdown
   */
  private async shutdown(): Promise<void> {
    logger.info("🛑 Stopping event listener...");
    this.eventListener.stop();

    logger.info("🛑 Closing database connection...");
    await this.db.close();

    logger.info("✅ Shutdown complete");
  }

  /**
   * Print current cap table
   */
  async printCapTable(): Promise<void> {
    const capTable = await this.db.getCurrentCapTable();
    const totalSupply = await this.db.getTotalSupply();

    logger.info("\n📊 Current Cap Table:");
    logger.info("═".repeat(80));

    if (capTable.length === 0) {
      logger.info("   No token holders yet");
    } else {
      capTable.forEach((entry, index) => {
        logger.info(
          `${index + 1}. ${entry.address} - ${entry.balance} tokens (${entry.ownership_percentage}%)`,
        );
        if (entry.is_allowlisted !== undefined) {
          logger.info(`   Allowlisted: ${entry.is_allowlisted ? "✅" : "❌"}`);
        }
      });
    }

    logger.info("═".repeat(80));
    logger.info(`Total Supply: ${totalSupply.toString()} tokens\n`);
  }
}

// Run the indexer
const indexer = new Indexer();
indexer.start();
