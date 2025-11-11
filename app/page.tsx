"use client";

import { Navbar } from "@/components/navbar";
import { useActiveAccount } from "thirdweb/react";

export default function Home() {
  const account = useActiveAccount();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold tracking-tight">
              Tokenized Cap Table Management
            </h2>
            <p className="text-xl text-muted-foreground">
              Manage your company's equity on-chain with gated token transfers
              and transparent ownership tracking.
            </p>
          </div>

          {account ? (
            <div className="rounded-lg border border-border bg-card p-8 space-y-4">
              <h3 className="text-2xl font-semibold">
                ✓ Wallet Connected
              </h3>
              <div className="space-y-2 text-sm">
                <p className="font-mono text-muted-foreground">
                  Address: {account.address}
                </p>
              </div>
              <p className="text-muted-foreground">
                You're ready to interact with ChainEquity!
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card p-8 space-y-4">
              <h3 className="text-2xl font-semibold">
                Connect Your Wallet
              </h3>
              <p className="text-muted-foreground">
                Connect your wallet to get started with managing equity tokens.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
            <a href="/admin" className="rounded-lg border border-border bg-card p-6 space-y-2 hover:bg-muted/50 transition-colors">
              <h4 className="font-semibold">Admin Operations</h4>
              <p className="text-sm text-muted-foreground">
                Mint tokens, manage allowlist, and execute corporate actions
              </p>
            </a>
            <a href="/captable" className="rounded-lg border border-border bg-card p-6 space-y-2 hover:bg-muted/50 transition-colors">
              <h4 className="font-semibold">Cap Table Viewer</h4>
              <p className="text-sm text-muted-foreground">
                View ownership distribution and historical snapshots
              </p>
            </a>
            <a href="/activity" className="rounded-lg border border-border bg-card p-6 space-y-2 hover:bg-muted/50 transition-colors">
              <h4 className="font-semibold">Activity Feed</h4>
              <p className="text-sm text-muted-foreground">
                Track transfers, splits, and all on-chain events
              </p>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
