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

    // Get recent activity (last 10 events)
    const transfers = await ctx.db
      .query("transfers")
      .withIndex("by_contract_and_timestamp", (q) =>
        q.eq("contractId", args.contractId),
      )
      .order("desc")
      .take(10);

    const recentActivity = transfers.map((t) => ({
      eventType: "transfer",
      fromAddress: t.fromAddress,
      toAddress: t.toAddress,
      amount: t.amount,
      blockNumber: t.blockNumber,
      timestamp: t.blockTimestamp,
      txHash: t.txHash,
    }));

    return {
      totalSupply: totalSupply.toString(),
      totalHolders,
      topHolderPercentage,
      latestBlock,
      recentActivity,
    };
  },
});
