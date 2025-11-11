"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ActivityFeedList } from "@/components/activity/activity-feed-list";
import { useContract } from "@/lib/frontend/contract-context";

interface ActivityEvent {
  event_type: string;
  from_address: string | null;
  to_address: string | null;
  amount: string | null;
  block_number: number;
  tx_hash: string;
  timestamp: string;
  metadata: any;
}

export default function ActivityPage() {
  const { contractAddress, isLoading: contractLoading } = useContract();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventType, setEventType] = useState<string>("all");
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchEvents = async (type?: string) => {
    if (!contractAddress) return;

    setLoading(true);
    try {
      const typeParam = type && type !== "all" ? `&type=${type}` : "";
      const url = `/api/activity?address=${contractAddress}${typeParam}&limit=100`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setEvents(data.data);
      } else {
        alert(`Failed to fetch activity: ${data.error}`);
      }
    } catch (error) {
      console.error("Failed to fetch activity:", error);
      alert("Failed to fetch activity feed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!contractLoading && contractAddress) {
      fetchEvents(eventType);
    }
  }, [eventType, contractAddress, contractLoading]);

  // Auto-refresh every 10 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchEvents(eventType);
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, eventType]);

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
            <Button
              variant={autoRefresh ? "default" : "outline"}
              onClick={() => setAutoRefresh(!autoRefresh)}
              size="sm"
            >
              {autoRefresh ? "Auto On" : "Auto Off"}
            </Button>
            <Button onClick={() => fetchEvents(eventType)} variant="outline" size="sm" disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Loading activity...</p>
            </CardContent>
          </Card>
        ) : events.length === 0 ? (
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
