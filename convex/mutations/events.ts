import { mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Insert a stock split event
 */
export const insertStockSplit = mutation({
  args: {
    contractId: v.id("contracts"),
    multiplier: v.number(),
    newTotalSupply: v.string(),
    blockNumber: v.string(),
    blockTimestamp: v.number(),
    txHash: v.string(),
    affectedHolders: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if event already exists (idempotency)
    const existing = await ctx.db
      .query("stockSplits")
      .withIndex("by_tx", (q) =>
        q.eq("contractId", args.contractId).eq("txHash", args.txHash),
      )
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("stockSplits", args);
  },
});

/**
 * Insert a metadata change event
 */
export const insertMetadataChange = mutation({
  args: {
    contractId: v.id("contracts"),
    oldName: v.string(),
    newName: v.string(),
    oldSymbol: v.string(),
    newSymbol: v.string(),
    blockNumber: v.string(),
    blockTimestamp: v.number(),
    txHash: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if event already exists (idempotency)
    const existing = await ctx.db
      .query("metadataChanges")
      .withIndex("by_tx", (q) =>
        q.eq("contractId", args.contractId).eq("txHash", args.txHash),
      )
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("metadataChanges", args);
  },
});

/**
 * Insert a buyback event
 */
export const insertBuyback = mutation({
  args: {
    contractId: v.id("contracts"),
    holderAddress: v.string(),
    amount: v.string(),
    blockNumber: v.string(),
    blockTimestamp: v.number(),
    txHash: v.string(),
    logIndex: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if event already exists (idempotency)
    const existing = await ctx.db
      .query("buybacks")
      .withIndex("by_tx", (q) =>
        q
          .eq("contractId", args.contractId)
          .eq("txHash", args.txHash)
          .eq("logIndex", args.logIndex),
      )
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("buybacks", args);
  },
});
