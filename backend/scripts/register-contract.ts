#!/usr/bin/env bun
/**
 * Quick script to manually register an existing contract in the database
 * Usage: CONTRACT_ADDRESS=0x... bun scripts/register-contract.ts
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { Pool } from "pg";
import { createPublicClient, getContract, http } from "viem";
import { foundry } from "viem/chains";

const contractAddress = process.env.CONTRACT_ADDRESS as `0x${string}`;
if (!contractAddress) {
  console.error("❌ CONTRACT_ADDRESS environment variable is required");
  process.exit(1);
}

const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
const chainId = parseInt(process.env.CHAIN_ID || "31337");

// Load ABI
const abiPath = resolve(__dirname, "../src/lib/GatedEquityToken.abi.json");
const abi = JSON.parse(readFileSync(abiPath, "utf-8"));

// Create client
const client = createPublicClient({
  chain: foundry,
  transport: http(rpcUrl),
});

// Create contract instance
const contract = getContract({
  address: contractAddress,
  abi,
  client,
});

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "chain_equity",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
});

async function main() {
  try {
    console.log("🚀 Registering contract in database...");
    console.log(`📍 Contract Address: ${contractAddress}`);

    // Fetch contract details
    let name, symbol, decimals, owner;
    try {
      [name, symbol, decimals, owner] = await Promise.all([
        contract.read.name(),
        contract.read.symbol(),
        contract.read.decimals(),
        contract.read.owner(),
      ]);
    } catch (error: any) {
      console.error(
        "❌ Failed to read contract. Is Anvil running? Is the contract deployed?",
      );
      console.error(`   Error: ${error.message}`);
      process.exit(1);
    }

    console.log(`📋 Name: ${name}`);
    console.log(`📋 Symbol: ${symbol}`);
    console.log(`📋 Decimals: ${decimals}`);
    console.log(`📋 Owner: ${owner}`);

    // Insert into database
    const result = await pool.query(
      `INSERT INTO contracts (contract_address, chain_id, name, symbol, decimals, deployer_address)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (contract_address) DO UPDATE
       SET name = EXCLUDED.name, symbol = EXCLUDED.symbol
       RETURNING id`,
      [
        contractAddress.toLowerCase(),
        chainId,
        name,
        symbol,
        Number(decimals),
        owner.toLowerCase(),
      ],
    );

    console.log(`✅ Contract registered with ID: ${result.rows[0].id}`);
    console.log("\n🎉 Done! You can now run the indexer with:");
    console.log(`   CONTRACT_ADDRESS=${contractAddress} bun run indexer`);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
