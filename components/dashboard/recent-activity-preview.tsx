"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useContract } from "@/lib/frontend/contract-context";
import { api } from "@/convex/_generated/api";

interface ActivityEvent {
  event_type: string;
  from_address: string | null;
  to_address: string | null;
  amount: string | null;
  block_number: string;
  tx_hash: string;
  timestamp: string;
  metadata: any;
}

export const RecentActivityPreview = () => {
  const { contractAddress, isLoading: contractLoading } = useContract();

  // Get contract from Convex
  const contract = useQuery(
    api.contracts.getByAddress,
    contractAddress ? { contractAddress: contractAddress.toLowerCase() } : "skip"
  );

  // Get recent activity (auto-updates in real-time!)
  const events = useQuery(
    api.activity.getRecent,
    contract?._id ? { contractId: contract._id, limit: 5 } : "skip"
  );

  const loading = contractLoading || contract === undefined || events === undefined;

  const getEventBadgeVariant = (eventType: string): "default" | "secondary" => {
    return eventType === "transfer" ? "secondary" : "default";
  };

  const formatTokenAmount = (amount: string | null) => {
    if (!amount) return "0";
    const num = parseFloat(amount);
    const humanReadable = num / Math.pow(10, 18);
    return humanReadable.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const formatEventTitle = (event: ActivityEvent) => {
    switch (event.event_type) {
      case "transfer":
        return "Transfer";
      case "allowlist_added":
        return "Allowlist Added";
      case "allowlist_removed":
        return "Allowlist Removed";
      case "stock_split":
        return "Stock Split";
      case "buyback":
        return "Buyback";
      case "metadata_change":
        return "Metadata Changed";
      default:
        return event.event_type;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (hours > 24) {
      return date.toLocaleDateString();
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return "Just now";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg">Recent Activity</CardTitle>
        <Link href="/activity">
          <Button variant="ghost" size="sm" className="gap-1">
            View All
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {events.map((event, index) => (
              <div
                key={index}
                className="flex items-center justify-between border-b border-border last:border-0 pb-3 last:pb-0"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={getEventBadgeVariant(event.event_type)}>
                      {formatEventTitle(event)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(event.timestamp)}
                    </span>
                  </div>
                  {event.amount && (
                    <p className="text-sm font-medium">
                      {formatTokenAmount(event.amount)} tokens
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  Block {event.block_number}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
