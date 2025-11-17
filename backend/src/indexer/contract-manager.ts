/**
 * Manages multiple contract instances for the indexer
 * Now using Convex exclusively (Postgres removed)
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { convexIndexer } from "../lib/convex-client";
import { logger } from "../lib/logger";
import type { Config } from "../types";
import { createPublicClient, getContract, http, type PublicClient } from "viem";
import { foundry } from "viem/chains";

interface ContractInfo {
  id: string; // Convex ID (not Postgres number)
  address: string;
  name: string;
  symbol: string;
  chain_id: number;
}

export class ContractManager {
  private client: PublicClient;
  private abi: any;
  private contracts: Map<string, { info: ContractInfo; instance: any }> = new Map();

  constructor(config: Config) {
    // Create blockchain client with polling interval for event watching
    this.client = createPublicClient({
      chain: foundry,
      transport: http(config.rpcUrl),
      pollingInterval: 1000, // Poll every second for events
    });

    // Load ABI
    const abiPath = resolve(__dirname, "../lib/GatedEquityToken.abi.json");
    const abiFile = JSON.parse(readFileSync(abiPath, "utf-8"));
    // Handle both old format (direct ABI array) and new format (forge output with abi property)
    this.abi = Array.isArray(abiFile) ? abiFile : abiFile.abi;
  }

  /**
   * Load all active contracts from Convex
   */
  async loadContracts(): Promise<void> {
    const contracts = await convexIndexer.getActiveContracts();

    for (const contract of contracts) {
      const contractInfo: ContractInfo = {
        id: contract._id,
        address: contract.contractAddress,
        name: contract.name,
        symbol: contract.symbol,
        chain_id: contract.chainId,
      };

      // Create contract instance
      const instance = getContract({
        address: contractInfo.address as `0x${string}`,
        abi: this.abi,
        client: this.client,
      });

      this.contracts.set(contractInfo.address.toLowerCase(), {
        info: contractInfo,
        instance,
      });

      logger.info(
        `📋 Loaded contract: ${contractInfo.name} (${contractInfo.symbol}) at ${contractInfo.address}`,
      );
    }

    logger.info(`✅ Loaded ${this.contracts.size} contract(s)`);
  }

  /**
   * Get all contract addresses
   */
  getContractAddresses(): string[] {
    return Array.from(this.contracts.keys());
  }

  /**
   * Get contract info by address
   */
  getContract(address: string): { info: ContractInfo; instance: any } | undefined {
    return this.contracts.get(address.toLowerCase());
  }

  /**
   * Get contract ID by address
   */
  getContractId(address: string): string | undefined {
    return this.contracts.get(address.toLowerCase())?.info.id;
  }

  /**
   * Get blockchain client
   */
  getClient(): PublicClient {
    return this.client;
  }

  /**
   * Check for newly deployed contracts from Convex and add them
   * Returns array of new contract addresses
   */
  async refreshContracts(): Promise<string[]> {
    const contracts = await convexIndexer.getActiveContracts();

    const newAddresses: string[] = [];

    for (const contract of contracts) {
      const address = contract.contractAddress.toLowerCase();

      if (!this.contracts.has(address)) {
        const contractInfo: ContractInfo = {
          id: contract._id,
          address: contract.contractAddress,
          name: contract.name,
          symbol: contract.symbol,
          chain_id: contract.chainId,
        };

        const instance = getContract({
          address: contractInfo.address as `0x${string}`,
          abi: this.abi,
          client: this.client,
        });

        this.contracts.set(address, {
          info: contractInfo,
          instance,
        });

        logger.info(
          `📋 Added new contract: ${contractInfo.name} (${contractInfo.symbol}) at ${contractInfo.address}`,
        );
        newAddresses.push(contractInfo.address);
      }
    }

    return newAddresses;
  }

  /**
   * No database connection to close (using Convex)
   */
  async close(): Promise<void> {
    // No-op: Convex connections are managed automatically
  }
}
