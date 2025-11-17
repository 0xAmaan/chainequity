/**
 * Event listener that handles multiple contracts
 * Now using Convex exclusively (Postgres removed)
 */

import { convexIndexer } from "../lib/convex-client";
import { logger } from "../lib/logger";
import type { ContractManager } from "./contract-manager";

export class MultiContractListener {
  private contractManager: ContractManager;
  private unwatchFunctions: (() => void)[] = [];
  private refreshInterval: NodeJS.Timeout | null = null;
  private watchedContracts: Set<string> = new Set(); // Track watched contracts
  private convexContractIds: Map<string, any> = new Map(); // Map contract address to Convex ID

  constructor(contractManager: ContractManager) {
    this.contractManager = contractManager;
  }

  /**
   * Start listening to all contracts
   */
  async start(): Promise<void> {
    logger.info("🎧 Starting multi-contract event listener...");

    const addresses = this.contractManager.getContractAddresses();

    if (addresses.length === 0) {
      logger.warn("⚠️  No contracts found to watch. Deploy a contract first.");
    } else {
      for (const address of addresses) {
        await this.watchContract(address);
        this.watchedContracts.add(address.toLowerCase());
      }
    }

    // Watch blocks for new contract deployments
    const client = this.contractManager.getClient();
    logger.info("👁️  Watching blocks for new contracts...");

    const unwatchBlocks = client.watchBlocks({
      onBlock: async (block) => {
        logger.info(`📦 New block ${block.number} detected by watchBlocks`);

        // Check database for new contracts
        const newAddresses = await this.contractManager.refreshContracts();
        if (newAddresses.length > 0) {
          logger.info(
            `🆕 Block ${block.number}: Detected ${newAddresses.length} new contract(s)`,
          );

          // Watch only the new contracts
          for (const address of newAddresses) {
            const addressLower = address.toLowerCase();
            if (!this.watchedContracts.has(addressLower)) {
              await this.watchContract(address);
              this.watchedContracts.add(addressLower);
            }
          }
        }
      },
      onError: (error) => {
        logger.error("Error watching blocks:", error);
      },
      pollingInterval: 1000, // Check every second (Anvil mines on-demand)
    });

    this.unwatchFunctions.push(unwatchBlocks);

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
    const client = this.contractManager.getClient();

    logger.info(`👁️  Watching contract: ${info.name} (${address})`);

    // Watch Transfer events - using client.watchContractEvent instead of instance.watchEvent
    logger.info(`🔧 Setting up Transfer event watcher for ${address}`);
    const unwatchTransfer = client.watchContractEvent({
      address: address as `0x${string}`,
      abi: instance.abi,
      eventName: "Transfer",
      pollingInterval: 1000,
      onLogs: async (logs: any[]) => {
        logger.info(
          `📨 [LIVE] Received ${logs.length} Transfer event(s) for ${address.slice(0, 10)}...`,
        );
        for (const log of logs) {
          logger.info(
            `📨 [LIVE] Processing Transfer: block ${log.blockNumber}, tx ${log.transactionHash}`,
          );
          await this.handleTransferEvent(log, address);
        }
      },
      onError: (error: any) => {
        logger.error(`Error watching Transfer events for ${address}:`, error);
      },
    });
    this.unwatchFunctions.push(unwatchTransfer);
    logger.info(`✅ Transfer event watcher active for ${address}`);

    // Watch AddressAllowlisted events
    logger.info(`🔧 Setting up AddressAllowlisted event watcher for ${address}`);
    const unwatchAllowlist = client.watchContractEvent({
      address: address as `0x${string}`,
      abi: instance.abi,
      eventName: "AddressAllowlisted",
      pollingInterval: 1000,
      onLogs: async (logs: any[]) => {
        logger.info(
          `📨 [LIVE] Received ${logs.length} AddressAllowlisted event(s) for ${address.slice(0, 10)}...`,
        );
        for (const log of logs) {
          logger.info(
            `📨 [LIVE] Processing AddressAllowlisted: block ${log.blockNumber}, tx ${log.transactionHash}`,
          );
          await this.handleAllowlistAddEvent(log, address);
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
    logger.info(`✅ AddressAllowlisted event watcher active for ${address}`);

    // Watch AddressRemovedFromAllowlist events
    logger.info(
      `🔧 Setting up AddressRemovedFromAllowlist event watcher for ${address}`,
    );
    const unwatchRemoveAllowlist = client.watchContractEvent({
      address: address as `0x${string}`,
      abi: instance.abi,
      eventName: "AddressRemovedFromAllowlist",
      pollingInterval: 1000,
      onLogs: async (logs: any[]) => {
        logger.info(
          `📨 [LIVE] Received ${logs.length} AddressRemovedFromAllowlist event(s) for ${address.slice(0, 10)}...`,
        );
        for (const log of logs) {
          logger.info(
            `📨 [LIVE] Processing AddressRemovedFromAllowlist: block ${log.blockNumber}, tx ${log.transactionHash}`,
          );
          await this.handleAllowlistRemoveEvent(log, address);
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
    logger.info(`✅ AddressRemovedFromAllowlist event watcher active for ${address}`);

    // Watch StockSplit events
    logger.info(`🔧 Setting up StockSplit event watcher for ${address}`);
    const unwatchSplit = client.watchContractEvent({
      address: address as `0x${string}`,
      abi: instance.abi,
      eventName: "StockSplit",
      pollingInterval: 1000,
      onLogs: async (logs: any[]) => {
        logger.info(
          `📨 [LIVE] Received ${logs.length} StockSplit event(s) for ${address.slice(0, 10)}...`,
        );
        for (const log of logs) {
          logger.info(
            `📨 [LIVE] Processing StockSplit: block ${log.blockNumber}, tx ${log.transactionHash}`,
          );
          await this.handleStockSplitEvent(log, address);
        }
      },
      onError: (error: any) => {
        logger.error(`Error watching StockSplit events for ${address}:`, error);
      },
    });
    this.unwatchFunctions.push(unwatchSplit);
    logger.info(`✅ StockSplit event watcher active for ${address}`);

    // Watch MetadataChanged events
    logger.info(`🔧 Setting up MetadataChanged event watcher for ${address}`);
    const unwatchMetadata = client.watchContractEvent({
      address: address as `0x${string}`,
      abi: instance.abi,
      eventName: "MetadataChanged",
      pollingInterval: 1000,
      onLogs: async (logs: any[]) => {
        logger.info(
          `📨 [LIVE] Received ${logs.length} MetadataChanged event(s) for ${address.slice(0, 10)}...`,
        );
        for (const log of logs) {
          logger.info(
            `📨 [LIVE] Processing MetadataChanged: block ${log.blockNumber}, tx ${log.transactionHash}`,
          );
          await this.handleMetadataChangeEvent(log, address);
        }
      },
      onError: (error: any) => {
        logger.error(`Error watching MetadataChanged events for ${address}:`, error);
      },
    });
    this.unwatchFunctions.push(unwatchMetadata);
    logger.info(`✅ MetadataChanged event watcher active for ${address}`);

    // Watch SharesBoughtBack events
    logger.info(`🔧 Setting up SharesBoughtBack event watcher for ${address}`);
    const unwatchBuyback = client.watchContractEvent({
      address: address as `0x${string}`,
      abi: instance.abi,
      eventName: "SharesBoughtBack",
      pollingInterval: 1000,
      onLogs: async (logs: any[]) => {
        logger.info(
          `📨 [LIVE] Received ${logs.length} SharesBoughtBack event(s) for ${address.slice(0, 10)}...`,
        );
        for (const log of logs) {
          logger.info(
            `📨 [LIVE] Processing SharesBoughtBack: block ${log.blockNumber}, tx ${log.transactionHash}`,
          );
          await this.handleBuybackEvent(log, address);
        }
      },
      onError: (error: any) => {
        logger.error(`Error watching SharesBoughtBack events for ${address}:`, error);
      },
    });
    this.unwatchFunctions.push(unwatchBuyback);
    logger.info(`✅ SharesBoughtBack event watcher active for ${address}`);

    logger.info(`🎉 All event watchers configured for ${address}`);
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
   * Get or cache Convex contract ID from contract address
   */
  private async getConvexContractId(contractAddress: string): Promise<any> {
    // Check cache first
    if (this.convexContractIds.has(contractAddress)) {
      return this.convexContractIds.get(contractAddress);
    }

    // Look up contract in Convex
    const convexContract = await convexIndexer.getContractByAddress(contractAddress);

    if (convexContract) {
      this.convexContractIds.set(contractAddress, convexContract._id);
      return convexContract._id;
    }

    // Contract doesn't exist in Convex yet
    logger.warn(`⚠️  Contract ${contractAddress} not found in Convex yet`);
    return null;
  }

  /**
   * Handle Transfer event
   */
  private async handleTransferEvent(log: any, contractAddress: string): Promise<void> {
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

      // Get Convex contract ID
      const convexContractId = await this.getConvexContractId(contractAddress);
      if (!convexContractId) {
        logger.warn(`⚠️  Skipping Transfer event - contract not in Convex`);
        return;
      }

      // Insert transfer event to Convex
      await convexIndexer.insertTransfer({
        contractId: convexContractId,
        fromAddress: from,
        toAddress: to,
        amount: value.toString(),
        blockNumber: blockNumber.toString(),
        blockTimestamp: blockTimestamp.getTime(),
        txHash,
        logIndex,
      });

      // Update balances in Convex
      const zeroAddress = "0x0000000000000000000000000000000000000000";

      if (from !== zeroAddress) {
        await convexIndexer.updateBalance({
          contractId: convexContractId,
          address: from,
          amount: value.toString(),
          isCredit: false,
          blockNumber: blockNumber.toString(),
        });
      }

      if (to !== zeroAddress) {
        await convexIndexer.updateBalance({
          contractId: convexContractId,
          address: to,
          amount: value.toString(),
          isCredit: true,
          blockNumber: blockNumber.toString(),
        });
      }

      // Update indexer state in Convex
      await convexIndexer.updateIndexerState(convexContractId, blockNumber.toString());

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
    contractAddress: string,
  ): Promise<void> {
    try {
      const { account } = log.args;
      const blockNumber = log.blockNumber;
      const txHash = log.transactionHash;

      logger.info(
        `✅ [${contractAddress.slice(0, 10)}...] Address allowlisted: ${account} [Block: ${blockNumber}]`,
      );

      // Get Convex contract ID
      const convexContractId = await this.getConvexContractId(contractAddress);
      if (!convexContractId) {
        logger.warn(`⚠️  Skipping AddressAllowlisted event - contract not in Convex`);
        return;
      }

      // Get block to extract timestamp
      const client = this.contractManager.getClient();
      const block = await client.getBlock({ blockNumber });
      const blockTimestamp = Number(block.timestamp) * 1000;

      // Add to allowlist in Convex
      await convexIndexer.addToAllowlist({
        contractId: convexContractId,
        address: account,
        blockNumber: blockNumber.toString(),
        blockTimestamp,
        txHash,
      });

      // Update indexer state in Convex
      await convexIndexer.updateIndexerState(convexContractId, blockNumber.toString());

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
    contractAddress: string,
  ): Promise<void> {
    try {
      const { account } = log.args;
      const blockNumber = log.blockNumber;
      const txHash = log.transactionHash;

      logger.info(
        `❌ [${contractAddress.slice(0, 10)}...] Address removed from allowlist: ${account} [Block: ${blockNumber}]`,
      );

      // Get Convex contract ID
      const convexContractId = await this.getConvexContractId(contractAddress);
      if (!convexContractId) {
        logger.warn(
          `⚠️  Skipping AddressRemovedFromAllowlist event - contract not in Convex`,
        );
        return;
      }

      // Get block to extract timestamp
      const client = this.contractManager.getClient();
      const block = await client.getBlock({ blockNumber });
      const blockTimestamp = Number(block.timestamp) * 1000;

      // Remove from allowlist in Convex
      await convexIndexer.removeFromAllowlist({
        contractId: convexContractId,
        address: account,
        blockNumber: blockNumber.toString(),
        blockTimestamp,
        txHash,
      });

      // Update indexer state in Convex
      await convexIndexer.updateIndexerState(convexContractId, blockNumber.toString());

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

      // Get Convex contract ID
      const convexContractId = await this.getConvexContractId(contractAddress);
      if (!convexContractId) {
        logger.warn(`⚠️  Skipping StockSplit event - contract not in Convex`);
        return;
      }

      // Insert stock split to Convex
      await convexIndexer.insertStockSplit({
        contractId: convexContractId,
        multiplier: Number(multiplier),
        newTotalSupply: newTotalSupply.toString(),
        blockNumber: blockNumber.toString(),
        blockTimestamp: blockTimestamp.getTime(),
        txHash,
        affectedHolders: 0, // Will be calculated by Convex if needed
      });

      // Update indexer state in Convex
      await convexIndexer.updateIndexerState(convexContractId, blockNumber.toString());

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

      // Get Convex contract ID
      const convexContractId = await this.getConvexContractId(contractAddress);
      if (!convexContractId) {
        logger.warn(`⚠️  Skipping MetadataChanged event - contract not in Convex`);
        return;
      }

      // Insert metadata change to Convex
      await convexIndexer.insertMetadataChange({
        contractId: convexContractId,
        oldName,
        newName,
        oldSymbol,
        newSymbol,
        blockNumber: blockNumber.toString(),
        blockTimestamp: blockTimestamp.getTime(),
        txHash,
      });

      // Update indexer state in Convex
      await convexIndexer.updateIndexerState(convexContractId, blockNumber.toString());

      logger.debug(`✅ Processed MetadataChanged event at block ${blockNumber}`);
    } catch (error) {
      logger.error("Error handling MetadataChanged event:", error);
    }
  }

  /**
   * Handle SharesBoughtBack event
   */
  private async handleBuybackEvent(log: any, contractAddress: string): Promise<void> {
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

      // Get Convex contract ID
      const convexContractId = await this.getConvexContractId(contractAddress);
      if (!convexContractId) {
        logger.warn(`⚠️  Skipping SharesBoughtBack event - contract not in Convex`);
        return;
      }

      // Insert buyback to Convex
      await convexIndexer.insertBuyback({
        contractId: convexContractId,
        holderAddress: holder,
        amount: amount.toString(),
        blockNumber: blockNumber.toString(),
        blockTimestamp: blockTimestamp.getTime(),
        txHash,
        logIndex,
      });

      // Update indexer state in Convex
      await convexIndexer.updateIndexerState(convexContractId, blockNumber.toString());

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

    // Get current block number
    const client = this.contractManager.getClient();
    const currentBlock = await client.getBlockNumber();

    // Get Convex contract ID
    const convexContractId = await this.getConvexContractId(address);
    if (!convexContractId) {
      logger.error(`⚠️  Contract ${address} not found in Convex - cannot sync`);
      return;
    }

    // Get indexer state from Convex
    const state = await convexIndexer.getIndexerState(convexContractId);
    const lastProcessedBlock = state?.lastProcessedBlock
      ? BigInt(state.lastProcessedBlock)
      : BigInt(0);

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

    // Set syncing status
    await convexIndexer.setIndexerSyncing(convexContractId, true);

    try {
      // Fetch Transfer events
      logger.info(
        `🔍 [HISTORICAL] Querying Transfer events for ${address} from block ${fromBlock} to ${currentBlock}`,
      );
      const transfers = await instance.getEvents.Transfer({
        fromBlock,
        toBlock: currentBlock,
      });
      logger.info(`📊 [HISTORICAL] Found ${transfers.length} Transfer event(s)`);
      for (const log of transfers) {
        logger.info(
          `📊 [HISTORICAL] Processing Transfer at block ${log.blockNumber}, tx ${log.transactionHash}`,
        );
        await this.handleTransferEvent(log, address);
      }

      // Fetch AddressAllowlisted events
      logger.info(
        `🔍 [HISTORICAL] Querying AddressAllowlisted events for ${address} from block ${fromBlock} to ${currentBlock}`,
      );
      const allowlists = await instance.getEvents.AddressAllowlisted({
        fromBlock,
        toBlock: currentBlock,
      });
      logger.info(
        `📊 [HISTORICAL] Found ${allowlists.length} AddressAllowlisted event(s)`,
      );
      for (const log of allowlists) {
        logger.info(
          `📊 [HISTORICAL] Processing AddressAllowlisted at block ${log.blockNumber}, tx ${log.transactionHash}`,
        );
        await this.handleAllowlistAddEvent(log, address);
      }

      // Fetch AddressRemovedFromAllowlist events
      logger.info(
        `🔍 [HISTORICAL] Querying AddressRemovedFromAllowlist events for ${address} from block ${fromBlock} to ${currentBlock}`,
      );
      const removeAllowlists = await instance.getEvents.AddressRemovedFromAllowlist({
        fromBlock,
        toBlock: currentBlock,
      });
      logger.info(
        `📊 [HISTORICAL] Found ${removeAllowlists.length} AddressRemovedFromAllowlist event(s)`,
      );
      for (const log of removeAllowlists) {
        logger.info(
          `📊 [HISTORICAL] Processing AddressRemovedFromAllowlist at block ${log.blockNumber}, tx ${log.transactionHash}`,
        );
        await this.handleAllowlistRemoveEvent(log, address);
      }

      // Fetch StockSplit events
      logger.info(
        `🔍 [HISTORICAL] Querying StockSplit events for ${address} from block ${fromBlock} to ${currentBlock}`,
      );
      const splits = await instance.getEvents.StockSplit({
        fromBlock,
        toBlock: currentBlock,
      });
      logger.info(`📊 [HISTORICAL] Found ${splits.length} StockSplit event(s)`);
      for (const log of splits) {
        logger.info(
          `📊 [HISTORICAL] Processing StockSplit at block ${log.blockNumber}, tx ${log.transactionHash}`,
        );
        await this.handleStockSplitEvent(log, address);
      }

      // Fetch MetadataChanged events
      logger.info(
        `🔍 [HISTORICAL] Querying MetadataChanged events for ${address} from block ${fromBlock} to ${currentBlock}`,
      );
      const metadataChanges = await instance.getEvents.MetadataChanged({
        fromBlock,
        toBlock: currentBlock,
      });
      logger.info(
        `📊 [HISTORICAL] Found ${metadataChanges.length} MetadataChanged event(s)`,
      );
      for (const log of metadataChanges) {
        logger.info(
          `📊 [HISTORICAL] Processing MetadataChanged at block ${log.blockNumber}, tx ${log.transactionHash}`,
        );
        await this.handleMetadataChangeEvent(log, address);
      }

      // Fetch SharesBoughtBack events
      logger.info(
        `🔍 [HISTORICAL] Querying SharesBoughtBack events for ${address} from block ${fromBlock} to ${currentBlock}`,
      );
      const buybacks = await instance.getEvents.SharesBoughtBack({
        fromBlock,
        toBlock: currentBlock,
      });
      logger.info(
        `📊 [HISTORICAL] Found ${buybacks.length} SharesBoughtBack event(s)`,
      );
      for (const log of buybacks) {
        logger.info(
          `📊 [HISTORICAL] Processing SharesBoughtBack at block ${log.blockNumber}, tx ${log.transactionHash}`,
        );
        await this.handleBuybackEvent(log, address);
      }

      // Update indexer state to current block (even if no events found)
      await convexIndexer.updateIndexerState(
        convexContractId,
        currentBlock.toString(),
      );
      await convexIndexer.setIndexerSyncing(convexContractId, false);
      logger.info(`✅ ${info.name} synced successfully to block ${currentBlock}`);
    } catch (error) {
      await convexIndexer.setIndexerSyncing(convexContractId, false);
      logger.error(`Error syncing ${info.name}:`, error);
      throw error;
    }
  }
}
