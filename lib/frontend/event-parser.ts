"use client";

import contractData from "../GatedEquityToken.abi.json";
import { type TransactionReceipt } from "thirdweb";
import { decodeEventLog } from "viem";

const CONTRACT_ABI = contractData.abi as any;

/**
 * Parsed event types
 */
export type TransferEvent = {
  eventName: "Transfer";
  args: {
    from: string;
    to: string;
    value: bigint;
  };
  blockNumber: bigint;
  transactionHash: string;
  logIndex: number;
};

export type AddressAllowlistedEvent = {
  eventName: "AddressAllowlisted";
  args: {
    account: string;
  };
  blockNumber: bigint;
  transactionHash: string;
  logIndex: number;
};

export type AddressRemovedFromAllowlistEvent = {
  eventName: "AddressRemovedFromAllowlist";
  args: {
    account: string;
  };
  blockNumber: bigint;
  transactionHash: string;
  logIndex: number;
};

export type StockSplitEvent = {
  eventName: "StockSplit";
  args: {
    multiplier: bigint;
    newTotalSupply: bigint;
    timestamp: bigint;
  };
  blockNumber: bigint;
  transactionHash: string;
  logIndex: number;
};

export type MetadataChangedEvent = {
  eventName: "MetadataChanged";
  args: {
    oldName: string;
    newName: string;
    oldSymbol: string;
    newSymbol: string;
  };
  blockNumber: bigint;
  transactionHash: string;
  logIndex: number;
};

export type SharesBoughtBackEvent = {
  eventName: "SharesBoughtBack";
  args: {
    holder: string;
    amount: bigint;
    timestamp: bigint;
  };
  blockNumber: bigint;
  transactionHash: string;
  logIndex: number;
};

export type ParsedEvent =
  | TransferEvent
  | AddressAllowlistedEvent
  | AddressRemovedFromAllowlistEvent
  | StockSplitEvent
  | MetadataChangedEvent
  | SharesBoughtBackEvent;

/**
 * Parse events from a transaction receipt
 *
 * @param receipt - Transaction receipt from thirdweb
 * @returns Array of parsed events
 */
export const parseEventsFromReceipt = (receipt: TransactionReceipt): ParsedEvent[] => {
  const parsedEvents: ParsedEvent[] = [];

  if (!receipt.logs) {
    return parsedEvents;
  }

  for (const log of receipt.logs) {
    try {
      // Decode the event log using viem
      const decoded = decodeEventLog({
        abi: CONTRACT_ABI,
        data: log.data as `0x${string}`,
        topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
      });

      const eventName = decoded.eventName as string;

      // Filter for events we care about
      if (
        eventName === "Transfer" ||
        eventName === "AddressAllowlisted" ||
        eventName === "AddressRemovedFromAllowlist" ||
        eventName === "StockSplit" ||
        eventName === "MetadataChanged" ||
        eventName === "SharesBoughtBack"
      ) {
        parsedEvents.push({
          eventName: eventName as any,
          args: decoded.args as any,
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          logIndex: log.logIndex,
        } as ParsedEvent);
      }
    } catch (error) {
      // Skip logs that don't match our ABI (could be from other contracts)
      console.debug("Could not decode log:", error);
      continue;
    }
  }

  return parsedEvents;
};
