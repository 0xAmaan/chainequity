"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ActivityFeedList } from "@/components/activity/activity-feed-list";

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
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventType, setEventType] = useState<string>("all");
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchEvents = async (type?: string) => {
    setLoading(true);
    try {
      const url =
        type && type !== "all"
          ? `/api/activity?type=${type}&limit=100`
          : "/api/activity?limit=100";

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
    fetchEvents(eventType);
  }, [eventType]);

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
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Recent Activity</h2>
            <p className="text-muted-foreground">
              Track all on-chain events and transactions
            </p>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Filter events by type</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="event-type">Event Type</Label>
                <Select value={eventType} onValueChange={handleTypeChange}>
                  <SelectTrigger id="event-type">
                    <SelectValue placeholder="Select event type" />
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
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={autoRefresh ? "default" : "outline"}
                  onClick={() => setAutoRefresh(!autoRefresh)}
                >
                  {autoRefresh ? "Auto-Refresh On" : "Auto-Refresh Off"}
                </Button>
                <Button onClick={() => fetchEvents(eventType)} variant="outline" disabled={loading}>
                  {loading ? "Loading..." : "Refresh"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Activity Feed */}
          {!loading && events.length > 0 && <ActivityFeedList events={events} />}

          {!loading && events.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>No Activity</CardTitle>
                <CardDescription>
                  No events found. Make sure the indexer is running and has processed events.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {loading && (
            <Card>
              <CardHeader>
                <CardTitle>Loading...</CardTitle>
              </CardHeader>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
