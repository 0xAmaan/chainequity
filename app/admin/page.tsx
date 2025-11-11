"use client";

import { useActiveAccount, useReadContract } from "thirdweb/react";
import { gatedEquityContract } from "@/lib/frontend/contract";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";
import { AllowlistManager } from "@/components/admin/allowlist-manager";
import { MintTokens } from "@/components/admin/mint-tokens";
import { BuybackShares } from "@/components/admin/buyback-shares";
import { StockSplit } from "@/components/admin/stock-split";
import { MetadataChange } from "@/components/admin/metadata-change";

export default function AdminPage() {
  const account = useActiveAccount();

  // Read contract owner
  const { data: owner, isLoading } = useReadContract({
    contract: gatedEquityContract,
    method: "function owner() view returns (address)",
    params: [],
  });

  const isOwner = account?.address.toLowerCase() === owner?.toLowerCase();

  if (!account) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-16">
          <Card>
            <CardHeader>
              <CardTitle>Admin Access Required</CardTitle>
              <CardDescription>
                Please connect your wallet to access the admin dashboard.
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-16">
          <Card>
            <CardHeader>
              <CardTitle>Loading...</CardTitle>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-16">
          <Card>
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                Only the contract owner can access this page.
                <br />
                Owner: {owner}
                <br />
                Your address: {account.address}
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
            <p className="text-muted-foreground">
              Manage your equity token contract operations
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <AllowlistManager />
            <MintTokens />
            <BuybackShares />
            <StockSplit />
            <MetadataChange />
          </div>
        </div>
      </main>
    </div>
  );
}
