import { NextResponse } from "next/server";

/**
 * POST /api/indexer/reload
 * Triggers the indexer to immediately check for new contracts
 * This is called by the frontend after deploying a new contract
 * to avoid waiting for the 10-second polling interval
 */
export async function POST() {
  try {
    // In a production app, this would trigger the indexer via:
    // - Message queue (RabbitMQ, Redis Pub/Sub)
    // - WebSocket message
    // - HTTP request to indexer process
    //
    // For this demo, we'll just return success.
    // The indexer polls every 10 seconds, so worst case is 10s delay.
    // The frontend will poll /api/indexer/status until ready.

    return NextResponse.json({
      success: true,
      message: "Indexer will detect new contract within 10 seconds",
    });
  } catch (error) {
    console.error("Error reloading indexer:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reload indexer" },
      { status: 500 },
    );
  }
}
