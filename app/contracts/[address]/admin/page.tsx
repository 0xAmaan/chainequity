"use client";

import { useActiveAccount, useReadContract } from "thirdweb/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AllowlistManager } from "@/components/admin/allowlist-manager";
import { MintTokens } from "@/components/admin/mint-tokens";
import { BuybackShares } from "@/components/admin/buyback-shares";
import { StockSplit } from "@/components/admin/stock-split";
import { MetadataChange } from "@/components/admin/metadata-change";
import { CheckAddressStatus } from "@/components/admin/check-address-status";
import { useContract } from "@/lib/frontend/contract-context";

export default function AdminPage() {
  const account = useActiveAccount();
  const { contractInstance, isLoading: contractLoading } = useContract();

  // Create dummy contract for hooks
  const dummyContract = contractInstance || {
    address: "0x0000000000000000000000000000000000000000",
    chain: { id: 1, name: "dummy" },
    abi: [],
  };

  // Read contract owner
  const { data: owner, isLoading } = useReadContract({
    contract: dummyContract as any,
    method: "function owner() view returns (address)",
    params: [],
    queryOptions: { enabled: !!contractInstance && !contractLoading },
  });

  const isOwner = account?.address?.toLowerCase() === owner?.toLowerCase();

  if (!account) {
    return (
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
    );
  }

  if (isLoading || contractLoading) {
    return (
      <main className="container mx-auto px-4 py-16">
        <Card>
          <CardHeader>
              <CardTitle>Loading...</CardTitle>
            </CardHeader>
          </Card>
        </main>
      </main>
    );
  }

  if (!isOwner) {
    return (
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
    );
  }

  return (
    <main className="container mx-auto px-4 py-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">Admin Dashboard</h2>
            <p className="text-sm text-muted-foreground">
              Manage contract operations
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            <div className="md:col-span-1 lg:col-span-2">
              <CheckAddressStatus />
            </div>
            <div className="md:col-span-1 lg:col-span-2">
              <AllowlistManager />
            </div>
            <div className="md:col-span-1 lg:col-span-2">
              <MintTokens />
            </div>
            <div className="md:col-span-1 lg:col-span-2">
              <BuybackShares />
            </div>
            <div className="md:col-span-1 lg:col-span-2">
              <StockSplit />
            </div>
            <div className="md:col-span-1 lg:col-span-2">
              <MetadataChange />
            </div>
          </div>
        </div>
    </main>
  );
}
