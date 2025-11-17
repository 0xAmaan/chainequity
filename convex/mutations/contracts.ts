import { mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Create or update a contract entry
 */
export const upsert = mutation({
  args: {
    contractAddress: v.string(),
    name: v.string(),
    symbol: v.string(),
    decimals: v.number(),
    chainId: v.number(),
    deployedAt: v.number(),
    deployedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if contract already exists
    const existing = await ctx.db
      .query("contracts")
      .withIndex("by_address", (q) => q.eq("contractAddress", args.contractAddress))
      .first();

    if (existing) {
      // Update existing contract
      await ctx.db.patch(existing._id, {
        name: args.name,
        symbol: args.symbol,
        decimals: args.decimals,
        isActive: true,
      });
      return existing._id;
    }

    // Create new contract
    const contractId = await ctx.db.insert("contracts", {
      ...args,
      isActive: true,
    });

    // Initialize indexer state
    await ctx.db.insert("indexerState", {
      contractId,
      lastProcessedBlock: "0",
      lastUpdatedAt: Date.now(),
      isSyncing: false,
    });

    return contractId;
  },
});

/**
 * Deactivate a contract (soft delete)
 */
export const deactivate = mutation({
  args: {
    contractAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const contract = await ctx.db
      .query("contracts")
      .withIndex("by_address", (q) => q.eq("contractAddress", args.contractAddress))
      .first();

    if (!contract) {
      throw new Error("Contract not found");
    }

    await ctx.db.patch(contract._id, {
      isActive: false,
    });
  },
});
