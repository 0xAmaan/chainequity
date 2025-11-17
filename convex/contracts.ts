import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get all active contracts
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("contracts")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

/**
 * Get a contract by address
 */
export const getByAddress = query({
  args: {
    contractAddress: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contracts")
      .withIndex("by_address", (q) =>
        q.eq("contractAddress", args.contractAddress.toLowerCase()),
      )
      .first();
  },
});

/**
 * Get a contract by ID
 */
export const getById = query({
  args: {
    contractId: v.id("contracts"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.contractId);
  },
});

/**
 * Get indexer state for a contract
 */
export const getIndexerState = query({
  args: {
    contractId: v.id("contracts"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("indexerState")
      .withIndex("by_contract", (q) => q.eq("contractId", args.contractId))
      .first();
  },
});
