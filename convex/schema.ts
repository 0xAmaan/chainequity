import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * ChainEquity Convex Schema
 *
 * This schema mirrors the PostgreSQL database structure and supports:
 * - Multi-contract indexing
 * - Real-time event tracking
 * - Historical cap table reconstruction
 * - Activity feed aggregation
 */

export default defineSchema({
  // Deployed smart contracts
  contracts: defineTable({
    contractAddress: v.string(),
    name: v.string(),
    symbol: v.string(),
    decimals: v.number(),
    chainId: v.number(),
    deployedAt: v.number(), // Unix timestamp in milliseconds
    deployedBy: v.optional(v.string()),
    isActive: v.boolean(),
  })
    .index("by_address", ["contractAddress"])
    .index("by_active", ["isActive"])
    .index("by_chain", ["chainId"]),

  // Indexer synchronization state per contract
  indexerState: defineTable({
    contractId: v.id("contracts"),
    lastProcessedBlock: v.string(), // BigInt as string
    lastUpdatedAt: v.number(), // Unix timestamp
    isSyncing: v.boolean(),
  }).index("by_contract", ["contractId"]),

  // Allowlisted addresses (approved to hold tokens)
  allowlist: defineTable({
    contractId: v.id("contracts"),
    address: v.string(),
    isAllowlisted: v.boolean(),
    addedAt: v.number(), // Unix timestamp
    addedAtBlock: v.string(), // BigInt as string
    removedAt: v.optional(v.number()),
    removedAtBlock: v.optional(v.string()),
    txHash: v.string(),
  })
    .index("by_contract", ["contractId"])
    .index("by_contract_and_address", ["contractId", "address"])
    .index("by_contract_and_status", ["contractId", "isAllowlisted"])
    .index("by_block", ["contractId", "addedAtBlock"]),

  // ERC20 Transfer events
  transfers: defineTable({
    contractId: v.id("contracts"),
    fromAddress: v.string(),
    toAddress: v.string(),
    amount: v.string(), // uint256 as string
    blockNumber: v.string(), // BigInt as string
    blockTimestamp: v.number(), // Unix timestamp
    txHash: v.string(),
    logIndex: v.number(),
  })
    .index("by_contract", ["contractId"])
    .index("by_contract_and_from", ["contractId", "fromAddress"])
    .index("by_contract_and_to", ["contractId", "toAddress"])
    .index("by_contract_and_block", ["contractId", "blockNumber"])
    .index("by_contract_and_timestamp", ["contractId", "blockTimestamp"])
    .index("by_tx", ["contractId", "txHash", "logIndex"]),

  // Current token balances (derived from transfers)
  balances: defineTable({
    contractId: v.id("contracts"),
    address: v.string(),
    balance: v.string(), // uint256 as string
    lastUpdatedBlock: v.string(), // BigInt as string
    lastUpdatedAt: v.number(), // Unix timestamp
  })
    .index("by_contract", ["contractId"])
    .index("by_contract_and_address", ["contractId", "address"]),

  // Stock split events
  stockSplits: defineTable({
    contractId: v.id("contracts"),
    multiplier: v.number(),
    newTotalSupply: v.string(), // uint256 as string
    blockNumber: v.string(), // BigInt as string
    blockTimestamp: v.number(), // Unix timestamp
    txHash: v.string(),
    affectedHolders: v.optional(v.number()),
  })
    .index("by_contract", ["contractId"])
    .index("by_contract_and_block", ["contractId", "blockNumber"])
    .index("by_tx", ["contractId", "txHash"]),

  // Token metadata change events (name/symbol changes)
  metadataChanges: defineTable({
    contractId: v.id("contracts"),
    oldName: v.string(),
    newName: v.string(),
    oldSymbol: v.string(),
    newSymbol: v.string(),
    blockNumber: v.string(), // BigInt as string
    blockTimestamp: v.number(), // Unix timestamp
    txHash: v.string(),
  })
    .index("by_contract", ["contractId"])
    .index("by_contract_and_block", ["contractId", "blockNumber"])
    .index("by_tx", ["contractId", "txHash"]),

  // Share buyback events
  buybacks: defineTable({
    contractId: v.id("contracts"),
    holderAddress: v.string(),
    amount: v.string(), // uint256 as string
    blockNumber: v.string(), // BigInt as string
    blockTimestamp: v.number(), // Unix timestamp
    txHash: v.string(),
    logIndex: v.number(),
  })
    .index("by_contract", ["contractId"])
    .index("by_contract_and_holder", ["contractId", "holderAddress"])
    .index("by_contract_and_block", ["contractId", "blockNumber"])
    .index("by_tx", ["contractId", "txHash", "logIndex"]),
});
