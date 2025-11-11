"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyableAddress } from "@/components/ui/copyable-address";
import { useContract } from "@/lib/frontend/contract-context";

interface CapTableRow {
  address: string;
  balance: string;
  ownership_percentage: string;
}

export const DistributionSummary = () => {
  const { contractAddress } = useContract();
  const [topHolders, setTopHolders] = useState<CapTableRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contractAddress) return;

    const fetchTopHolders = async () => {
      try {
        const response = await fetch(`/api/captable?address=${contractAddress}`);
        const data = await response.json();
        if (data.success) {
          setTopHolders(data.data.slice(0, 5)); // Top 5 holders
        }
      } catch (error) {
        console.error("Failed to fetch top holders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopHolders();
  }, [contractAddress]);

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    const humanReadable = num / Math.pow(10, 18); // Convert from wei to tokens
    return humanReadable.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Distribution Summary</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : topHolders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">No token holders yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Tokens will appear here once distributed
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {topHolders.map((holder, index) => (
              <div key={holder.address} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground w-4">
                    #{index + 1}
                  </span>
                  <CopyableAddress address={holder.address} className="text-sm font-mono" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {parseFloat(holder.ownership_percentage).toFixed(2)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBalance(holder.balance)} tokens
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
