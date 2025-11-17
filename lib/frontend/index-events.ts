"use client";

import { useContract } from "./contract-context";

/**
 * Hook to provide event indexing functions
 *
 * Note: The backend indexer will automatically pick up events from the blockchain.
 * These functions are provided for potential immediate indexing triggers in the future.
 */
export const useIndexEvents = () => {
  const { contractAddress } = useContract();

  /**
   * Index transfer events from a transaction hash
   * Currently a no-op as the backend indexer handles this automatically
   */
  const indexTransferEvents = async (txHash: `0x${string}`): Promise<void> => {
    if (!contractAddress) {
      console.warn("No contract address available for indexing");
      return;
    }

    // Log that indexing was requested (backend indexer will handle it)
    console.log(`Transfer events indexing requested for tx: ${txHash}`);

    // TODO: In the future, this could make an API call to trigger immediate indexing
    // For now, the backend indexer will pick up events automatically
  };

  /**
   * Index allowlist events from a transaction hash
   * Currently a no-op as the backend indexer handles this automatically
   */
  const indexAllowlistEvents = async (txHash: `0x${string}`): Promise<void> => {
    if (!contractAddress) {
      console.warn("No contract address available for indexing");
      return;
    }

    // Log that indexing was requested (backend indexer will handle it)
    console.log(`Allowlist events indexing requested for tx: ${txHash}`);

    // TODO: In the future, this could make an API call to trigger immediate indexing
    // For now, the backend indexer will pick up events automatically
  };

  return {
    indexTransferEvents,
    indexAllowlistEvents,
  };
};
