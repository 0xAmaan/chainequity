#!/usr/bin/env bun
/**
 * One-time script to register the Base Sepolia contract in Convex
 */
import { convexIndexer } from "../lib/convex-client";

const CONTRACT_ADDRESS = "0x8C6b03Ba75286a962a8e3f2e2f916039Bf174D6e";
const CHAIN_ID = 84532; // Base Sepolia
const DEPLOYED_BLOCK = 33890547;
const DEPLOYED_BY = "0x72854398920B398365876a910FdBf75B828dcEd2";

async function registerContract() {
  console.log("🔧 Registering Base Sepolia contract in Convex...");
  console.log(`📍 Contract Address: ${CONTRACT_ADDRESS}`);
  console.log(`⛓️  Chain ID: ${CHAIN_ID} (Base Sepolia)`);
  console.log(`📦 Deployed Block: ${DEPLOYED_BLOCK}`);

  try {
    await convexIndexer.upsertContract({
      contractAddress: CONTRACT_ADDRESS,
      name: "ChainEquity Demo Token",
      symbol: "CEQDEMO",
      decimals: 18,
      chainId: CHAIN_ID,
      deployedAt: DEPLOYED_BLOCK,
      deployedBy: DEPLOYED_BY,
    });

    console.log("✅ Contract successfully registered in Convex!");
    console.log("\nNext steps:");
    console.log("1. Update your .env file:");
    console.log(`   CONTRACT_ADDRESS=${CONTRACT_ADDRESS}`);
    console.log(`   INDEXER_START_BLOCK=${DEPLOYED_BLOCK}`);
    console.log("2. Run the indexer: bun run backend/src/indexer/index.ts");
  } catch (error) {
    console.error("❌ Failed to register contract:", error);
    process.exit(1);
  }
}

registerContract();
