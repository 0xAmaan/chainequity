import { mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Update the last processed block for a contract
 */
export const updateState = mutation({
  args: {
    contractId: v.id("contracts"),
    blockNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("indexerState")
      .withIndex("by_contract", (q) => q.eq("contractId", args.contractId))
      .first();

    if (!state) {
      // Create new state if doesn't exist
      await ctx.db.insert("indexerState", {
        contractId: args.contractId,
        lastProcessedBlock: args.blockNumber,
        lastUpdatedAt: Date.now(),
        isSyncing: false,
      });
    } else {
      // Update existing state
      await ctx.db.patch(state._id, {
        lastProcessedBlock: args.blockNumber,
        lastUpdatedAt: Date.now(),
      });
    }
  },
});

/**
 * Set syncing status for a contract
 */
export const setSyncing = mutation({
  args: {
    contractId: v.id("contracts"),
    isSyncing: v.boolean(),
  },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("indexerState")
      .withIndex("by_contract", (q) => q.eq("contractId", args.contractId))
      .first();

    if (!state) {
      throw new Error("Indexer state not found");
    }

    await ctx.db.patch(state._id, {
      isSyncing: args.isSyncing,
      lastUpdatedAt: Date.now(),
    });
  },
});
