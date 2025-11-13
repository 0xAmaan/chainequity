import { NextRequest, NextResponse } from "next/server";

import { query } from "@/lib/db-api";

/**
 * GET /api/indexer/status?address={contractAddress}
 * Check if the indexer has started tracking a contract
 */
export async function GET(request: NextRequest) {
  try {
    const contractAddress = request.nextUrl.searchParams.get("address");

    if (!contractAddress) {
      return NextResponse.json(
        { success: false, error: "Missing contract address" },
        { status: 400 },
      );
    }

    // Check if contract exists in DB
    const contractResult = await query(
      "SELECT id FROM contracts WHERE LOWER(contract_address) = LOWER($1) AND is_active = TRUE",
      [contractAddress],
    );

    if (contractResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        ready: false,
        reason: "contract_not_found",
        message: "Contract not registered in database",
      });
    }

    const contractId = contractResult.rows[0].id;

    // Check if indexer has initialized state for this contract
    const stateResult = await query(
      "SELECT last_processed_block, is_syncing FROM indexer_state WHERE contract_id = $1",
      [contractId],
    );

    if (stateResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        ready: false,
        reason: "not_initialized",
        message: "Indexer has not initialized this contract yet",
      });
    }

    const state = stateResult.rows[0];
    const lastBlock = BigInt(state.last_processed_block);

    // Contract is ready if:
    // 1. Indexer state exists
    // 2. Not currently syncing
    // 3. Has processed at least block 0 (initialization complete)
    const ready = !state.is_syncing && lastBlock >= 0n;

    return NextResponse.json({
      success: true,
      ready,
      lastBlock: lastBlock.toString(),
      isSyncing: state.is_syncing,
      contractId,
    });
  } catch (error) {
    console.error("Error checking indexer status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check indexer status" },
      { status: 500 },
    );
  }
}
