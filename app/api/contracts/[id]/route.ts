import { NextRequest, NextResponse } from "next/server";

import { query as dbQuery } from "@/lib/db-api";

// GET /api/contracts/[id] - Get specific contract details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    // Await params if it's a Promise (Next.js 15+)
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;

    // Support both numeric ID and contract address
    const isNumeric = /^\d+$/.test(id);

    const queryText = isNumeric
      ? "SELECT * FROM contracts WHERE id = $1"
      : "SELECT * FROM contracts WHERE LOWER(contract_address) = LOWER($1)";

    const result = await dbQuery(queryText, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Contract not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error fetching contract:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch contract" },
      { status: 500 },
    );
  }
}
