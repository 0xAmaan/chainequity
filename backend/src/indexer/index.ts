#!/usr/bin/env bun
/**
 * ChainEquity Multi-Contract Event Indexer
 * Automatically watches ALL contracts in the database
 */
import { getConfig } from "../lib/config";
import { Database } from "../lib/db";
import { logger } from "../lib/logger";
import { ContractManager } from "./contract-manager";
import { MultiContractListener } from "./multi-contract-listener";

class MultiContractIndexer {
  private config = getConfig(false); // Don't require CONTRACT_ADDRESS
  private db = new Database(this.config);
  private contractManager = new ContractManager(this.config);
  private eventListener = new MultiContractListener(this.contractManager, this.db);
  private isShuttingDown = false;

  /**
   * Initialize the indexer
   */
  async initialize(): Promise<void> {
    logger.info("🚀 ChainEquity Multi-Contract Indexer Starting...");
    logger.info(`🔗 RPC URL: ${this.config.rpcUrl}`);
    logger.info(`🗄️  Database: ${this.config.database.name}`);

    // Test database connection
    logger.info("Testing database connection...");
    const dbConnected = await this.db.testConnection();
    if (!dbConnected) {
      throw new Error("Failed to connect to database");
    }
    logger.info("✅ Database connection successful");

    // Load all contracts from database
    logger.info("Loading contracts from database...");
    await this.contractManager.loadContracts();

    const addresses = this.contractManager.getContractAddresses();
    if (addresses.length === 0) {
      logger.warn(
        "⚠️  No contracts found. Deploy a contract through the web UI to get started.",
      );
      logger.warn(
        "⚠️  The indexer will continue running and automatically detect new contracts.",
      );
    }

    // Sync historical events for all contracts
    logger.info("Syncing historical events...");
    await this.eventListener.syncAllHistoricalEvents();

    // Start listening for new events
    await this.eventListener.start();

    logger.info("\n✅ Multi-contract indexer is running and listening for events...");
    logger.info("   - Automatically detects newly deployed contracts");
    logger.info("   - Indexes all contracts in the database");
    logger.info(
      "   - Deploy contracts through the web UI and they'll be tracked automatically\n",
    );
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
    await this.contractManager.close();

    logger.info("✅ Shutdown complete");
  }
}

// Run the indexer
const indexer = new MultiContractIndexer();
indexer.start();
