#!/usr/bin/env bun

/**
 * Sync existing contracts from PostgreSQL to Convex
 * Run this before starting the indexer with Convex integration
 */
import { loadConfig } from "../lib/config";
import { convexIndexer } from "../lib/convex-client";
import { Database } from "../lib/db";
import { logger } from "../lib/logger";

const config = loadConfig();

async function syncContractsToConvex() {
  logger.info("🔄 Syncing contracts from PostgreSQL to Convex...");

  const db = new Database(config);

  try {
    // Connect to PostgreSQL
    await db.testConnection();

    // Get all active contracts from PostgreSQL
    const client = await db.getClient();
    const result = await client.query(
      "SELECT id, contract_address, name, symbol, decimals, chain_id, deployed_at, deployed_by FROM contracts WHERE is_active = TRUE",
    );
    client.release();

    const contracts = result.rows;

    if (contracts.length === 0) {
      logger.warn("⚠️  No contracts found in PostgreSQL");
      return;
    }

    logger.info(`📦 Found ${contracts.length} contract(s) in PostgreSQL`);

    for (const contract of contracts) {
      logger.info(
        `🔄 Syncing contract: ${contract.name} (${contract.contract_address})`,
      );

      try {
        // Check if contract already exists in Convex
        const existing = await convexIndexer.getContractByAddress(
          contract.contract_address,
        );

        if (existing) {
          logger.info(`  ✅ Contract already exists in Convex (ID: ${existing._id})`);
          continue;
        }

        // Create contract in Convex
        const convexContractId = await convexIndexer.upsertContract({
          contractAddress: contract.contract_address.toLowerCase(),
          name: contract.name,
          symbol: contract.symbol,
          decimals: contract.decimals,
          chainId: contract.chain_id,
          deployedAt: new Date(contract.deployed_at).getTime(),
          deployedBy: contract.deployed_by || undefined,
        });

        logger.info(`  ✅ Created contract in Convex (ID: ${convexContractId})`);
      } catch (error) {
        logger.error(
          `  ❌ Error syncing contract ${contract.contract_address}:`,
          error,
        );
      }
    }

    logger.info("✅ Contract sync complete!");
  } catch (error) {
    logger.error("❌ Error syncing contracts:", error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Run the sync
syncContractsToConvex().catch((error) => {
  logger.error("Fatal error:", error);
  process.exit(1);
});
