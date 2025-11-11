import { NextRequest, NextResponse } from "next/server";

import { query } from "@/lib/db-api";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "100");
    const eventType = searchParams.get("type"); // filter by event type
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

    // Use the get_recent_activity function
    let queryText = `
      SELECT
        event_type,
        address1 as from_address,
        address2 as to_address,
        value as amount,
        block_number,
        block_timestamp as timestamp,
        tx_hash
      FROM get_recent_activity($1, $2)
    `;

    const params: any[] = [contractId, limit];

    // Add event type filter if specified
    if (eventType) {
      queryText += ` WHERE event_type = $3`;
      params.push(eventType);
    }

    const result = await query(queryText, params);

    // Fetch metadata for events that need it
    const transformedData = await Promise.all(
      result.rows.map(async (row: any) => {
        let metadata = null;

        // Fetch stock split metadata
        if (row.event_type === "stock_split") {
          const splitResult = await query(
            `SELECT multiplier, affected_holders FROM stock_splits WHERE contract_id = $1 AND tx_hash = $2`,
            [contractId, row.tx_hash],
          );
          if (splitResult.rows.length > 0) {
            metadata = {
              multiplier: splitResult.rows[0].multiplier,
              affected_holders: splitResult.rows[0].affected_holders,
            };
          }
        }

        // Fetch metadata change info
        if (row.event_type === "metadata_change") {
          const metadataResult = await query(
            `SELECT old_name, new_name, old_symbol, new_symbol FROM metadata_changes WHERE contract_id = $1 AND tx_hash = $2`,
            [contractId, row.tx_hash],
          );
          if (metadataResult.rows.length > 0) {
            metadata = {
              old_name: metadataResult.rows[0].old_name,
              new_name: metadataResult.rows[0].new_name,
              old_symbol: metadataResult.rows[0].old_symbol,
              new_symbol: metadataResult.rows[0].new_symbol,
            };
          }
        }

        return {
          event_type: row.event_type,
          from_address: row.from_address,
          to_address: row.to_address,
          amount: row.amount,
          block_number: row.block_number,
          timestamp: row.timestamp,
          tx_hash: row.tx_hash,
          metadata,
        };
      }),
    );

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
