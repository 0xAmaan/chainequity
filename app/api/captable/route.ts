import { NextRequest, NextResponse } from "next/server";

import { query } from "@/lib/db-api";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const block = searchParams.get("block");
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

    let result;

    if (block) {
      // Historical cap table at specific block
      result = await query(
        `SELECT * FROM get_cap_table_at_block($1, $2) ORDER BY balance DESC`,
        [contractId, parseInt(block)],
      );
    } else {
      // Current cap table
      result = await query(
        `SELECT * FROM get_current_cap_table($1) ORDER BY balance DESC`,
        [contractId],
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows,
      block: block ? parseInt(block) : null,
    });
  } catch (error) {
    console.error("Cap table API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
