import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get dashboard statistics for a contract
 */
export const getStats = query({
  args: {
    contractId: v.id("contracts"),
  },
  handler: async (ctx, args) => {
    // Get total supply and holder count from balances
    const balances = await ctx.db
      .query("balances")
      .withIndex("by_contract", (q) => q.eq("contractId", args.contractId))
      .collect();

    const nonZeroBalances = balances.filter((b) => BigInt(b.balance) > BigInt(0));

    const totalSupply = nonZeroBalances.reduce(
      (sum, b) => sum + BigInt(b.balance),
      BigInt(0),
    );

    const totalHolders = nonZeroBalances.length;

    // Get top holder percentage
    let topHolderPercentage = 0;
    if (nonZeroBalances.length > 0 && totalSupply > BigInt(0)) {
      const sortedBalances = nonZeroBalances.sort((a, b) => {
        const balanceA = BigInt(a.balance);
        const balanceB = BigInt(b.balance);
        if (balanceA > balanceB) return -1;
        if (balanceA < balanceB) return 1;
        return 0;
      });

      const topBalance = BigInt(sortedBalances[0].balance);
      topHolderPercentage = Number((topBalance * BigInt(10000)) / totalSupply) / 100;
    }

    // Get indexer state for latest block
    const indexerState = await ctx.db
      .query("indexerState")
      .withIndex("by_contract", (q) => q.eq("contractId", args.contractId))
      .first();

    const latestBlock = indexerState ? indexerState.lastProcessedBlock : "0";

    // Get recent activity count (all event types in last 24 hours)
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
    const allEvents: Array<{ timestamp: Date }> = [];

    // Fetch transfers from last 24 hours
    const transfers = await ctx.db
      .query("transfers")
      .withIndex("by_contract_and_timestamp", (q) =>
        q.eq("contractId", args.contractId),
      )
      .order("desc")
      .take(100); // Take more to filter by time

    transfers.forEach((t) => {
      const timestamp = new Date(t.blockTimestamp).getTime();
      if (timestamp >= twentyFourHoursAgo) {
        allEvents.push({ timestamp: new Date(t.blockTimestamp) });
      }
    });

    // Fetch stock splits from last 24 hours
    const stockSplits = await ctx.db
      .query("stockSplits")
      .withIndex("by_contract_and_block", (q) => q.eq("contractId", args.contractId))
      .order("desc")
      .take(100);

    stockSplits.forEach((s) => {
      const timestamp = new Date(s.blockTimestamp).getTime();
      if (timestamp >= twentyFourHoursAgo) {
        allEvents.push({ timestamp: new Date(s.blockTimestamp) });
      }
    });

    // Fetch buybacks from last 24 hours
    const buybacks = await ctx.db
      .query("buybacks")
      .withIndex("by_contract_and_block", (q) => q.eq("contractId", args.contractId))
      .order("desc")
      .take(100);

    buybacks.forEach((b) => {
      const timestamp = new Date(b.blockTimestamp).getTime();
      if (timestamp >= twentyFourHoursAgo) {
        allEvents.push({ timestamp: new Date(b.blockTimestamp) });
      }
    });

    // Fetch metadata changes from last 24 hours
    const metadataChanges = await ctx.db
      .query("metadataChanges")
      .withIndex("by_contract_and_block", (q) => q.eq("contractId", args.contractId))
      .order("desc")
      .take(100);

    metadataChanges.forEach((m) => {
      const timestamp = new Date(m.blockTimestamp).getTime();
      if (timestamp >= twentyFourHoursAgo) {
        allEvents.push({ timestamp: new Date(m.blockTimestamp) });
      }
    });

    // Fetch allowlist additions from last 24 hours
    const allowlistAdditions = await ctx.db
      .query("allowlist")
      .withIndex("by_contract", (q) => q.eq("contractId", args.contractId))
      .filter((q) => q.eq(q.field("isAllowlisted"), true))
      .take(100);

    allowlistAdditions.forEach((a) => {
      if (a.addedAt) {
        const timestamp = new Date(a.addedAt).getTime();
        if (timestamp >= twentyFourHoursAgo) {
          allEvents.push({ timestamp: new Date(a.addedAt) });
        }
      }
    });

    // Fetch allowlist removals from last 24 hours
    const allowlistRemovals = await ctx.db
      .query("allowlist")
      .withIndex("by_contract", (q) => q.eq("contractId", args.contractId))
      .filter((q) => q.eq(q.field("isAllowlisted"), false))
      .take(100);

    allowlistRemovals.forEach((a) => {
      if (a.removedAt) {
        const timestamp = new Date(a.removedAt).getTime();
        if (timestamp >= twentyFourHoursAgo) {
          allEvents.push({ timestamp: new Date(a.removedAt) });
        }
      }
    });

    const recentActivityCount = allEvents.length;

    // Get recent activity (last 10 events) for backward compatibility
    const recentTransfers = transfers.slice(0, 10);
    const recentActivity = recentTransfers.map((t) => ({
      eventType: "transfer",
      fromAddress: t.fromAddress,
      toAddress: t.toAddress,
      amount: t.amount,
      blockNumber: t.blockNumber,
      timestamp: t.blockTimestamp,
      txHash: t.txHash,
    }));

    return {
      total_supply: totalSupply.toString(),
      total_holders: totalHolders,
      top_holder_percentage: topHolderPercentage.toString(),
      latest_block: latestBlock,
      recent_activity_count: recentActivityCount,
      recent_activity: recentActivity,
    };
  },
});
