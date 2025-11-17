/**
 * PostgreSQL database client and operations
 */

import type {
  AllowlistEntry,
  Balance,
  BuybackEvent,
  CapTableEntry,
  Config,
  IndexerState,
  MetadataChange,
  StockSplit,
  TransferEvent,
} from "../types";
import { Pool, type PoolClient } from "pg";

export class Database {
  private pool: Pool;
  private contractAddress: string | null = null;
  private contractId: number | null = null;

  constructor(config: Config) {
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
    });
    if (config.contractAddress) {
      this.contractAddress = config.contractAddress.toLowerCase();
    }
  }

  /**
   * Initialize contract ID by looking up the contract address
   */
  async initializeContractId(): Promise<void> {
    const result = await this.pool.query(
      "SELECT id FROM contracts WHERE contract_address = $1",
      [this.contractAddress],
    );
    if (result.rows.length === 0) {
      throw new Error(
        `Contract with address ${this.contractAddress} not found in database. Please deploy the contract through the web UI first.`,
      );
    }
    this.contractId = result.rows[0].id;
  }

  /**
   * Set the contract ID manually (for multi-contract indexer)
   */
  async setContractId(contractId: number): Promise<void> {
    this.contractId = contractId;
  }

  /**
   * Get the contract ID (must call initializeContractId or setContractId first)
   */
  private getContractId(): number {
    if (this.contractId === null) {
      throw new Error(
        "Contract ID not initialized. Call initializeContractId() or setContractId() first.",
      );
    }
    return this.contractId;
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      await client.query("SELECT 1");
      client.release();
      return true;
    } catch (error) {
      console.error("Database connection failed:", error);
      return false;
    }
  }

  /**
   * Get a client from the pool for transactions
   */
  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  // ===== Indexer State Operations =====

  async getIndexerState(): Promise<IndexerState> {
    const contractId = this.getContractId();
    const result = await this.pool.query(
      "SELECT i.*, c.contract_address FROM indexer_state i JOIN contracts c ON i.contract_id = c.id WHERE i.contract_id = $1",
      [contractId],
    );
    if (result.rows.length === 0) {
      // Get contract address for initial state
      const contractResult = await this.pool.query(
        "SELECT contract_address FROM contracts WHERE id = $1",
        [contractId],
      );
      const contractAddress = contractResult.rows[0]?.contract_address || "";

      // Create initial state for this contract
      await this.pool.query(
        "INSERT INTO indexer_state (contract_id, last_processed_block, is_syncing) VALUES ($1, 0, FALSE)",
        [contractId],
      );
      return {
        id: 0,
        contract_address: contractAddress,
        last_processed_block: BigInt(0),
        is_syncing: false,
        last_updated_at: new Date(),
      };
    }
    const row = result.rows[0];
    // Convert last_processed_block from string to BigInt
    return {
      ...row,
      last_processed_block: BigInt(row.last_processed_block || 0),
    };
  }

  async updateIndexerState(blockNumber: bigint): Promise<void> {
    const contractId = this.getContractId();
    await this.pool.query(
      "UPDATE indexer_state SET last_processed_block = $1, last_updated_at = NOW() WHERE contract_id = $2",
      [blockNumber.toString(), contractId],
    );
  }

  async setIndexerSyncing(isSyncing: boolean): Promise<void> {
    const contractId = this.getContractId();
    await this.pool.query(
      "UPDATE indexer_state SET is_syncing = $1 WHERE contract_id = $2",
      [isSyncing, contractId],
    );
  }

  // ===== Allowlist Operations =====

  async addToAllowlist(
    address: string,
    blockNumber: bigint,
    txHash: string,
  ): Promise<void> {
    const contractId = this.getContractId();
    await this.pool.query(
      `INSERT INTO allowlist (contract_id, address, is_allowlisted, added_at_block, tx_hash)
       VALUES ($1, $2, TRUE, $3, $4)
       ON CONFLICT (contract_id, address)
       DO UPDATE SET is_allowlisted = TRUE, added_at = NOW(), added_at_block = $3, tx_hash = $4`,
      [contractId, address.toLowerCase(), blockNumber.toString(), txHash],
    );
  }

  async removeFromAllowlist(
    address: string,
    blockNumber: bigint,
    txHash: string,
  ): Promise<void> {
    const contractId = this.getContractId();
    await this.pool.query(
      `UPDATE allowlist
       SET is_allowlisted = FALSE, removed_at = NOW(), removed_at_block = $3, tx_hash = $4
       WHERE contract_id = $1 AND address = $2`,
      [contractId, address.toLowerCase(), blockNumber.toString(), txHash],
    );
  }

  async isAllowlisted(address: string): Promise<boolean> {
    const contractId = this.getContractId();
    const result = await this.pool.query(
      "SELECT is_allowlisted FROM allowlist WHERE contract_id = $1 AND address = $2",
      [contractId, address.toLowerCase()],
    );
    return result.rows.length > 0 ? result.rows[0].is_allowlisted : false;
  }

  async getAllowlistedAddresses(): Promise<string[]> {
    const contractId = this.getContractId();
    const result = await this.pool.query(
      "SELECT address FROM allowlist WHERE contract_id = $1 AND is_allowlisted = TRUE ORDER BY added_at",
      [contractId],
    );
    return result.rows.map((row) => row.address);
  }

  // ===== Transfer Operations =====

  async insertTransfer(transfer: TransferEvent): Promise<void> {
    const contractId = this.getContractId();
    await this.pool.query(
      `INSERT INTO transfers (contract_id, from_address, to_address, amount, block_number, block_timestamp, tx_hash, log_index)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (contract_id, tx_hash, log_index) DO NOTHING`,
      [
        contractId,
        transfer.from_address.toLowerCase(),
        transfer.to_address.toLowerCase(),
        transfer.amount,
        transfer.block_number.toString(),
        transfer.block_timestamp,
        transfer.tx_hash,
        transfer.log_index,
      ],
    );
  }

  async getTransfersByAddress(address: string, limit = 100): Promise<TransferEvent[]> {
    const contractId = this.getContractId();
    const result = await this.pool.query(
      `SELECT * FROM transfers
       WHERE contract_id = $1 AND (from_address = $2 OR to_address = $2)
       ORDER BY block_number DESC, log_index DESC
       LIMIT $3`,
      [contractId, address.toLowerCase(), limit],
    );
    return result.rows;
  }

  // ===== Balance Operations =====

  async updateBalance(
    address: string,
    amount: bigint,
    isCredit: boolean,
    blockNumber: bigint,
  ): Promise<void> {
    const contractId = this.getContractId();
    await this.pool.query("SELECT update_balance($1, $2, $3, $4, $5)", [
      contractId,
      address.toLowerCase(),
      amount.toString(),
      isCredit,
      blockNumber.toString(),
    ]);
  }

  async getBalance(address: string): Promise<Balance | null> {
    const contractId = this.getContractId();
    const result = await this.pool.query(
      "SELECT * FROM balances WHERE contract_id = $1 AND address = $2",
      [contractId, address.toLowerCase()],
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async getAllBalances(): Promise<Balance[]> {
    const contractId = this.getContractId();
    const result = await this.pool.query(
      "SELECT * FROM balances WHERE contract_id = $1 AND balance::NUMERIC > 0 ORDER BY balance::NUMERIC DESC",
      [contractId],
    );
    return result.rows;
  }

  // ===== Cap Table Operations =====

  async getCurrentCapTable(): Promise<CapTableEntry[]> {
    const contractId = this.getContractId();
    const result = await this.pool.query("SELECT * FROM get_current_cap_table($1)", [
      contractId,
    ]);
    return result.rows;
  }

  async getCapTableAtBlock(blockNumber: bigint): Promise<CapTableEntry[]> {
    const contractId = this.getContractId();
    const result = await this.pool.query(
      "SELECT * FROM get_cap_table_at_block($1, $2)",
      [contractId, blockNumber.toString()],
    );
    return result.rows;
  }

  async getTotalSupply(): Promise<bigint> {
    const contractId = this.getContractId();
    const result = await this.pool.query(
      "SELECT COALESCE(SUM(balance::NUMERIC), 0) as total FROM balances WHERE contract_id = $1",
      [contractId],
    );
    return BigInt(result.rows[0].total);
  }

  // ===== Stock Split Operations =====

  async insertStockSplit(split: StockSplit): Promise<void> {
    const contractId = this.getContractId();
    await this.pool.query(
      `INSERT INTO stock_splits (contract_id, multiplier, new_total_supply, block_number, block_timestamp, tx_hash, affected_holders)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (contract_id, tx_hash) DO NOTHING`,
      [
        contractId,
        split.multiplier,
        split.new_total_supply,
        split.block_number.toString(),
        split.block_timestamp,
        split.tx_hash,
        split.affected_holders,
      ],
    );
  }

  async getStockSplits(limit = 50): Promise<StockSplit[]> {
    const contractId = this.getContractId();
    const result = await this.pool.query(
      "SELECT * FROM stock_splits WHERE contract_id = $1 ORDER BY block_number DESC LIMIT $2",
      [contractId, limit],
    );
    return result.rows;
  }

  // ===== Buyback Operations =====

  async insertBuyback(buyback: BuybackEvent): Promise<void> {
    const contractId = this.getContractId();
    await this.pool.query(
      `INSERT INTO buybacks (contract_id, holder_address, amount, block_number, block_timestamp, tx_hash, log_index)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (contract_id, tx_hash, log_index) DO NOTHING`,
      [
        contractId,
        buyback.holder_address.toLowerCase(),
        buyback.amount,
        buyback.block_number.toString(),
        buyback.block_timestamp,
        buyback.tx_hash,
        buyback.log_index,
      ],
    );
  }

  async getBuybacks(limit = 50): Promise<BuybackEvent[]> {
    const contractId = this.getContractId();
    const result = await this.pool.query(
      "SELECT * FROM buybacks WHERE contract_id = $1 ORDER BY block_number DESC LIMIT $2",
      [contractId, limit],
    );
    return result.rows;
  }

  async getBuybacksByHolder(
    holderAddress: string,
    limit = 50,
  ): Promise<BuybackEvent[]> {
    const contractId = this.getContractId();
    const result = await this.pool.query(
      "SELECT * FROM buybacks WHERE contract_id = $1 AND holder_address = $2 ORDER BY block_number DESC LIMIT $3",
      [contractId, holderAddress.toLowerCase(), limit],
    );
    return result.rows;
  }

  // ===== Metadata Change Operations =====

  async insertMetadataChange(change: MetadataChange): Promise<void> {
    const contractId = this.getContractId();
    await this.pool.query(
      `INSERT INTO metadata_changes (contract_id, old_name, new_name, old_symbol, new_symbol, block_number, block_timestamp, tx_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (contract_id, tx_hash) DO NOTHING`,
      [
        contractId,
        change.old_name,
        change.new_name,
        change.old_symbol,
        change.new_symbol,
        change.block_number.toString(),
        change.block_timestamp,
        change.tx_hash,
      ],
    );
  }

  async getMetadataChanges(limit = 50): Promise<MetadataChange[]> {
    const contractId = this.getContractId();
    const result = await this.pool.query(
      "SELECT * FROM metadata_changes WHERE contract_id = $1 ORDER BY block_number DESC LIMIT $2",
      [contractId, limit],
    );
    return result.rows;
  }

  // ===== Recent Activity =====

  async getRecentActivity(limit = 100): Promise<any[]> {
    const contractId = this.getContractId();
    const result = await this.pool.query("SELECT * FROM get_recent_activity($1, $2)", [
      contractId,
      limit,
    ]);
    return result.rows;
  }

  // ===== Utility Functions =====

  async clearAllData(): Promise<void> {
    const contractId = this.getContractId();
    const client = await this.getClient();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM metadata_changes WHERE contract_id = $1", [
        contractId,
      ]);
      await client.query("DELETE FROM stock_splits WHERE contract_id = $1", [
        contractId,
      ]);
      await client.query("DELETE FROM buybacks WHERE contract_id = $1", [contractId]);
      await client.query("DELETE FROM transfers WHERE contract_id = $1", [contractId]);
      await client.query("DELETE FROM balances WHERE contract_id = $1", [contractId]);
      await client.query("DELETE FROM allowlist WHERE contract_id = $1", [contractId]);
      await client.query(
        "UPDATE indexer_state SET last_processed_block = 0, is_syncing = FALSE WHERE contract_id = $1",
        [contractId],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
