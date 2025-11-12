/**
 * Manages multiple contract instances for the indexer
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { logger } from "../lib/logger";
import type { Config } from "../types";
import { Pool } from "pg";
import { createPublicClient, getContract, http, type PublicClient } from "viem";
import { foundry } from "viem/chains";

interface ContractInfo {
  id: number;
  address: string;
  name: string;
  symbol: string;
  chain_id: number;
}

export class ContractManager {
  private client: PublicClient;
  private pool: Pool;
  private abi: any;
  private contracts: Map<string, { info: ContractInfo; instance: any }> = new Map();

  constructor(config: Config) {
    // Create blockchain client
    this.client = createPublicClient({
      chain: foundry,
      transport: http(config.rpcUrl),
    });

    // Create database connection
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
    });

    // Load ABI
    const abiPath = resolve(__dirname, "../lib/GatedEquityToken.abi.json");
    this.abi = JSON.parse(readFileSync(abiPath, "utf-8"));
  }

  /**
   * Load all active contracts from the database
   */
  async loadContracts(): Promise<void> {
    const result = await this.pool.query(
      "SELECT id, contract_address, name, symbol, chain_id FROM contracts WHERE is_active = TRUE ORDER BY id",
    );

    for (const row of result.rows) {
      const contractInfo: ContractInfo = {
        id: row.id,
        address: row.contract_address,
        name: row.name,
        symbol: row.symbol,
        chain_id: row.chain_id,
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
  getContractId(address: string): number | undefined {
    return this.contracts.get(address.toLowerCase())?.info.id;
  }

  /**
   * Get blockchain client
   */
  getClient(): PublicClient {
    return this.client;
  }

  /**
   * Check for newly deployed contracts and add them
   */
  async refreshContracts(): Promise<number> {
    const result = await this.pool.query(
      "SELECT id, contract_address, name, symbol, chain_id FROM contracts WHERE is_active = TRUE ORDER BY id",
    );

    let newContracts = 0;

    for (const row of result.rows) {
      const address = row.contract_address.toLowerCase();

      if (!this.contracts.has(address)) {
        const contractInfo: ContractInfo = {
          id: row.id,
          address: row.contract_address,
          name: row.name,
          symbol: row.symbol,
          chain_id: row.chain_id,
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
        newContracts++;
      }
    }

    return newContracts;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
