/**
 * Contract interaction layer using viem
 */

import { readFileSync } from "fs";
import { join } from "path";
import type { Config } from "../types";
import {
  createPublicClient,
  createWalletClient,
  formatUnits,
  http,
  parseUnits,
  type Address,
  type Hash,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";

// Load contract ABI
const abiPath = join(__dirname, "GatedEquityToken.abi.json");
const contractABI = JSON.parse(readFileSync(abiPath, "utf-8"));

export class ChainEquityContract {
  private publicClient: PublicClient;
  private walletClient: WalletClient;
  private account: ReturnType<typeof privateKeyToAccount>;
  private contractAddress: Address;

  constructor(config: Config) {
    if (!config.contractAddress) {
      throw new Error("Contract address is required");
    }
    this.contractAddress = config.contractAddress;

    // Create account from private key
    this.account = privateKeyToAccount(config.privateKey);

    // Create public client for reading
    this.publicClient = createPublicClient({
      chain: foundry,
      transport: http(config.rpcUrl),
    });

    // Create wallet client for writing
    this.walletClient = createWalletClient({
      account: this.account,
      chain: foundry,
      transport: http(config.rpcUrl),
    });
  }

  /**
   * Get the public client for direct access
   */
  getPublicClient(): PublicClient {
    return this.publicClient;
  }

  /**
   * Get the contract address
   */
  getContractAddress(): Address {
    return this.contractAddress;
  }

  /**
   * Get the account address
   */
  getAccountAddress(): Address {
    return this.account.address;
  }

  // ===== Read Functions =====

  /**
   * Check if an address is allowlisted
   */
  async isAllowlisted(address: Address): Promise<boolean> {
    const result = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: contractABI,
      functionName: "isAllowlisted",
      args: [address],
    });
    return result as boolean;
  }

  /**
   * Get balance of an address
   */
  async balanceOf(address: Address): Promise<bigint> {
    const result = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: contractABI,
      functionName: "balanceOf",
      args: [address],
    });
    return result as bigint;
  }

  /**
   * Get total supply
   */
  async totalSupply(): Promise<bigint> {
    const result = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: contractABI,
      functionName: "totalSupply",
      args: [],
    });
    return result as bigint;
  }

  /**
   * Get token name
   */
  async name(): Promise<string> {
    const result = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: contractABI,
      functionName: "name",
      args: [],
    });
    return result as string;
  }

  /**
   * Get token symbol
   */
  async symbol(): Promise<string> {
    const result = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: contractABI,
      functionName: "symbol",
      args: [],
    });
    return result as string;
  }

  /**
   * Get token decimals
   */
  async decimals(): Promise<number> {
    const result = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: contractABI,
      functionName: "decimals",
      args: [],
    });
    return result as number;
  }

  /**
   * Get owner address
   */
  async owner(): Promise<Address> {
    const result = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: contractABI,
      functionName: "owner",
      args: [],
    });
    return result as Address;
  }

  // ===== Write Functions =====

  /**
   * Add an address to the allowlist
   */
  async addToAllowlist(address: Address): Promise<Hash> {
    const { request } = await this.publicClient.simulateContract({
      account: this.account,
      address: this.contractAddress,
      abi: contractABI,
      functionName: "addToAllowlist",
      args: [address],
    });

    const hash = await this.walletClient.writeContract(request);
    return hash;
  }

  /**
   * Remove an address from the allowlist
   */
  async removeFromAllowlist(address: Address): Promise<Hash> {
    const { request } = await this.publicClient.simulateContract({
      account: this.account,
      address: this.contractAddress,
      abi: contractABI,
      functionName: "removeFromAllowlist",
      args: [address],
    });

    const hash = await this.walletClient.writeContract(request);
    return hash;
  }

  /**
   * Mint tokens to an address
   */
  async mint(to: Address, amount: bigint): Promise<Hash> {
    const { request } = await this.publicClient.simulateContract({
      account: this.account,
      address: this.contractAddress,
      abi: contractABI,
      functionName: "mint",
      args: [to, amount],
    });

    const hash = await this.walletClient.writeContract(request);
    return hash;
  }

  /**
   * Buy back shares from a holder
   */
  async buyback(holder: Address, amount: bigint): Promise<Hash> {
    const { request } = await this.publicClient.simulateContract({
      account: this.account,
      address: this.contractAddress,
      abi: contractABI,
      functionName: "buyback",
      args: [holder, amount],
    });

    const hash = await this.walletClient.writeContract(request);
    return hash;
  }

  /**
   * Execute a stock split
   */
  async executeSplit(multiplier: bigint, holders: Address[]): Promise<Hash> {
    const { request } = await this.publicClient.simulateContract({
      account: this.account,
      address: this.contractAddress,
      abi: contractABI,
      functionName: "executeSplit",
      args: [multiplier, holders],
    });

    const hash = await this.walletClient.writeContract(request);
    return hash;
  }

  /**
   * Change token metadata (name and symbol)
   */
  async changeMetadata(newName: string, newSymbol: string): Promise<Hash> {
    const { request } = await this.publicClient.simulateContract({
      account: this.account,
      address: this.contractAddress,
      abi: contractABI,
      functionName: "changeMetadata",
      args: [newName, newSymbol],
    });

    const hash = await this.walletClient.writeContract(request);
    return hash;
  }

  /**
   * Transfer tokens
   */
  async transfer(to: Address, amount: bigint): Promise<Hash> {
    const { request } = await this.publicClient.simulateContract({
      account: this.account,
      address: this.contractAddress,
      abi: contractABI,
      functionName: "transfer",
      args: [to, amount],
    });

    const hash = await this.walletClient.writeContract(request);
    return hash;
  }

  // ===== Utility Functions =====

  /**
   * Wait for a transaction to be mined
   */
  async waitForTransaction(hash: Hash): Promise<any> {
    return await this.publicClient.waitForTransactionReceipt({ hash });
  }

  /**
   * Get current block number
   */
  async getBlockNumber(): Promise<bigint> {
    return await this.publicClient.getBlockNumber();
  }

  /**
   * Get block by number
   */
  async getBlock(blockNumber: bigint) {
    return await this.publicClient.getBlock({ blockNumber });
  }

  /**
   * Format token amount for display
   */
  formatTokenAmount(amount: bigint, decimals: number = 18): string {
    return formatUnits(amount, decimals);
  }

  /**
   * Parse token amount from string
   */
  parseTokenAmount(amount: string, decimals: number = 18): bigint {
    return parseUnits(amount, decimals);
  }

  /**
   * Get contract events
   */
  async getEvents(
    eventName: string,
    fromBlock: bigint,
    toBlock?: bigint,
  ): Promise<any[]> {
    const logs = await this.publicClient.getContractEvents({
      address: this.contractAddress,
      abi: contractABI,
      eventName,
      fromBlock,
      toBlock: toBlock || "latest",
    });
    return logs;
  }

  /**
   * Watch for contract events
   */
  watchEvents(
    eventName: string,
    onEvent: (logs: any[]) => void,
    onError?: (error: Error) => void,
  ): () => void {
    const unwatch = this.publicClient.watchContractEvent({
      address: this.contractAddress,
      abi: contractABI,
      eventName,
      onLogs: onEvent,
      onError,
    });
    return unwatch;
  }

  /**
   * Watch multiple events
   */
  watchAllEvents(
    onLogs: (logs: any[]) => void,
    onError?: (error: Error) => void,
  ): () => void {
    const unwatch = this.publicClient.watchContractEvent({
      address: this.contractAddress,
      abi: contractABI,
      onLogs,
      onError,
    });
    return unwatch;
  }
}

/**
 * Create a contract instance from config
 */
export const createContract = (config: Config): ChainEquityContract => {
  return new ChainEquityContract(config);
};
