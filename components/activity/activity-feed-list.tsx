"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

interface ActivityFeedListProps {
  events: ActivityEvent[];
}

export const ActivityFeedList = ({ events }: ActivityFeedListProps) => {
  const getEventBadgeVariant = (eventType: string) => {
    switch (eventType) {
      case "transfer":
        return "default";
      case "allowlist_added":
        return "default";
      case "allowlist_removed":
        return "destructive";
      case "stock_split":
        return "default";
      case "buyback":
        return "destructive";
      case "metadata_change":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "transfer":
        return "→";
      case "allowlist_added":
        return "✓";
      case "allowlist_removed":
        return "✗";
      case "stock_split":
        return "⚡";
      case "buyback":
        return "←";
      case "metadata_change":
        return "✎";
      default:
        return "•";
    }
  };

  const formatEventTitle = (event: ActivityEvent) => {
    switch (event.event_type) {
      case "transfer":
        return `Transfer: ${event.amount} tokens`;
      case "allowlist_added":
        return `Address added to allowlist`;
      case "allowlist_removed":
        return `Address removed from allowlist`;
      case "stock_split":
        return `Stock split executed`;
      case "buyback":
        return `Buyback: ${event.amount} tokens`;
      case "metadata_change":
        return `Metadata updated`;
      default:
        return event.event_type;
    }
  };

  const formatEventDescription = (event: ActivityEvent) => {
    switch (event.event_type) {
      case "transfer":
        return `From ${event.from_address?.slice(0, 10)}... to ${event.to_address?.slice(0, 10)}...`;
      case "allowlist_added":
      case "allowlist_removed":
        return `Address: ${event.to_address?.slice(0, 10)}...${event.to_address?.slice(-8)}`;
      case "stock_split":
        return event.metadata
          ? `Multiplier: ${event.metadata.multiplier}x, Affected: ${event.metadata.affected_holders} holders`
          : "Stock split details";
      case "buyback":
        return `From ${event.from_address?.slice(0, 10)}...${event.from_address?.slice(-8)}`;
      case "metadata_change":
        return event.metadata
          ? `${event.metadata.old_name} → ${event.metadata.new_name}`
          : "Metadata change details";
      default:
        return "Event details";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getExplorerUrl = (txHash: string) => {
    // TODO: Update this based on your chain
    // For localhost/Anvil, there's no explorer
    // For Arbitrum Sepolia: https://sepolia.arbiscan.io/tx/${txHash}
    const chainId = process.env.NEXT_PUBLIC_CHAIN_ID;
    if (chainId === "421614") {
      return `https://sepolia.arbiscan.io/tx/${txHash}`;
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <Card key={index} className="hover:bg-muted/50 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="text-2xl">{getEventIcon(event.event_type)}</div>
                <div className="space-y-1">
                  <CardTitle className="text-lg">{formatEventTitle(event)}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {formatEventDescription(event)}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Block {event.block_number}</span>
                    <span>•</span>
                    <span>{formatTimestamp(event.timestamp)}</span>
                    {getExplorerUrl(event.tx_hash) && (
                      <>
                        <span>•</span>
                        <a
                          href={getExplorerUrl(event.tx_hash)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          View on Explorer ↗
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <Badge variant={getEventBadgeVariant(event.event_type)}>
                {event.event_type.replace(/_/g, " ")}
              </Badge>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
};
