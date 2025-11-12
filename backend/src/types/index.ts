/**
 * Shared TypeScript types for ChainEquity backend
 */

import type { Address, Hash, Log } from "viem";

// Database types
export interface AllowlistEntry {
  address: string;
  is_allowlisted: boolean;
  added_at: Date;
  added_at_block: bigint;
  removed_at?: Date;
  removed_at_block?: bigint;
  tx_hash: string;
}

export interface TransferEvent {
  id?: number;
  from_address: string;
  to_address: string;
  amount: string;
  block_number: bigint;
  block_timestamp: Date;
  tx_hash: string;
  log_index: number;
}

export interface Balance {
  address: string;
  balance: string;
  last_updated_block: bigint;
  last_updated_at: Date;
}

export interface StockSplit {
  id?: number;
  multiplier: number;
  new_total_supply: string;
  block_number: bigint;
  block_timestamp: Date;
  tx_hash: string;
  affected_holders: number;
}

export interface MetadataChange {
  id?: number;
  old_name: string;
  new_name: string;
  old_symbol: string;
  new_symbol: string;
  block_number: bigint;
  block_timestamp: Date;
  tx_hash: string;
}

export interface BuybackEvent {
  id?: number;
  holder_address: string;
  amount: string;
  block_number: bigint;
  block_timestamp: Date;
  tx_hash: string;
  log_index: number;
}

export interface CapTableEntry {
  address: string;
  balance: string;
  ownership_percentage: number;
  last_updated_block?: bigint;
  last_updated_at?: Date;
  is_allowlisted?: boolean;
}

export interface IndexerState {
  id: number;
  last_processed_block: bigint;
  last_updated_at: Date;
  is_syncing: boolean;
  contract_address: string;
}

// Blockchain event types
export interface ContractEvent {
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: Hash;
  logIndex: number;
}

export interface TransferEventData extends ContractEvent {
  from: Address;
  to: Address;
  value: bigint;
}

export interface AddressAllowlistedEventData extends ContractEvent {
  account: Address;
}

export interface AddressRemovedFromAllowlistEventData extends ContractEvent {
  account: Address;
}

export interface StockSplitEventData extends ContractEvent {
  multiplier: bigint;
  newTotalSupply: bigint;
  timestamp: bigint;
}

export interface MetadataChangedEventData extends ContractEvent {
  oldName: string;
  newName: string;
  oldSymbol: string;
  newSymbol: string;
}

export interface SharesBoughtBackEventData extends ContractEvent {
  holder: Address;
  amount: bigint;
  timestamp: bigint;
}

// Configuration
export interface Config {
  rpcUrl: string;
  chainId: number;
  contractAddress: Address | null;
  privateKey: Hash;
  database: {
    url: string;
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
  };
  indexer: {
    startBlock: bigint;
    pollInterval: number;
    batchSize: number;
  };
  logLevel: string;
}

// CLI types
export interface CLIOptions {
  rpc?: string;
  contract?: string;
  privateKey?: string;
}

export interface MintOptions extends CLIOptions {
  amount: string;
  to: string;
}

export interface SplitOptions extends CLIOptions {
  multiplier: number;
}

export interface MetadataOptions extends CLIOptions {
  name: string;
  symbol: string;
}

export interface CapTableOptions extends CLIOptions {
  block?: number;
  format?: "table" | "json" | "csv";
}

// Contract ABI event types (for viem)
export const EVENTS = {
  Transfer: {
    name: "Transfer",
    type: "event",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
  AddressAllowlisted: {
    name: "AddressAllowlisted",
    type: "event",
    inputs: [{ name: "account", type: "address", indexed: true }],
  },
  AddressRemovedFromAllowlist: {
    name: "AddressRemovedFromAllowlist",
    type: "event",
    inputs: [{ name: "account", type: "address", indexed: true }],
  },
  StockSplit: {
    name: "StockSplit",
    type: "event",
    inputs: [
      { name: "multiplier", type: "uint256", indexed: false },
      { name: "newTotalSupply", type: "uint256", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  MetadataChanged: {
    name: "MetadataChanged",
    type: "event",
    inputs: [
      { name: "oldName", type: "string", indexed: false },
      { name: "newName", type: "string", indexed: false },
      { name: "oldSymbol", type: "string", indexed: false },
      { name: "newSymbol", type: "string", indexed: false },
    ],
  },
  SharesBoughtBack: {
    name: "SharesBoughtBack",
    type: "event",
    inputs: [
      { name: "holder", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
} as const;
