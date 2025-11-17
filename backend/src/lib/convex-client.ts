import { api } from "../../../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

// Initialize Convex client with deployment URL
const convexUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error(
    "CONVEX_URL or NEXT_PUBLIC_CONVEX_URL environment variable must be set",
  );
}

export const convexClient = new ConvexHttpClient(convexUrl);

// Re-export API for convenience
export { api };

/**
 * Convex client for the indexer
 * This provides a simple interface for writing blockchain events to Convex
 */
export class ConvexIndexerClient {
  private client: ConvexHttpClient;

  constructor() {
    this.client = convexClient;
  }

  /**
   * Upsert a contract
   */
  async upsertContract(args: {
    contractAddress: string;
    name: string;
    symbol: string;
    decimals: number;
    chainId: number;
    deployedAt: number;
    deployedBy?: string;
  }) {
    return await this.client.mutation(api.mutations.contracts.upsert, args);
  }

  /**
   * Update indexer state
   */
  async updateIndexerState(contractId: any, blockNumber: string) {
    return await this.client.mutation(api.mutations.indexer.updateState, {
      contractId,
      blockNumber,
    });
  }

  /**
   * Set indexer syncing status
   */
  async setIndexerSyncing(contractId: any, isSyncing: boolean) {
    return await this.client.mutation(api.mutations.indexer.setSyncing, {
      contractId,
      isSyncing,
    });
  }

  /**
   * Add address to allowlist
   */
  async addToAllowlist(args: {
    contractId: any;
    address: string;
    blockNumber: string;
    blockTimestamp: number;
    txHash: string;
  }) {
    return await this.client.mutation(api.mutations.allowlist.add, args);
  }

  /**
   * Remove address from allowlist
   */
  async removeFromAllowlist(args: {
    contractId: any;
    address: string;
    blockNumber: string;
    blockTimestamp: number;
    txHash: string;
  }) {
    return await this.client.mutation(api.mutations.allowlist.remove, args);
  }

  /**
   * Insert a transfer event
   */
  async insertTransfer(args: {
    contractId: any;
    fromAddress: string;
    toAddress: string;
    amount: string;
    blockNumber: string;
    blockTimestamp: number;
    txHash: string;
    logIndex: number;
  }) {
    return await this.client.mutation(api.mutations.transfers.insert, args);
  }

  /**
   * Update balance for an address
   */
  async updateBalance(args: {
    contractId: any;
    address: string;
    amount: string;
    isCredit: boolean;
    blockNumber: string;
  }) {
    return await this.client.mutation(api.mutations.transfers.updateBalance, args);
  }

  /**
   * Insert a stock split event
   */
  async insertStockSplit(args: {
    contractId: any;
    multiplier: number;
    newTotalSupply: string;
    blockNumber: string;
    blockTimestamp: number;
    txHash: string;
    affectedHolders?: number;
  }) {
    return await this.client.mutation(api.mutations.events.insertStockSplit, args);
  }

  /**
   * Insert a metadata change event
   */
  async insertMetadataChange(args: {
    contractId: any;
    oldName: string;
    newName: string;
    oldSymbol: string;
    newSymbol: string;
    blockNumber: string;
    blockTimestamp: number;
    txHash: string;
  }) {
    return await this.client.mutation(api.mutations.events.insertMetadataChange, args);
  }

  /**
   * Insert a buyback event
   */
  async insertBuyback(args: {
    contractId: any;
    holderAddress: string;
    amount: string;
    blockNumber: string;
    blockTimestamp: number;
    txHash: string;
    logIndex: number;
  }) {
    return await this.client.mutation(api.mutations.events.insertBuyback, args);
  }

  /**
   * Get contract by address
   */
  async getContractByAddress(contractAddress: string) {
    return await this.client.query(api.contracts.getByAddress, {
      contractAddress: contractAddress.toLowerCase(),
    });
  }

  /**
   * Get all active contracts
   */
  async getActiveContracts() {
    return await this.client.query(api.contracts.list, {});
  }

  /**
   * Get indexer state for a contract
   */
  async getIndexerState(contractId: any) {
    return await this.client.query(api.contracts.getIndexerState, {
      contractId,
    });
  }
}

// Export singleton instance
export const convexIndexer = new ConvexIndexerClient();
