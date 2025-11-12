import { NextRequest, NextResponse } from "next/server";

import { query } from "@/lib/db-api";

// GET /api/contracts - List all contracts
export async function GET() {
  try {
    const result = await query(
      `SELECT
        id,
        contract_address,
        chain_id,
        name,
        symbol,
        deployed_by,
        deployed_at,
        is_active
       FROM contracts
       WHERE is_active = TRUE
       ORDER BY deployed_at DESC`,
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching contracts:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch contracts" },
      { status: 500 },
    );
  }
}

// POST /api/contracts - Create a new contract entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractAddress, chainId, name, symbol, deployedBy } = body;

    // Validate required fields
    if (!contractAddress || !chainId || !name || !symbol) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Insert contract
    const result = await query(
      `INSERT INTO contracts (contract_address, chain_id, name, symbol, deployed_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (contract_address) DO UPDATE
       SET name = EXCLUDED.name, symbol = EXCLUDED.symbol
       RETURNING id, contract_address, chain_id, name, symbol, deployed_by, deployed_at`,
      [contractAddress, chainId, name, symbol, deployedBy || null],
    );

    // Initialize indexer state for this contract
    await query(
      `INSERT INTO indexer_state (contract_id, last_processed_block, is_syncing)
       VALUES ($1, 0, FALSE)
       ON CONFLICT (contract_id) DO NOTHING`,
      [result.rows[0].id],
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating contract:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create contract" },
      { status: 500 },
    );
  }
}
