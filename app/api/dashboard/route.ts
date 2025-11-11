import { NextResponse } from "next/server";

import { query } from "@/lib/db-api";

export async function GET() {
  try {
    // Get total supply from latest state (cast to numeric since balance is stored as string)
    const totalSupplyResult = await query(
      `SELECT SUM(balance::NUMERIC) as total_supply FROM current_cap_table`,
    );

    // Get total holders count (cast to numeric for comparison)
    const holdersResult = await query(
      `SELECT COUNT(*) as total_holders FROM current_cap_table WHERE balance::NUMERIC > 0`,
    );

    // Get recent activity count (last 24 hours)
    const recentActivityResult = await query(
      `SELECT COUNT(*) as recent_count
       FROM recent_activity
       WHERE block_timestamp > NOW() - INTERVAL '24 hours'`,
    );

    // Get contract metadata (we'll need to add this to recent_activity or a metadata table)
    // For now, we'll fetch the latest block number
    const latestBlockResult = await query(
      `SELECT MAX(block_number) as latest_block FROM recent_activity`,
    );

    // Get top holder percentage
    const topHolderResult = await query(
      `SELECT MAX(ownership_percentage) as top_holder_pct FROM current_cap_table`,
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
