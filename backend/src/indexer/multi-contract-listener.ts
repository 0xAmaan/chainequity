/**
 * Event listener that handles multiple contracts
 */

import type { Database } from "../lib/db";
import { logger } from "../lib/logger";
import type {
  BuybackEvent,
  MetadataChange,
  StockSplit,
  TransferEvent,
} from "../types";
import type { ContractManager } from "./contract-manager";

export class MultiContractListener {
  private contractManager: ContractManager;
  private db: Database;
  private unwatchFunctions: (() => void)[] = [];
  private refreshInterval: NodeJS.Timeout | null = null;

  constructor(contractManager: ContractManager, db: Database) {
    this.contractManager = contractManager;
    this.db = db;
  }

  /**
   * Start listening to all contracts
   */
  async start(): Promise<void> {
    logger.info("🎧 Starting multi-contract event listener...");

    const addresses = this.contractManager.getContractAddresses();

    if (addresses.length === 0) {
      logger.warn("⚠️  No contracts found to watch. Deploy a contract first.");
      return;
    }

    for (const address of addresses) {
      await this.watchContract(address);
    }

    // Start periodic refresh to detect new contracts
    this.refreshInterval = setInterval(async () => {
      const newCount = await this.contractManager.refreshContracts();
      if (newCount > 0) {
        logger.info(`🆕 Detected ${newCount} new contract(s)`);
        // Watch the new contracts
        const addresses = this.contractManager.getContractAddresses();
        for (const address of addresses) {
          await this.watchContract(address);
        }
      }
    }, 10000); // Check every 10 seconds

    logger.info("✅ Multi-contract event listener started");
  }

  /**
   * Watch a single contract
   */
  private async watchContract(address: string): Promise<void> {
    const contract = this.contractManager.getContract(address);
    if (!contract) {
      logger.error(`Contract ${address} not found in manager`);
      return;
    }

    const { instance, info } = contract;
    const contractId = info.id;

    logger.info(`👁️  Watching contract: ${info.name} (${address})`);

    // Watch Transfer events
    const unwatchTransfer = instance.watchEvent.Transfer({
      onLogs: async (logs: any[]) => {
        logger.info(`📨 Received ${logs.length} Transfer event(s)`);
        for (const log of logs) {
          await this.handleTransferEvent(log, contractId, address);
        }
      },
      onError: (error: any) => {
        logger.error(`Error watching Transfer events for ${address}:`, error);
      },
    });
    this.unwatchFunctions.push(unwatchTransfer);

    // Watch AddressAllowlisted events
    const unwatchAllowlist = instance.watchEvent.AddressAllowlisted({
      onLogs: async (logs: any[]) => {
        for (const log of logs) {
          await this.handleAllowlistAddEvent(log, contractId, address);
        }
      },
      onError: (error: any) => {
        logger.error(
          `Error watching AddressAllowlisted events for ${address}:`,
          error,
        );
      },
    });
    this.unwatchFunctions.push(unwatchAllowlist);

    // Watch AddressRemovedFromAllowlist events
    const unwatchRemoveAllowlist = instance.watchEvent.AddressRemovedFromAllowlist({
      onLogs: async (logs: any[]) => {
        for (const log of logs) {
          await this.handleAllowlistRemoveEvent(log, contractId, address);
        }
      },
      onError: (error: any) => {
        logger.error(
          `Error watching AddressRemovedFromAllowlist events for ${address}:`,
          error,
        );
      },
    });
    this.unwatchFunctions.push(unwatchRemoveAllowlist);

    // Watch StockSplit events
    const unwatchSplit = instance.watchEvent.StockSplit({
      onLogs: async (logs: any[]) => {
        for (const log of logs) {
          await this.handleStockSplitEvent(log, contractId, address);
        }
      },
      onError: (error: any) => {
        logger.error(`Error watching StockSplit events for ${address}:`, error);
      },
    });
    this.unwatchFunctions.push(unwatchSplit);

    // Watch MetadataChanged events
    const unwatchMetadata = instance.watchEvent.MetadataChanged({
      onLogs: async (logs: any[]) => {
        for (const log of logs) {
          await this.handleMetadataChangeEvent(log, contractId, address);
        }
      },
      onError: (error: any) => {
        logger.error(`Error watching MetadataChanged events for ${address}:`, error);
      },
    });
    this.unwatchFunctions.push(unwatchMetadata);

    // Watch SharesBoughtBack events
    const unwatchBuyback = instance.watchEvent.SharesBoughtBack({
      onLogs: async (logs: any[]) => {
        for (const log of logs) {
          await this.handleBuybackEvent(log, contractId, address);
        }
      },
      onError: (error: any) => {
        logger.error(`Error watching SharesBoughtBack events for ${address}:`, error);
      },
    });
    this.unwatchFunctions.push(unwatchBuyback);
  }

  /**
   * Stop listening
   */
  stop(): void {
    logger.info("🛑 Stopping multi-contract event listener...");

    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }

    this.unwatchFunctions.forEach((unwatch) => unwatch());
    this.unwatchFunctions = [];

    logger.info("✅ Multi-contract event listener stopped");
  }

  /**
   * Handle Transfer event
   */
  private async handleTransferEvent(
    log: any,
    contractId: number,
    contractAddress: string,
  ): Promise<void> {
    try {
      const { from, to, value } = log.args;
      const blockNumber = log.blockNumber;
      const txHash = log.transactionHash;
      const logIndex = log.logIndex;

      logger.info(
        `📤 [${contractAddress.slice(0, 10)}...] Transfer: ${from} → ${to} (${value.toString()} tokens) [Block: ${blockNumber}]`,
      );

      // Get block to extract timestamp
      const client = this.contractManager.getClient();
      const block = await client.getBlock({ blockNumber });
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

      // Set contract ID for this operation
      await this.db.setContractId(contractId);
      await this.db.insertTransfer(transfer);

      // Update balances
      const zeroAddress = "0x0000000000000000000000000000000000000000";

      if (from !== zeroAddress) {
        await this.db.updateBalance(from, value, false, blockNumber);
      }

      if (to !== zeroAddress) {
        await this.db.updateBalance(to, value, true, blockNumber);
      }

      // Update indexer state
      await this.db.updateIndexerState(blockNumber);

      logger.debug(`✅ Processed Transfer event at block ${blockNumber}`);
    } catch (error) {
      logger.error("Error handling Transfer event:", error);
    }
  }

  /**
   * Handle AddressAllowlisted event
   */
  private async handleAllowlistAddEvent(
    log: any,
    contractId: number,
    contractAddress: string,
  ): Promise<void> {
    try {
      const { account } = log.args;
      const blockNumber = log.blockNumber;
      const txHash = log.transactionHash;

      logger.info(
        `✅ [${contractAddress.slice(0, 10)}...] Address allowlisted: ${account} [Block: ${blockNumber}]`,
      );

      await this.db.setContractId(contractId);
      await this.db.addToAllowlist(account, blockNumber, txHash);
      await this.db.updateIndexerState(blockNumber);

      logger.debug(`✅ Processed AddressAllowlisted event at block ${blockNumber}`);
    } catch (error) {
      logger.error("Error handling AddressAllowlisted event:", error);
    }
  }

  /**
   * Handle AddressRemovedFromAllowlist event
   */
  private async handleAllowlistRemoveEvent(
    log: any,
    contractId: number,
    contractAddress: string,
  ): Promise<void> {
    try {
      const { account } = log.args;
      const blockNumber = log.blockNumber;
      const txHash = log.transactionHash;

      logger.info(
        `❌ [${contractAddress.slice(0, 10)}...] Address removed from allowlist: ${account} [Block: ${blockNumber}]`,
      );

      await this.db.setContractId(contractId);
      await this.db.removeFromAllowlist(account, blockNumber, txHash);
      await this.db.updateIndexerState(blockNumber);

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
  private async handleStockSplitEvent(
    log: any,
    contractId: number,
    contractAddress: string,
  ): Promise<void> {
    try {
      const { multiplier, newTotalSupply } = log.args;
      const blockNumber = log.blockNumber;
      const txHash = log.transactionHash;

      logger.info(
        `📊 [${contractAddress.slice(0, 10)}...] Stock Split: ${multiplier}x, New Total Supply: ${newTotalSupply} [Block: ${blockNumber}]`,
      );

      // Get block to extract timestamp
      const client = this.contractManager.getClient();
      const block = await client.getBlock({ blockNumber });
      const blockTimestamp = new Date(Number(block.timestamp) * 1000);

      // Count affected holders
      await this.db.setContractId(contractId);
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
      await this.db.updateIndexerState(blockNumber);

      logger.debug(`✅ Processed StockSplit event at block ${blockNumber}`);
    } catch (error) {
      logger.error("Error handling StockSplit event:", error);
    }
  }

  /**
   * Handle MetadataChanged event
   */
  private async handleMetadataChangeEvent(
    log: any,
    contractId: number,
    contractAddress: string,
  ): Promise<void> {
    try {
      const { oldName, newName, oldSymbol, newSymbol } = log.args;
      const blockNumber = log.blockNumber;
      const txHash = log.transactionHash;

      logger.info(
        `📝 [${contractAddress.slice(0, 10)}...] Metadata Changed: ${oldName} (${oldSymbol}) → ${newName} (${newSymbol}) [Block: ${blockNumber}]`,
      );

      // Get block to extract timestamp
      const client = this.contractManager.getClient();
      const block = await client.getBlock({ blockNumber });
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

      await this.db.setContractId(contractId);
      await this.db.insertMetadataChange(change);
      await this.db.updateIndexerState(blockNumber);

      logger.debug(`✅ Processed MetadataChanged event at block ${blockNumber}`);
    } catch (error) {
      logger.error("Error handling MetadataChanged event:", error);
    }
  }

  /**
   * Handle SharesBoughtBack event
   */
  private async handleBuybackEvent(
    log: any,
    contractId: number,
    contractAddress: string,
  ): Promise<void> {
    try {
      const { holder, amount } = log.args;
      const blockNumber = log.blockNumber;
      const txHash = log.transactionHash;
      const logIndex = log.logIndex;

      logger.info(
        `💰 [${contractAddress.slice(0, 10)}...] Buyback: ${amount.toString()} tokens from ${holder} [Block: ${blockNumber}]`,
      );

      // Get block to extract timestamp
      const client = this.contractManager.getClient();
      const block = await client.getBlock({ blockNumber });
      const blockTimestamp = new Date(Number(block.timestamp) * 1000);

      const buyback: BuybackEvent = {
        holder_address: holder,
        amount: amount.toString(),
        block_number: blockNumber,
        block_timestamp: blockTimestamp,
        tx_hash: txHash,
        log_index: logIndex,
      };

      await this.db.setContractId(contractId);
      await this.db.insertBuyback(buyback);
      await this.db.updateIndexerState(blockNumber);

      logger.debug(`✅ Processed SharesBoughtBack event at block ${blockNumber}`);
    } catch (error) {
      logger.error("Error handling SharesBoughtBack event:", error);
    }
  }

  /**
   * Sync historical events for all contracts
   */
  async syncAllHistoricalEvents(): Promise<void> {
    const addresses = this.contractManager.getContractAddresses();

    for (const address of addresses) {
      await this.syncHistoricalEvents(address);
    }
  }

  /**
   * Sync historical events for a specific contract
   */
  private async syncHistoricalEvents(address: string): Promise<void> {
    const contract = this.contractManager.getContract(address);
    if (!contract) {
      logger.error(`Contract ${address} not found in manager`);
      return;
    }

    const { instance, info } = contract;
    const contractId = info.id;

    // Get current block number
    const client = this.contractManager.getClient();
    const currentBlock = await client.getBlockNumber();

    // Get indexer state
    await this.db.setContractId(contractId);
    const state = await this.db.getIndexerState();
    const lastProcessedBlock = state.last_processed_block;

    if (lastProcessedBlock >= currentBlock) {
      logger.info(
        `✅ Contract ${info.name} is up to date (block ${lastProcessedBlock})`,
      );
      return;
    }

    const fromBlock = lastProcessedBlock + BigInt(1);
    logger.info(
      `🔄 Syncing ${info.name} from block ${fromBlock} to ${currentBlock}...`,
    );

    await this.db.setIndexerSyncing(true);

    try {
      // Fetch Transfer events
      const transfers = await instance.getEvents.Transfer({
        fromBlock,
        toBlock: currentBlock,
      });
      logger.info(`Found ${transfers.length} Transfer events`);
      for (const log of transfers) {
        await this.handleTransferEvent(log, contractId, address);
      }

      // Fetch AddressAllowlisted events
      const allowlists = await instance.getEvents.AddressAllowlisted({
        fromBlock,
        toBlock: currentBlock,
      });
      for (const log of allowlists) {
        await this.handleAllowlistAddEvent(log, contractId, address);
      }

      // Fetch AddressRemovedFromAllowlist events
      const removeAllowlists = await instance.getEvents.AddressRemovedFromAllowlist({
        fromBlock,
        toBlock: currentBlock,
      });
      for (const log of removeAllowlists) {
        await this.handleAllowlistRemoveEvent(log, contractId, address);
      }

      // Fetch StockSplit events
      const splits = await instance.getEvents.StockSplit({
        fromBlock,
        toBlock: currentBlock,
      });
      for (const log of splits) {
        await this.handleStockSplitEvent(log, contractId, address);
      }

      // Fetch MetadataChanged events
      const metadataChanges = await instance.getEvents.MetadataChanged({
        fromBlock,
        toBlock: currentBlock,
      });
      for (const log of metadataChanges) {
        await this.handleMetadataChangeEvent(log, contractId, address);
      }

      // Fetch SharesBoughtBack events
      const buybacks = await instance.getEvents.SharesBoughtBack({
        fromBlock,
        toBlock: currentBlock,
      });
      for (const log of buybacks) {
        await this.handleBuybackEvent(log, contractId, address);
      }

      await this.db.setIndexerSyncing(false);
      logger.info(`✅ ${info.name} synced successfully`);
    } catch (error) {
      await this.db.setIndexerSyncing(false);
      logger.error(`Error syncing ${info.name}:`, error);
      throw error;
    }
  }
}
