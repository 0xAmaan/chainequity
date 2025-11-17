"use client";

import { client } from "./client";
import { getChainById } from "./contract";
import { useContract } from "./contract-context";
import { parseEventsFromReceipt } from "./event-parser";
import { useMutation } from "convex/react";
import { waitForReceipt } from "thirdweb";

import { api } from "@/convex/_generated/api";

/**
 * Hook to provide event indexing functions
 * Parses blockchain events and writes them to Convex for immediate display
 */
export const useIndexEvents = () => {
  const { contractAddress, contractData } = useContract();

  // Convex mutations
  const insertTransfer = useMutation(api.mutations.transfers.insert);
  const updateBalance = useMutation(api.mutations.transfers.updateBalance);
  const addToAllowlist = useMutation(api.mutations.allowlist.add);
  const removeFromAllowlist = useMutation(api.mutations.allowlist.remove);
  const insertStockSplit = useMutation(api.mutations.events.insertStockSplit);
  const insertMetadataChange = useMutation(api.mutations.events.insertMetadataChange);
  const insertBuyback = useMutation(api.mutations.events.insertBuyback);
  const updateContractMetadata = useMutation(api.mutations.contracts.updateMetadata);

  /**
   * Index transfer events from a transaction hash
   */
  const indexTransferEvents = async (txHash: `0x${string}`): Promise<void> => {
    if (!contractAddress || !contractData) {
      console.warn("No contract data available for indexing");
      return;
    }

    try {
      // Get transaction receipt
      const receipt = await waitForReceipt({
        client,
        chain: getChainById(contractData.chainId),
        transactionHash: txHash,
      });

      // Parse events from receipt
      const events = parseEventsFromReceipt(receipt);

      // Process Transfer events
      for (const event of events) {
        if (event.eventName === "Transfer") {
          try {
            const blockNumber = event.blockNumber.toString();
            const amount = event.args.value.toString();
            const fromAddress = event.args.from.toLowerCase();
            const toAddress = event.args.to.toLowerCase();

            // Insert transfer event
            await insertTransfer({
              contractId: contractData._id as any,
              fromAddress,
              toAddress,
              amount,
              blockNumber,
              blockTimestamp: Date.now(),
              txHash: event.transactionHash.toLowerCase(),
              logIndex: event.logIndex,
            });

            // Update balances
            // Debit sender (unless it's a mint from zero address)
            if (fromAddress !== "0x0000000000000000000000000000000000000000") {
              await updateBalance({
                contractId: contractData._id as any,
                address: fromAddress,
                amount,
                isCredit: false,
                blockNumber,
              });
            }

            // Credit recipient (unless it's a burn to zero address)
            if (toAddress !== "0x0000000000000000000000000000000000000000") {
              await updateBalance({
                contractId: contractData._id as any,
                address: toAddress,
                amount,
                isCredit: true,
                blockNumber,
              });
            }
          } catch (error) {
            console.error("Failed to index transfer event:", error);
          }
        }
      }

      console.log(
        `✅ Indexed ${events.filter((e) => e.eventName === "Transfer").length} Transfer events`,
      );
    } catch (error) {
      console.error("Failed to index transfer events:", error);
    }
  };

  /**
   * Index allowlist events from a transaction hash
   */
  const indexAllowlistEvents = async (txHash: `0x${string}`): Promise<void> => {
    if (!contractAddress || !contractData) {
      console.warn("No contract data available for indexing");
      return;
    }

    try {
      // Get transaction receipt
      const receipt = await waitForReceipt({
        client,
        chain: getChainById(contractData.chainId),
        transactionHash: txHash,
      });

      // Parse events from receipt
      const events = parseEventsFromReceipt(receipt);

      // Process allowlist events
      for (const event of events) {
        try {
          const blockNumber = event.blockNumber.toString();

          if (event.eventName === "AddressAllowlisted") {
            await addToAllowlist({
              contractId: contractData._id as any,
              address: event.args.account.toLowerCase(),
              blockNumber,
              blockTimestamp: Date.now(),
              txHash: event.transactionHash.toLowerCase(),
            });
          } else if (event.eventName === "AddressRemovedFromAllowlist") {
            await removeFromAllowlist({
              contractId: contractData._id as any,
              address: event.args.account.toLowerCase(),
              blockNumber,
              blockTimestamp: Date.now(),
              txHash: event.transactionHash.toLowerCase(),
            });
          }
        } catch (error) {
          console.error("Failed to index allowlist event:", error);
        }
      }

      console.log(
        `✅ Indexed ${events.filter((e) => e.eventName === "AddressAllowlisted" || e.eventName === "AddressRemovedFromAllowlist").length} allowlist events`,
      );
    } catch (error) {
      console.error("Failed to index allowlist events:", error);
    }
  };

  /**
   * Index stock split events from a transaction hash
   */
  const indexStockSplitEvents = async (txHash: `0x${string}`): Promise<void> => {
    if (!contractAddress || !contractData) {
      console.warn("No contract data available for indexing");
      return;
    }

    try {
      // Get transaction receipt
      const receipt = await waitForReceipt({
        client,
        chain: getChainById(contractData.chainId),
        transactionHash: txHash,
      });

      // Parse events from receipt
      const events = parseEventsFromReceipt(receipt);

      // Process stock split events
      for (const event of events) {
        if (event.eventName === "StockSplit") {
          try {
            await insertStockSplit({
              contractId: contractData._id as any,
              multiplier: Number(event.args.multiplier),
              newTotalSupply: event.args.newTotalSupply.toString(),
              blockNumber: event.blockNumber.toString(),
              blockTimestamp: Date.now(),
              txHash: event.transactionHash.toLowerCase(),
            });
          } catch (error) {
            console.error("Failed to index stock split event:", error);
          }
        }
      }

      console.log(
        `✅ Indexed ${events.filter((e) => e.eventName === "StockSplit").length} stock split events`,
      );
    } catch (error) {
      console.error("Failed to index stock split events:", error);
    }
  };

  /**
   * Index buyback events from a transaction hash
   */
  const indexBuybackEvents = async (txHash: `0x${string}`): Promise<void> => {
    if (!contractAddress || !contractData) {
      console.warn("No contract data available for indexing");
      return;
    }

    try {
      // Get transaction receipt
      const receipt = await waitForReceipt({
        client,
        chain: getChainById(contractData.chainId),
        transactionHash: txHash,
      });

      // Parse events from receipt
      const events = parseEventsFromReceipt(receipt);

      // Process buyback events
      for (const event of events) {
        if (event.eventName === "SharesBoughtBack") {
          try {
            await insertBuyback({
              contractId: contractData._id as any,
              holderAddress: event.args.holder.toLowerCase(),
              amount: event.args.amount.toString(),
              blockNumber: event.blockNumber.toString(),
              blockTimestamp: Date.now(),
              txHash: event.transactionHash.toLowerCase(),
              logIndex: event.logIndex,
            });
          } catch (error) {
            console.error("Failed to index buyback event:", error);
          }
        }
      }

      console.log(
        `✅ Indexed ${events.filter((e) => e.eventName === "SharesBoughtBack").length} buyback events`,
      );
    } catch (error) {
      console.error("Failed to index buyback events:", error);
    }
  };

  /**
   * Index metadata change events from a transaction hash
   */
  const indexMetadataEvents = async (txHash: `0x${string}`): Promise<void> => {
    if (!contractAddress || !contractData) {
      console.warn("No contract data available for indexing");
      return;
    }

    try {
      // Get transaction receipt
      const receipt = await waitForReceipt({
        client,
        chain: getChainById(contractData.chainId),
        transactionHash: txHash,
      });

      // Parse events from receipt
      const events = parseEventsFromReceipt(receipt);

      // Process metadata change events
      for (const event of events) {
        if (event.eventName === "MetadataChanged") {
          try {
            // Insert metadata change event
            await insertMetadataChange({
              contractId: contractData._id as any,
              oldName: event.args.oldName,
              newName: event.args.newName,
              oldSymbol: event.args.oldSymbol,
              newSymbol: event.args.newSymbol,
              blockNumber: event.blockNumber.toString(),
              blockTimestamp: Date.now(),
              txHash: event.transactionHash.toLowerCase(),
            });

            // Update the contract's name and symbol in Convex
            await updateContractMetadata({
              contractId: contractData._id as any,
              name: event.args.newName,
              symbol: event.args.newSymbol,
            });
          } catch (error) {
            console.error("Failed to index metadata change event:", error);
          }
        }
      }

      console.log(
        `✅ Indexed ${events.filter((e) => e.eventName === "MetadataChanged").length} metadata change events`,
      );
    } catch (error) {
      console.error("Failed to index metadata events:", error);
    }
  };

  return {
    indexTransferEvents,
    indexAllowlistEvents,
    indexStockSplitEvents,
    indexBuybackEvents,
    indexMetadataEvents,
  };
};
