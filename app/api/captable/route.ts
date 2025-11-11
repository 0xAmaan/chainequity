import { NextRequest, NextResponse } from "next/server";

import { query } from "@/lib/db-api";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const block = searchParams.get("block");

    let result;

    if (block) {
      // Historical cap table at specific block
      result = await query(
        `SELECT * FROM get_cap_table_at_block($1) ORDER BY balance DESC`,
        [parseInt(block)],
      );
    } else {
      // Current cap table
      result = await query(
        `SELECT
          address,
          balance,
          ownership_percentage,
          is_allowlisted
        FROM current_cap_table
        ORDER BY balance DESC`,
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
