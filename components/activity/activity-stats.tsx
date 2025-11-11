import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRightLeft,
  CheckCircle,
  XCircle,
  Zap,
  ArrowLeftCircle,
  FileEdit,
} from "lucide-react";

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

interface ActivityStatsProps {
  events: ActivityEvent[];
}

export const ActivityStats = ({ events }: ActivityStatsProps) => {
  const stats = {
    total: events.length,
    transfer: events.filter((e) => e.event_type === "transfer").length,
    allowlist_added: events.filter((e) => e.event_type === "allowlist_added")
      .length,
    allowlist_removed: events.filter(
      (e) => e.event_type === "allowlist_removed"
    ).length,
    stock_split: events.filter((e) => e.event_type === "stock_split").length,
    buyback: events.filter((e) => e.event_type === "buyback").length,
    metadata_change: events.filter((e) => e.event_type === "metadata_change")
      .length,
  };

  const statItems = [
    {
      label: "Transfers",
      value: stats.transfer,
      icon: ArrowRightLeft,
      color: "text-blue-500",
    },
    {
      label: "Allowlist Added",
      value: stats.allowlist_added,
      icon: CheckCircle,
      color: "text-green-500",
    },
    {
      label: "Allowlist Removed",
      value: stats.allowlist_removed,
      icon: XCircle,
      color: "text-red-500",
    },
    {
      label: "Stock Splits",
      value: stats.stock_split,
      icon: Zap,
      color: "text-yellow-500",
    },
    {
      label: "Buybacks",
      value: stats.buyback,
      icon: ArrowLeftCircle,
      color: "text-orange-500",
    },
    {
      label: "Metadata Changes",
      value: stats.metadata_change,
      icon: FileEdit,
      color: "text-purple-500",
    },
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Event Summary:</span>
            <span className="text-sm text-muted-foreground">
              {stats.total} total events
            </span>
          </div>
          <div className="flex items-center gap-4">
            {statItems.map((stat) => {
              if (stat.value === 0) return null;
              return (
                <div key={stat.label} className="flex items-center gap-1.5">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  <span className="text-sm font-medium">{stat.value}</span>
                  <span className="text-xs text-muted-foreground">
                    {stat.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
