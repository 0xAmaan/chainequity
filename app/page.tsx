"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Rocket, Coins, TrendingUp } from "lucide-react";
import Link from "next/link";

interface Contract {
  id: number;
  contract_address: string;
  chain_id: number;
  name: string;
  symbol: string;
  deployer_address: string;
  deployed_at: string;
}

export default function HomePage() {
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const response = await fetch("/api/contracts");
        const data = await response.json();
        if (data.success) {
          setContracts(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch contracts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">All Contracts</h1>
              <p className="text-muted-foreground mt-1">
                Browse and manage tokenized equity contracts
              </p>
            </div>
            <Link href="/deploy">
              <Button size="lg">
                <Rocket className="mr-2 h-4 w-4" />
                Deploy New Token
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-muted rounded w-full"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : contracts.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No Contracts Yet</CardTitle>
                <CardDescription>
                  Deploy your first tokenized equity contract to get started
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/deploy">
                  <Button>
                    <Rocket className="mr-2 h-4 w-4" />
                    Deploy Your First Token
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contracts.map((contract) => (
                <Card
                  key={contract.id}
                  className="hover:border-primary cursor-pointer transition-colors"
                  onClick={() => router.push(`/contracts/${contract.contract_address}/home`)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Coins className="h-5 w-5" />
                      {contract.name}
                    </CardTitle>
                    <CardDescription className="font-mono text-xs">
                      {contract.symbol}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Address:</span>
                      <span className="font-mono text-xs">
                        {contract.contract_address.slice(0, 6)}...{contract.contract_address.slice(-4)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Chain:</span>
                      <span>{contract.chain_id === 31337 ? "Localhost" : "Arbitrum Sepolia"}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Deployed:</span>
                      <span>{new Date(contract.deployed_at).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
