"use client";

import { useQuery } from "convex/react";
import { useContract } from "@/lib/frontend/contract-context";
import { StatCard } from "@/components/dashboard/stat-card";
import { ContractInfo } from "@/components/dashboard/contract-info";
import { DistributionSummary } from "@/components/dashboard/distribution-summary";
import { RecentActivityPreview } from "@/components/dashboard/recent-activity-preview";
import { Coins, Users, Activity, TrendingUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { api } from "@/convex/_generated/api";

export default function ContractHome() {
  const { contractAddress, contractData, isLoading: contractLoading, error: contractError } = useContract();

  // Get contract from Convex
  const contract = useQuery(
    api.contracts.getByAddress,
    contractAddress ? { contractAddress: contractAddress.toLowerCase() } : "skip"
  );

  // Get dashboard stats from Convex (auto-updates in real-time!)
  const stats = useQuery(
    api.dashboard.getStats,
    contract?._id ? { contractId: contract._id } : "skip"
  );

  const loading = contractLoading || contract === undefined || stats === undefined;

  const formatSupply = (supply: string) => {
    const num = parseFloat(supply);
    const humanReadable = num / Math.pow(10, 18); // Convert from wei to tokens
    return humanReadable.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  if (contractError) {
    return (
      <main className="container mx-auto px-4 py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{contractError}</AlertDescription>
        </Alert>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-6 space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Supply"
          value={loading ? "Loading..." : formatSupply(stats?.total_supply || "0")}
          subtitle="Total tokens issued"
          icon={Coins}
          iconColor="bg-blue-500/10 text-blue-500"
        />
        <StatCard
          title="Total Holders"
          value={loading ? "..." : stats?.total_holders || 0}
          subtitle="Active token holders"
          icon={Users}
          iconColor="bg-green-500/10 text-green-500"
        />
        <StatCard
          title="Recent Activity"
          value={loading ? "..." : stats?.recent_activity_count || 0}
          subtitle="Events in last 24h"
          icon={Activity}
          iconColor="bg-purple-500/10 text-purple-500"
        />
        <StatCard
          title="Top Holder"
          value={loading ? "..." : `${(parseFloat(stats?.top_holder_percentage || "0")).toFixed(2)}%`}
          subtitle="Largest ownership stake"
          icon={TrendingUp}
          iconColor="bg-orange-500/10 text-orange-500"
        />
      </div>

      {/* Contract Info and Distribution Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ContractInfo />
        <DistributionSummary />
      </div>

      {/* Recent Activity */}
      <RecentActivityPreview />
    </main>
  );
}
