import { mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Add an address to the allowlist
 */
export const add = mutation({
  args: {
    contractId: v.id("contracts"),
    address: v.string(),
    blockNumber: v.string(),
    blockTimestamp: v.number(),
    txHash: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if address already exists in allowlist
    const existing = await ctx.db
      .query("allowlist")
      .withIndex("by_contract_and_address", (q) =>
        q.eq("contractId", args.contractId).eq("address", args.address),
      )
      .first();

    if (existing) {
      // Update existing entry (in case it was previously removed)
      await ctx.db.patch(existing._id, {
        isAllowlisted: true,
        addedAt: args.blockTimestamp,
        addedAtBlock: args.blockNumber,
        removedAt: undefined,
        removedAtBlock: undefined,
        txHash: args.txHash,
      });
    } else {
      // Create new allowlist entry
      await ctx.db.insert("allowlist", {
        contractId: args.contractId,
        address: args.address,
        isAllowlisted: true,
        addedAt: args.blockTimestamp,
        addedAtBlock: args.blockNumber,
        txHash: args.txHash,
      });
    }
  },
});

/**
 * Remove an address from the allowlist
 */
export const remove = mutation({
  args: {
    contractId: v.id("contracts"),
    address: v.string(),
    blockNumber: v.string(),
    blockTimestamp: v.number(),
    txHash: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("allowlist")
      .withIndex("by_contract_and_address", (q) =>
        q.eq("contractId", args.contractId).eq("address", args.address),
      )
      .first();

    if (!existing) {
      // Should not happen, but create entry marked as not allowlisted
      await ctx.db.insert("allowlist", {
        contractId: args.contractId,
        address: args.address,
        isAllowlisted: false,
        addedAt: args.blockTimestamp,
        addedAtBlock: args.blockNumber,
        removedAt: args.blockTimestamp,
        removedAtBlock: args.blockNumber,
        txHash: args.txHash,
      });
    } else {
      // Mark as removed
      await ctx.db.patch(existing._id, {
        isAllowlisted: false,
        removedAt: args.blockTimestamp,
        removedAtBlock: args.blockNumber,
        txHash: args.txHash,
      });
    }
  },
});
