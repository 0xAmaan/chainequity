import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get recent activity for a contract (unified event feed)
 * Combines transfers, allowlist changes, stock splits, buybacks, and metadata changes
 */
export const getRecent = query({
  args: {
    contractId: v.id("contracts"),
    limit: v.optional(v.number()),
    eventType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;
    const allEvents: Array<{
      event_type: string;
      from_address: string | null;
      to_address: string | null;
      amount: string | null;
      block_number: string;
      timestamp: string;
      tx_hash: string;
      metadata: any;
    }> = [];

    // Fetch transfers
    if (!args.eventType || args.eventType === "all" || args.eventType === "transfer") {
      const transfers = await ctx.db
        .query("transfers")
        .withIndex("by_contract_and_timestamp", (q) =>
          q.eq("contractId", args.contractId),
        )
        .order("desc")
        .take(limit);

      transfers.forEach((t) => {
        allEvents.push({
          event_type: "transfer",
          from_address: t.fromAddress,
          to_address: t.toAddress,
          amount: t.amount,
          block_number: t.blockNumber,
          timestamp: new Date(t.blockTimestamp).toISOString(),
          tx_hash: t.txHash,
          metadata: { logIndex: t.logIndex },
        });
      });
    }

    // Fetch allowlist additions
    if (
      !args.eventType ||
      args.eventType === "all" ||
      args.eventType === "allowlist_added"
    ) {
      const additions = await ctx.db
        .query("allowlist")
        .withIndex("by_contract", (q) => q.eq("contractId", args.contractId))
        .filter((q) => q.eq(q.field("isAllowlisted"), true))
        .take(limit);

      additions.forEach((a) => {
        allEvents.push({
          event_type: "allowlist_added",
          from_address: a.address,
          to_address: null,
          amount: null,
          block_number: a.addedAtBlock,
          timestamp: new Date(a.addedAt).toISOString(),
          tx_hash: a.txHash,
          metadata: {},
        });
      });
    }

    // Fetch allowlist removals
    if (
      !args.eventType ||
      args.eventType === "all" ||
      args.eventType === "allowlist_removed"
    ) {
      const removals = await ctx.db
        .query("allowlist")
        .withIndex("by_contract", (q) => q.eq("contractId", args.contractId))
        .filter((q) => q.eq(q.field("isAllowlisted"), false))
        .take(limit);

      removals.forEach((a) => {
        if (a.removedAt && a.removedAtBlock) {
          allEvents.push({
            event_type: "allowlist_removed",
            from_address: a.address,
            to_address: null,
            amount: null,
            block_number: a.removedAtBlock,
            timestamp: new Date(a.removedAt).toISOString(),
            tx_hash: a.txHash,
            metadata: {},
          });
        }
      });
    }

    // Fetch stock splits
    if (
      !args.eventType ||
      args.eventType === "all" ||
      args.eventType === "stock_split"
    ) {
      const stockSplits = await ctx.db
        .query("stockSplits")
        .withIndex("by_contract_and_block", (q) => q.eq("contractId", args.contractId))
        .order("desc")
        .take(limit);

      stockSplits.forEach((s) => {
        allEvents.push({
          event_type: "stock_split",
          from_address: null,
          to_address: null,
          amount: s.newTotalSupply,
          block_number: s.blockNumber,
          timestamp: new Date(s.blockTimestamp).toISOString(),
          tx_hash: s.txHash,
          metadata: {
            multiplier: s.multiplier,
            newTotalSupply: s.newTotalSupply,
            affected_holders: s.affectedHolders,
          },
        });
      });
    }

    // Fetch buybacks
    if (!args.eventType || args.eventType === "all" || args.eventType === "buyback") {
      const buybacks = await ctx.db
        .query("buybacks")
        .withIndex("by_contract_and_block", (q) => q.eq("contractId", args.contractId))
        .order("desc")
        .take(limit);

      buybacks.forEach((b) => {
        allEvents.push({
          event_type: "buyback",
          from_address: b.holderAddress,
          to_address: null,
          amount: b.amount,
          block_number: b.blockNumber,
          timestamp: new Date(b.blockTimestamp).toISOString(),
          tx_hash: b.txHash,
          metadata: { logIndex: b.logIndex },
        });
      });
    }

    // Fetch metadata changes
    if (
      !args.eventType ||
      args.eventType === "all" ||
      args.eventType === "metadata_change"
    ) {
      const metadataChanges = await ctx.db
        .query("metadataChanges")
        .withIndex("by_contract_and_block", (q) => q.eq("contractId", args.contractId))
        .order("desc")
        .take(limit);

      metadataChanges.forEach((m) => {
        allEvents.push({
          event_type: "metadata_change",
          from_address: null,
          to_address: null,
          amount: null,
          block_number: m.blockNumber,
          timestamp: new Date(m.blockTimestamp).toISOString(),
          tx_hash: m.txHash,
          metadata: {
            old_name: m.oldName,
            new_name: m.newName,
            old_symbol: m.oldSymbol,
            new_symbol: m.newSymbol,
          },
        });
      });
    }

    // Sort all events by timestamp descending
    allEvents.sort((a, b) => {
      // Compare timestamps (ISO strings can be compared directly)
      if (a.timestamp > b.timestamp) return -1;
      if (a.timestamp < b.timestamp) return 1;
      // If same timestamp, sort by block number
      const blockA = BigInt(a.block_number);
      const blockB = BigInt(b.block_number);
      if (blockA > blockB) return -1;
      if (blockA < blockB) return 1;
      return 0;
    });

    // Return limited results
    return allEvents.slice(0, limit);
  },
});
