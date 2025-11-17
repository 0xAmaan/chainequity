import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get current cap table (ownership distribution) for a contract
 * Returns: array of { address, balance, ownershipPercentage, isAllowlisted }
 */
export const getCurrent = query({
  args: {
    contractId: v.id("contracts"),
  },
  handler: async (ctx, args) => {
    // Get all balances for this contract
    const balances = await ctx.db
      .query("balances")
      .withIndex("by_contract", (q) => q.eq("contractId", args.contractId))
      .collect();

    // Filter out zero balances
    const nonZeroBalances = balances.filter((b) => b.balance !== "0");

    if (nonZeroBalances.length === 0) {
      return [];
    }

    // Calculate total supply using BigInt
    const totalSupply = nonZeroBalances.reduce(
      (sum, b) => sum + BigInt(b.balance),
      BigInt(0),
    );

    // Get all allowlist entries for these addresses
    const allowlistMap = new Map<string, boolean>();
    const allowlistEntries = await ctx.db
      .query("allowlist")
      .withIndex("by_contract", (q) => q.eq("contractId", args.contractId))
      .collect();

    allowlistEntries.forEach((entry) => {
      allowlistMap.set(entry.address.toLowerCase(), entry.isAllowlisted);
    });

    // Build cap table with ownership percentages
    const capTable = nonZeroBalances.map((balance) => {
      const balanceBigInt = BigInt(balance.balance);
      const ownershipPercentage =
        totalSupply > BigInt(0)
          ? Number((balanceBigInt * BigInt(10000)) / totalSupply) / 100
          : 0;

      return {
        address: balance.address,
        balance: balance.balance,
        ownership_percentage: ownershipPercentage,
        is_allowlisted: allowlistMap.get(balance.address.toLowerCase()) || false,
      };
    });

    // Sort by balance descending
    capTable.sort((a, b) => {
      const balanceA = BigInt(a.balance);
      const balanceB = BigInt(b.balance);
      if (balanceA > balanceB) return -1;
      if (balanceA < balanceB) return 1;
      return 0;
    });

    return capTable;
  },
});

/**
 * Get cap table at a specific block (historical reconstruction)
 * This is computationally expensive for large transfer histories
 */
export const getAtBlock = query({
  args: {
    contractId: v.id("contracts"),
    blockNumber: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all transfers up to and including the specified block
    const transfers = await ctx.db
      .query("transfers")
      .withIndex("by_contract_and_block", (q) => q.eq("contractId", args.contractId))
      .collect();

    // Filter transfers at or before the specified block
    const relevantTransfers = transfers.filter(
      (t) => BigInt(t.blockNumber) <= BigInt(args.blockNumber),
    );

    // Calculate balances at this block
    const balanceMap = new Map<string, bigint>();
    const zeroAddress = "0x0000000000000000000000000000000000000000";

    for (const transfer of relevantTransfers) {
      const amount = BigInt(transfer.amount);

      // Debit from sender (unless it's a mint from zero address)
      if (transfer.fromAddress.toLowerCase() !== zeroAddress.toLowerCase()) {
        const currentFrom =
          balanceMap.get(transfer.fromAddress.toLowerCase()) || BigInt(0);
        balanceMap.set(transfer.fromAddress.toLowerCase(), currentFrom - amount);
      }

      // Credit to receiver (unless it's a burn to zero address)
      if (transfer.toAddress.toLowerCase() !== zeroAddress.toLowerCase()) {
        const currentTo =
          balanceMap.get(transfer.toAddress.toLowerCase()) || BigInt(0);
        balanceMap.set(transfer.toAddress.toLowerCase(), currentTo + amount);
      }
    }

    // Filter out zero balances
    const nonZeroBalances = Array.from(balanceMap.entries())
      .filter(([_, balance]) => balance > BigInt(0))
      .map(([address, balance]) => ({
        address,
        balance: balance.toString(),
      }));

    if (nonZeroBalances.length === 0) {
      return [];
    }

    // Calculate total supply
    const totalSupply = nonZeroBalances.reduce(
      (sum, b) => sum + BigInt(b.balance),
      BigInt(0),
    );

    // Get allowlist status at this block
    const allowlistMap = new Map<string, boolean>();
    const allowlistEntries = await ctx.db
      .query("allowlist")
      .withIndex("by_block", (q) => q.eq("contractId", args.contractId))
      .collect();

    allowlistEntries.forEach((entry) => {
      const addedAtBlock = BigInt(entry.addedAtBlock);
      const removedAtBlock = entry.removedAtBlock
        ? BigInt(entry.removedAtBlock)
        : null;
      const queryBlock = BigInt(args.blockNumber);

      // Check if address was allowlisted at the query block
      const wasAdded = addedAtBlock <= queryBlock;
      const wasRemoved = removedAtBlock !== null && removedAtBlock <= queryBlock;

      if (wasAdded && !wasRemoved) {
        allowlistMap.set(entry.address.toLowerCase(), true);
      }
    });

    // Build cap table
    const capTable = nonZeroBalances.map((item) => {
      const balanceBigInt = BigInt(item.balance);
      const ownershipPercentage =
        totalSupply > BigInt(0)
          ? Number((balanceBigInt * BigInt(10000)) / totalSupply) / 100
          : 0;

      return {
        address: item.address,
        balance: item.balance,
        ownershipPercentage,
        isAllowlisted: allowlistMap.get(item.address.toLowerCase()) || false,
      };
    });

    // Sort by balance descending
    capTable.sort((a, b) => {
      const balanceA = BigInt(a.balance);
      const balanceB = BigInt(b.balance);
      if (balanceA > balanceB) return -1;
      if (balanceA < balanceB) return 1;
      return 0;
    });

    return capTable;
  },
});

/**
 * Get total supply for a contract
 */
export const getTotalSupply = query({
  args: {
    contractId: v.id("contracts"),
  },
  handler: async (ctx, args) => {
    const balances = await ctx.db
      .query("balances")
      .withIndex("by_contract", (q) => q.eq("contractId", args.contractId))
      .collect();

    const totalSupply = balances.reduce(
      (sum, b) => sum + BigInt(b.balance),
      BigInt(0),
    );

    return totalSupply.toString();
  },
});
