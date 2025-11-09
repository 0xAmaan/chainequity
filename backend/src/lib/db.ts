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

  constructor(config: Config) {
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
    });
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
    const result = await this.pool.query("SELECT * FROM indexer_state WHERE id = 1");
    const row = result.rows[0];
    // Convert last_processed_block from string to BigInt
    return {
      ...row,
      last_processed_block: BigInt(row.last_processed_block || 0),
    };
  }

  async updateIndexerState(
    blockNumber: bigint,
    contractAddress: string,
  ): Promise<void> {
    await this.pool.query(
      "UPDATE indexer_state SET last_processed_block = $1, last_updated_at = NOW(), contract_address = $2 WHERE id = 1",
      [blockNumber.toString(), contractAddress],
    );
  }

  async setIndexerSyncing(isSyncing: boolean): Promise<void> {
    await this.pool.query("UPDATE indexer_state SET is_syncing = $1 WHERE id = 1", [
      isSyncing,
    ]);
  }

  // ===== Allowlist Operations =====

  async addToAllowlist(
    address: string,
    blockNumber: bigint,
    txHash: string,
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO allowlist (address, is_allowlisted, added_at_block, tx_hash)
       VALUES ($1, TRUE, $2, $3)
       ON CONFLICT (address)
       DO UPDATE SET is_allowlisted = TRUE, added_at = NOW(), added_at_block = $2, tx_hash = $3`,
      [address.toLowerCase(), blockNumber.toString(), txHash],
    );
  }

  async removeFromAllowlist(
    address: string,
    blockNumber: bigint,
    txHash: string,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE allowlist
       SET is_allowlisted = FALSE, removed_at = NOW(), removed_at_block = $2, tx_hash = $3
       WHERE address = $1`,
      [address.toLowerCase(), blockNumber.toString(), txHash],
    );
  }

  async isAllowlisted(address: string): Promise<boolean> {
    const result = await this.pool.query(
      "SELECT is_allowlisted FROM allowlist WHERE address = $1",
      [address.toLowerCase()],
    );
    return result.rows.length > 0 ? result.rows[0].is_allowlisted : false;
  }

  async getAllowlistedAddresses(): Promise<string[]> {
    const result = await this.pool.query(
      "SELECT address FROM allowlist WHERE is_allowlisted = TRUE ORDER BY added_at",
    );
    return result.rows.map((row) => row.address);
  }

  // ===== Transfer Operations =====

  async insertTransfer(transfer: TransferEvent): Promise<void> {
    await this.pool.query(
      `INSERT INTO transfers (from_address, to_address, amount, block_number, block_timestamp, tx_hash, log_index)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (tx_hash, log_index) DO NOTHING`,
      [
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
    const result = await this.pool.query(
      `SELECT * FROM transfers
       WHERE from_address = $1 OR to_address = $1
       ORDER BY block_number DESC, log_index DESC
       LIMIT $2`,
      [address.toLowerCase(), limit],
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
    await this.pool.query("SELECT update_balance($1, $2, $3, $4)", [
      address.toLowerCase(),
      amount.toString(),
      isCredit,
      blockNumber.toString(),
    ]);
  }

  async getBalance(address: string): Promise<Balance | null> {
    const result = await this.pool.query("SELECT * FROM balances WHERE address = $1", [
      address.toLowerCase(),
    ]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async getAllBalances(): Promise<Balance[]> {
    const result = await this.pool.query(
      "SELECT * FROM balances WHERE balance::NUMERIC > 0 ORDER BY balance::NUMERIC DESC",
    );
    return result.rows;
  }

  // ===== Cap Table Operations =====

  async getCurrentCapTable(): Promise<CapTableEntry[]> {
    const result = await this.pool.query("SELECT * FROM current_cap_table");
    return result.rows;
  }

  async getCapTableAtBlock(blockNumber: bigint): Promise<CapTableEntry[]> {
    const result = await this.pool.query("SELECT * FROM get_cap_table_at_block($1)", [
      blockNumber.toString(),
    ]);
    return result.rows;
  }

  async getTotalSupply(): Promise<bigint> {
    const result = await this.pool.query(
      "SELECT COALESCE(SUM(balance::NUMERIC), 0) as total FROM balances",
    );
    return BigInt(result.rows[0].total);
  }

  // ===== Stock Split Operations =====

  async insertStockSplit(split: StockSplit): Promise<void> {
    await this.pool.query(
      `INSERT INTO stock_splits (multiplier, new_total_supply, block_number, block_timestamp, tx_hash, affected_holders)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (tx_hash) DO NOTHING`,
      [
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
    const result = await this.pool.query(
      "SELECT * FROM stock_splits ORDER BY block_number DESC LIMIT $1",
      [limit],
    );
    return result.rows;
  }

  // ===== Buyback Operations =====

  async insertBuyback(buyback: BuybackEvent): Promise<void> {
    await this.pool.query(
      `INSERT INTO buybacks (holder_address, amount, block_number, block_timestamp, tx_hash, log_index)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (tx_hash, log_index) DO NOTHING`,
      [
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
    const result = await this.pool.query(
      "SELECT * FROM buybacks ORDER BY block_number DESC LIMIT $1",
      [limit],
    );
    return result.rows;
  }

  async getBuybacksByHolder(
    holderAddress: string,
    limit = 50,
  ): Promise<BuybackEvent[]> {
    const result = await this.pool.query(
      "SELECT * FROM buybacks WHERE holder_address = $1 ORDER BY block_number DESC LIMIT $2",
      [holderAddress.toLowerCase(), limit],
    );
    return result.rows;
  }

  // ===== Metadata Change Operations =====

  async insertMetadataChange(change: MetadataChange): Promise<void> {
    await this.pool.query(
      `INSERT INTO metadata_changes (old_name, new_name, old_symbol, new_symbol, block_number, block_timestamp, tx_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (tx_hash) DO NOTHING`,
      [
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
    const result = await this.pool.query(
      "SELECT * FROM metadata_changes ORDER BY block_number DESC LIMIT $1",
      [limit],
    );
    return result.rows;
  }

  // ===== Recent Activity =====

  async getRecentActivity(limit = 100): Promise<any[]> {
    const result = await this.pool.query("SELECT * FROM recent_activity LIMIT $1", [
      limit,
    ]);
    return result.rows;
  }

  // ===== Utility Functions =====

  async clearAllData(): Promise<void> {
    const client = await this.getClient();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM metadata_changes");
      await client.query("DELETE FROM stock_splits");
      await client.query("DELETE FROM transfers");
      await client.query("DELETE FROM balances");
      await client.query("DELETE FROM allowlist");
      await client.query(
        "UPDATE indexer_state SET last_processed_block = 0, is_syncing = FALSE",
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
