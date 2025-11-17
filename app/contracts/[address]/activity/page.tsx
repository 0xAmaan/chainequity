"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ActivityFeedList } from "@/components/activity/activity-feed-list";
import { useContract } from "@/lib/frontend/contract-context";
import { api } from "@/convex/_generated/api";

export default function ActivityPage() {
  const { contractAddress, isLoading: contractLoading } = useContract();
  const [eventType, setEventType] = useState<string>("all");

  // Get contract from Convex
  const contract = useQuery(
    api.contracts.getByAddress,
    contractAddress ? { contractAddress: contractAddress.toLowerCase() } : "skip"
  );

  // Get activity events from Convex (auto-updates in real-time!)
  const events = useQuery(
    api.activity.getRecent,
    contract?._id
      ? {
          contractId: contract._id,
          limit: 100,
          eventType: eventType === "all" ? undefined : eventType,
        }
      : "skip"
  );

  const loading = contractLoading || contract === undefined || events === undefined;

  const handleTypeChange = (value: string) => {
    setEventType(value);
  };

  return (
    <main className="container mx-auto px-4 py-6 space-y-4">
        {/* Header with Compact Filter Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Activity Feed</h2>
            <p className="text-sm text-muted-foreground">
              Track on-chain events
            </p>
          </div>

          {/* Compact Filter Bar */}
          <div className="flex items-center gap-2">
            <Select value={eventType} onValueChange={handleTypeChange}>
              <SelectTrigger className="w-40 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="transfer">Transfers</SelectItem>
                <SelectItem value="allowlist_added">Allowlist Added</SelectItem>
                <SelectItem value="allowlist_removed">Allowlist Removed</SelectItem>
                <SelectItem value="stock_split">Stock Splits</SelectItem>
                <SelectItem value="buyback">Buybacks</SelectItem>
                <SelectItem value="metadata_change">Metadata Changes</SelectItem>
              </SelectContent>
            </Select>
            <div className="px-2 py-1 text-xs text-green-400 bg-green-950/30 rounded border border-green-700">
              ⚡ Live
            </div>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Loading activity...</p>
            </CardContent>
          </Card>
        ) : !events || events.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                No events found. Make sure the indexer is running.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <ActivityFeedList events={events} />
          </>
        )}
    </main>
  );
}
