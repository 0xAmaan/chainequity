/**
 * Event listener for ChainEquity contract events
 */

import type { ChainEquityContract } from "../lib/contract";
import type { Database } from "../lib/db";
import { logger } from "../lib/logger";
import type {
  BuybackEvent,
  MetadataChange,
  StockSplit,
  TransferEvent,
} from "../types";

export class EventListener {
  private contract: ChainEquityContract;
  private db: Database;
  private unwatchFunctions: (() => void)[] = [];

  constructor(contract: ChainEquityContract, db: Database) {
    this.contract = contract;
    this.db = db;
  }

  /**
   * Start listening to all contract events
   */
  async start(): Promise<void> {
    logger.info("🎧 Starting event listener...");

    // Watch Transfer events
    const unwatchTransfer = this.contract.watchEvents(
      "Transfer",
      async (logs) => {
        for (const log of logs) {
          await this.handleTransferEvent(log);
        }
      },
      (error) => {
        logger.error("Error watching Transfer events:", error);
      },
    );
    this.unwatchFunctions.push(unwatchTransfer);

    // Watch AddressAllowlisted events
    const unwatchAllowlist = this.contract.watchEvents(
      "AddressAllowlisted",
      async (logs) => {
        for (const log of logs) {
          await this.handleAllowlistAddEvent(log);
        }
      },
      (error) => {
        logger.error("Error watching AddressAllowlisted events:", error);
      },
    );
    this.unwatchFunctions.push(unwatchAllowlist);

    // Watch AddressRemovedFromAllowlist events
    const unwatchRemoveAllowlist = this.contract.watchEvents(
      "AddressRemovedFromAllowlist",
      async (logs) => {
        for (const log of logs) {
          await this.handleAllowlistRemoveEvent(log);
        }
      },
      (error) => {
        logger.error("Error watching AddressRemovedFromAllowlist events:", error);
      },
    );
    this.unwatchFunctions.push(unwatchRemoveAllowlist);

    // Watch StockSplit events
    const unwatchSplit = this.contract.watchEvents(
      "StockSplit",
      async (logs) => {
        for (const log of logs) {
          await this.handleStockSplitEvent(log);
        }
      },
      (error) => {
        logger.error("Error watching StockSplit events:", error);
      },
    );
    this.unwatchFunctions.push(unwatchSplit);

    // Watch MetadataChanged events
    const unwatchMetadata = this.contract.watchEvents(
      "MetadataChanged",
      async (logs) => {
        for (const log of logs) {
          await this.handleMetadataChangeEvent(log);
        }
      },
      (error) => {
        logger.error("Error watching MetadataChanged events:", error);
      },
    );
    this.unwatchFunctions.push(unwatchMetadata);

    // Watch SharesBoughtBack events
    const unwatchBuyback = this.contract.watchEvents(
      "SharesBoughtBack",
      async (logs) => {
        for (const log of logs) {
          await this.handleBuybackEvent(log);
        }
      },
      (error) => {
        logger.error("Error watching SharesBoughtBack events:", error);
      },
    );
    this.unwatchFunctions.push(unwatchBuyback);

    logger.info("✅ Event listener started successfully");
  }

  /**
   * Stop listening to events
   */
  stop(): void {
    logger.info("🛑 Stopping event listener...");
    this.unwatchFunctions.forEach((unwatch) => unwatch());
    this.unwatchFunctions = [];
    logger.info("✅ Event listener stopped");
  }

  /**
   * Handle Transfer event
   */
  private async handleTransferEvent(log: any): Promise<void> {
    try {
      const { from, to, value } = log.args;
      const blockNumber = log.blockNumber;
      const txHash = log.transactionHash;
      const logIndex = log.logIndex;

      logger.info(
        `📤 Transfer: ${from} → ${to} (${value.toString()} tokens) [Block: ${blockNumber}]`,
      );

      // Get block to extract timestamp
      const block = await this.contract.getBlock(blockNumber);
      const blockTimestamp = new Date(Number(block.timestamp) * 1000);

      // Insert transfer event
      const transfer: TransferEvent = {
        from_address: from,
        to_address: to,
        amount: value.toString(),
        block_number: blockNumber,
        block_timestamp: blockTimestamp,
        tx_hash: txHash,
        log_index: logIndex,
      };
      await this.db.insertTransfer(transfer);

      // Update balances
      const zeroAddress = "0x0000000000000000000000000000000000000000";

      if (from !== zeroAddress) {
        // Debit sender (unless it's a mint)
        await this.db.updateBalance(from, value, false, blockNumber);
      }

      if (to !== zeroAddress) {
        // Credit receiver (unless it's a burn)
        await this.db.updateBalance(to, value, true, blockNumber);
      }

      // Update indexer state
      await this.db.updateIndexerState(
        blockNumber,
        this.contract.getContractAddress(),
      );

      logger.debug(`✅ Processed Transfer event at block ${blockNumber}`);
    } catch (error) {
      logger.error("Error handling Transfer event:", error);
    }
  }

  /**
   * Handle AddressAllowlisted event
   */
  private async handleAllowlistAddEvent(log: any): Promise<void> {
    try {
      const { account } = log.args;
      const blockNumber = log.blockNumber;
      const txHash = log.transactionHash;

      logger.info(`✅ Address allowlisted: ${account} [Block: ${blockNumber}]`);

      await this.db.addToAllowlist(account, blockNumber, txHash);
      await this.db.updateIndexerState(
        blockNumber,
        this.contract.getContractAddress(),
      );

      logger.debug(`✅ Processed AddressAllowlisted event at block ${blockNumber}`);
    } catch (error) {
      logger.error("Error handling AddressAllowlisted event:", error);
    }
  }

  /**
   * Handle AddressRemovedFromAllowlist event
   */
  private async handleAllowlistRemoveEvent(log: any): Promise<void> {
    try {
      const { account } = log.args;
      const blockNumber = log.blockNumber;
      const txHash = log.transactionHash;

      logger.info(
        `❌ Address removed from allowlist: ${account} [Block: ${blockNumber}]`,
      );

      await this.db.removeFromAllowlist(account, blockNumber, txHash);
      await this.db.updateIndexerState(
        blockNumber,
        this.contract.getContractAddress(),
      );

      logger.debug(
        `✅ Processed AddressRemovedFromAllowlist event at block ${blockNumber}`,
      );
    } catch (error) {
      logger.error("Error handling AddressRemovedFromAllowlist event:", error);
    }
  }

  /**
   * Handle StockSplit event
   */
  private async handleStockSplitEvent(log: any): Promise<void> {
    try {
      const { multiplier, newTotalSupply, timestamp } = log.args;
      const blockNumber = log.blockNumber;
      const txHash = log.transactionHash;

      logger.info(
        `📊 Stock Split: ${multiplier}x, New Total Supply: ${newTotalSupply} [Block: ${blockNumber}]`,
      );

      // Get block to extract timestamp
      const block = await this.contract.getBlock(blockNumber);
      const blockTimestamp = new Date(Number(block.timestamp) * 1000);

      // Count affected holders
      const balances = await this.db.getAllBalances();
      const affectedHolders = balances.length;

      const split: StockSplit = {
        multiplier: Number(multiplier),
        new_total_supply: newTotalSupply.toString(),
        block_number: blockNumber,
        block_timestamp: blockTimestamp,
        tx_hash: txHash,
        affected_holders: affectedHolders,
      };
      await this.db.insertStockSplit(split);

      await this.db.updateIndexerState(
        blockNumber,
        this.contract.getContractAddress(),
      );

      logger.debug(`✅ Processed StockSplit event at block ${blockNumber}`);
    } catch (error) {
      logger.error("Error handling StockSplit event:", error);
    }
  }

  /**
   * Handle MetadataChanged event
   */
  private async handleMetadataChangeEvent(log: any): Promise<void> {
    try {
      const { oldName, newName, oldSymbol, newSymbol } = log.args;
      const blockNumber = log.blockNumber;
      const txHash = log.transactionHash;

      logger.info(
        `📝 Metadata Changed: ${oldName} (${oldSymbol}) → ${newName} (${newSymbol}) [Block: ${blockNumber}]`,
      );

      // Get block to extract timestamp
      const block = await this.contract.getBlock(blockNumber);
      const blockTimestamp = new Date(Number(block.timestamp) * 1000);

      const change: MetadataChange = {
        old_name: oldName,
        new_name: newName,
        old_symbol: oldSymbol,
        new_symbol: newSymbol,
        block_number: blockNumber,
        block_timestamp: blockTimestamp,
        tx_hash: txHash,
      };
      await this.db.insertMetadataChange(change);

      await this.db.updateIndexerState(
        blockNumber,
        this.contract.getContractAddress(),
      );

      logger.debug(`✅ Processed MetadataChanged event at block ${blockNumber}`);
    } catch (error) {
      logger.error("Error handling MetadataChanged event:", error);
    }
  }

  /**
   * Handle SharesBoughtBack event
   */
  private async handleBuybackEvent(log: any): Promise<void> {
    try {
      const { holder, amount, timestamp } = log.args;
      const blockNumber = log.blockNumber;
      const txHash = log.transactionHash;
      const logIndex = log.logIndex;

      logger.info(
        `💰 Buyback: ${amount.toString()} tokens from ${holder} [Block: ${blockNumber}]`,
      );

      // Get block to extract timestamp
      const block = await this.contract.getBlock(blockNumber);
      const blockTimestamp = new Date(Number(block.timestamp) * 1000);

      const buyback: BuybackEvent = {
        holder_address: holder,
        amount: amount.toString(),
        block_number: blockNumber,
        block_timestamp: blockTimestamp,
        tx_hash: txHash,
        log_index: logIndex,
      };
      await this.db.insertBuyback(buyback);

      await this.db.updateIndexerState(
        blockNumber,
        this.contract.getContractAddress(),
      );

      logger.debug(`✅ Processed SharesBoughtBack event at block ${blockNumber}`);
    } catch (error) {
      logger.error("Error handling SharesBoughtBack event:", error);
    }
  }

  /**
   * Sync historical events from a specific block range
   */
  async syncHistoricalEvents(fromBlock: bigint, toBlock: bigint): Promise<void> {
    logger.info(
      `🔄 Syncing historical events from block ${fromBlock} to ${toBlock}...`,
    );

    try {
      await this.db.setIndexerSyncing(true);

      // Fetch Transfer events
      const transfers = await this.contract.getEvents("Transfer", fromBlock, toBlock);
      for (const log of transfers) {
        await this.handleTransferEvent(log);
      }

      // Fetch AddressAllowlisted events
      const allowlists = await this.contract.getEvents(
        "AddressAllowlisted",
        fromBlock,
        toBlock,
      );
      for (const log of allowlists) {
        await this.handleAllowlistAddEvent(log);
      }

      // Fetch AddressRemovedFromAllowlist events
      const removeAllowlists = await this.contract.getEvents(
        "AddressRemovedFromAllowlist",
        fromBlock,
        toBlock,
      );
      for (const log of removeAllowlists) {
        await this.handleAllowlistRemoveEvent(log);
      }

      // Fetch StockSplit events
      const splits = await this.contract.getEvents("StockSplit", fromBlock, toBlock);
      for (const log of splits) {
        await this.handleStockSplitEvent(log);
      }

      // Fetch MetadataChanged events
      const metadataChanges = await this.contract.getEvents(
        "MetadataChanged",
        fromBlock,
        toBlock,
      );
      for (const log of metadataChanges) {
        await this.handleMetadataChangeEvent(log);
      }

      // Fetch SharesBoughtBack events
      const buybacks = await this.contract.getEvents(
        "SharesBoughtBack",
        fromBlock,
        toBlock,
      );
      for (const log of buybacks) {
        await this.handleBuybackEvent(log);
      }

      await this.db.setIndexerSyncing(false);
      logger.info("✅ Historical events synced successfully");
    } catch (error) {
      await this.db.setIndexerSyncing(false);
      logger.error("Error syncing historical events:", error);
      throw error;
    }
  }
}
