import { mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Insert a transfer event
 */
export const insert = mutation({
  args: {
    contractId: v.id("contracts"),
    fromAddress: v.string(),
    toAddress: v.string(),
    amount: v.string(),
    blockNumber: v.string(),
    blockTimestamp: v.number(),
    txHash: v.string(),
    logIndex: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if transfer already exists (idempotency)
    const existing = await ctx.db
      .query("transfers")
      .withIndex("by_tx", (q) =>
        q
          .eq("contractId", args.contractId)
          .eq("txHash", args.txHash)
          .eq("logIndex", args.logIndex),
      )
      .first();

    if (existing) {
      // Already processed, skip
      return existing._id;
    }

    // Insert transfer
    const transferId = await ctx.db.insert("transfers", args);

    return transferId;
  },
});

/**
 * Update balance for an address
 * This mimics the PostgreSQL update_balance() function
 */
export const updateBalance = mutation({
  args: {
    contractId: v.id("contracts"),
    address: v.string(),
    amount: v.string(),
    isCredit: v.boolean(),
    blockNumber: v.string(),
  },
  handler: async (ctx, args) => {
    // Get existing balance
    const existing = await ctx.db
      .query("balances")
      .withIndex("by_contract_and_address", (q) =>
        q.eq("contractId", args.contractId).eq("address", args.address),
      )
      .first();

    // Calculate new balance using BigInt
    const amountBigInt = BigInt(args.amount);
    const currentBalance = existing ? BigInt(existing.balance) : BigInt(0);

    let newBalance: bigint;
    if (args.isCredit) {
      newBalance = currentBalance + amountBigInt;
    } else {
      newBalance = currentBalance - amountBigInt;
      if (newBalance < BigInt(0)) {
        throw new Error(
          `Insufficient balance for ${args.address}: attempted to debit ${args.amount} from ${currentBalance.toString()}`,
        );
      }
    }

    if (existing) {
      // Update existing balance
      await ctx.db.patch(existing._id, {
        balance: newBalance.toString(),
        lastUpdatedBlock: args.blockNumber,
        lastUpdatedAt: Date.now(),
      });
    } else {
      // Create new balance entry
      await ctx.db.insert("balances", {
        contractId: args.contractId,
        address: args.address,
        balance: newBalance.toString(),
        lastUpdatedBlock: args.blockNumber,
        lastUpdatedAt: Date.now(),
      });
    }
  },
});
