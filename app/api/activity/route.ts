import { NextRequest, NextResponse } from "next/server";

import { query } from "@/lib/db-api";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "100");
    const eventType = searchParams.get("type"); // filter by event type

    let queryText = `
      SELECT
        event_type,
        address1 as from_address,
        address2 as to_address,
        value as amount,
        block_number,
        block_timestamp as timestamp,
        tx_hash
      FROM recent_activity
    `;

    const params: any[] = [];

    // Add event type filter if specified
    if (eventType) {
      queryText += ` WHERE event_type = $1`;
      params.push(eventType);
      queryText += ` ORDER BY block_number DESC, block_timestamp DESC LIMIT $2`;
      params.push(limit);
    } else {
      queryText += ` ORDER BY block_number DESC, block_timestamp DESC LIMIT $1`;
      params.push(limit);
    }

    const result = await query(queryText, params);

    // Transform data to add metadata field for frontend
    const transformedData = result.rows.map((row: any) => ({
      event_type: row.event_type,
      from_address: row.from_address,
      to_address: row.to_address,
      amount: row.amount,
      block_number: row.block_number,
      timestamp: row.timestamp,
      tx_hash: row.tx_hash,
      metadata: null, // Can be populated from other tables if needed
    }));

    return NextResponse.json({
      success: true,
      data: transformedData,
      count: result.rowCount,
    });
  } catch (error) {
    console.error("Activity API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
