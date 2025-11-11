"use client";

import { useState, useEffect } from "react";
import { useContract } from "@/lib/frontend/contract-context";
import { StatCard } from "@/components/dashboard/stat-card";
import { ContractInfo } from "@/components/dashboard/contract-info";
import { DistributionSummary } from "@/components/dashboard/distribution-summary";
import { RecentActivityPreview } from "@/components/dashboard/recent-activity-preview";
import { Coins, Users, Activity, TrendingUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface DashboardStats {
  totalSupply: string;
  totalHolders: number;
  recentActivity: number;
  topHolderPercentage: number;
}

export default function ContractHome() {
  const { contractAddress, contractData, isLoading: contractLoading, error: contractError } = useContract();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contractAddress || contractLoading) return;

    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/dashboard?address=${contractAddress}`);
        const data = await response.json();

        if (data.success) {
          setStats(data.data);
          setError(null);
        } else {
          setError(data.error || "Failed to fetch stats");
        }
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
        setError("Failed to fetch dashboard stats");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [contractAddress, contractLoading]);

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
          value={loading ? "Loading..." : formatSupply(stats?.totalSupply || "0")}
          subtitle="Total tokens issued"
          icon={Coins}
          iconColor="bg-blue-500/10 text-blue-500"
        />
        <StatCard
          title="Total Holders"
          value={loading ? "..." : stats?.totalHolders || 0}
          subtitle="Active token holders"
          icon={Users}
          iconColor="bg-green-500/10 text-green-500"
        />
        <StatCard
          title="Recent Activity"
          value={loading ? "..." : stats?.recentActivity || 0}
          subtitle="Events in last 24h"
          icon={Activity}
          iconColor="bg-purple-500/10 text-purple-500"
        />
        <StatCard
          title="Top Holder"
          value={loading ? "..." : `${(stats?.topHolderPercentage || 0).toFixed(2)}%`}
          subtitle="Largest ownership stake"
          icon={TrendingUp}
          iconColor="bg-orange-500/10 text-orange-500"
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
