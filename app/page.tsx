"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { StatCard } from "@/components/dashboard/stat-card";
import { ContractInfo } from "@/components/dashboard/contract-info";
import { DistributionSummary } from "@/components/dashboard/distribution-summary";
import { RecentActivityPreview } from "@/components/dashboard/recent-activity-preview";
import { Coins, Users, Activity, TrendingUp } from "lucide-react";

interface DashboardStats {
  totalSupply: string;
  totalHolders: number;
  recentActivity: number;
  topHolderPercentage: number;
}

export default function Home() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/dashboard");
        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatSupply = (supply: string) => {
    const num = parseFloat(supply);
    const humanReadable = num / Math.pow(10, 18); // Convert from wei to tokens
    return humanReadable.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

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

        {/* Contract Info and Distribution Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ContractInfo />
          <DistributionSummary />
        </div>

        {/* Recent Activity */}
        <RecentActivityPreview />
      </main>
    </div>
  );
}
