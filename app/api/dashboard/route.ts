import { NextRequest, NextResponse } from "next/server";

import { query } from "@/lib/db-api";

export async function GET(request: NextRequest) {
  try {
    // Get contract address from query params
    const searchParams = request.nextUrl.searchParams;
    const contractAddress = searchParams.get("address");

    if (!contractAddress) {
      return NextResponse.json(
        { success: false, error: "Contract address is required" },
        { status: 400 },
      );
    }

    // Get contract ID from address
    const contractResult = await query(
      "SELECT id FROM contracts WHERE LOWER(contract_address) = LOWER($1)",
      [contractAddress],
    );

    if (contractResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Contract not found" },
        { status: 404 },
      );
    }

    const contractId = contractResult.rows[0].id;

    // Get total supply from cap table function
    const totalSupplyResult = await query(
      `SELECT SUM(balance::NUMERIC) as total_supply
       FROM get_current_cap_table($1)`,
      [contractId],
    );

    // Get total holders count
    const holdersResult = await query(
      `SELECT COUNT(*) as total_holders
       FROM get_current_cap_table($1)
       WHERE balance::NUMERIC > 0`,
      [contractId],
    );

    // Get recent activity count (last 24 hours)
    const recentActivityResult = await query(
      `SELECT COUNT(*) as recent_count
       FROM get_recent_activity($1, 1000) as activity
       WHERE activity.block_timestamp > NOW() - INTERVAL '24 hours'`,
      [contractId],
    );

    // Get latest block number
    const latestBlockResult = await query(
      `SELECT MAX(activity.block_number) as latest_block
       FROM get_recent_activity($1, 1000) as activity`,
      [contractId],
    );

    // Get top holder percentage
    const topHolderResult = await query(
      `SELECT MAX(ownership_percentage) as top_holder_pct
       FROM get_current_cap_table($1)`,
      [contractId],
    );

    return NextResponse.json({
      success: true,
      data: {
        totalSupply: totalSupplyResult.rows[0]?.total_supply?.toString() || "0",
        totalHolders: parseInt(holdersResult.rows[0]?.total_holders || "0"),
        recentActivity: parseInt(recentActivityResult.rows[0]?.recent_count || "0"),
        latestBlock: parseInt(latestBlockResult.rows[0]?.latest_block || "0"),
        topHolderPercentage: parseFloat(
          topHolderResult.rows[0]?.top_holder_pct || "0",
        ),
      },
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
