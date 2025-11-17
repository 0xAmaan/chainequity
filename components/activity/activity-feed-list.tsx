"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyableAddress } from "@/components/ui/copyable-address";

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
        return `Transfer: ${formatTokenAmount(event.amount)} tokens`;
      case "allowlist_added":
        return `Address added to allowlist`;
      case "allowlist_removed":
        return `Address removed from allowlist`;
      case "stock_split":
        return event.metadata
          ? `Stock split: ${event.metadata.multiplier}-for-1`
          : `Stock split executed`;
      case "buyback":
        return `Buyback: ${formatTokenAmount(event.amount)} tokens`;
      case "metadata_change":
        return event.metadata
          ? `Metadata: ${event.metadata.old_symbol} → ${event.metadata.new_symbol}`
          : `Metadata updated`;
      default:
        return event.event_type;
    }
  };

  const truncateMiddle = (address: string, startChars: number = 10, endChars: number = 10) => {
    if (!address || address.length <= startChars + endChars) return address;
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
  };

  const formatEventDescription = (event: ActivityEvent) => {
    switch (event.event_type) {
      case "transfer":
        return (
          <span className="flex items-center gap-1">
            From <CopyableAddress address={event.from_address || ""} className="font-mono text-xs">{truncateMiddle(event.from_address || "", 10, 10)}</CopyableAddress> to <CopyableAddress address={event.to_address || ""} className="font-mono text-xs">{truncateMiddle(event.to_address || "", 10, 10)}</CopyableAddress>
          </span>
        );
      case "allowlist_added":
      case "allowlist_removed":
        return (
          <span className="flex items-center gap-1">
            <CopyableAddress address={event.from_address || ""} className="font-mono text-xs" />
          </span>
        );
      case "stock_split":
        return event.metadata
          ? `${event.metadata.affected_holders} holders affected`
          : "Stock split details";
      case "buyback":
        return (
          <span className="flex items-center gap-1">
            From <CopyableAddress address={event.from_address || ""} className="font-mono text-xs" />
          </span>
        );
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
    const chainId = process.env.NEXT_PUBLIC_CHAIN_ID;
    if (chainId === "84532") {
      // Base Sepolia
      return `https://sepolia.basescan.org/tx/${txHash}`;
    }
    if (chainId === "421614") {
      // Arbitrum Sepolia
      return `https://sepolia.arbiscan.io/tx/${txHash}`;
    }
    // For localhost/Anvil, there's no explorer
    return null;
  };

  const getIconColor = (eventType: string) => {
    switch (eventType) {
      case "transfer":
        return "bg-blue-500/10 text-blue-500";
      case "allowlist_added":
        return "bg-green-500/10 text-green-500";
      case "allowlist_removed":
        return "bg-red-500/10 text-red-500";
      case "stock_split":
        return "bg-yellow-500/10 text-yellow-500";
      case "buyback":
        return "bg-orange-500/10 text-orange-500";
      case "metadata_change":
        return "bg-purple-500/10 text-purple-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No activity yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Activity will appear here once transactions occur on this contract
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((event, index) => (
        <Card key={index} className="hover:bg-muted/30 transition-colors">
          <CardContent className="p-2.5">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-md ${getIconColor(event.event_type)} w-9 h-9 flex items-center justify-center`}>
                <span className="text-base leading-none">{getEventIcon(event.event_type)}</span>
              </div>
              <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium truncate">{formatEventTitle(event)}</h4>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <div className="truncate">{formatEventDescription(event)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="outline" className="text-xs py-0 h-5 px-1.5 bg-blue-500/10 text-blue-400 border-blue-500/30">
                    Block {event.block_number}
                  </Badge>
                  <Badge variant="outline" className="text-xs py-0 h-5 px-1.5 bg-purple-500/10 text-purple-400 border-purple-500/30">
                    {formatTimestamp(event.timestamp)}
                  </Badge>
                  {getExplorerUrl(event.tx_hash) && (
                    <a
                      href={getExplorerUrl(event.tx_hash)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline text-xs"
                    >
                      Explorer ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
