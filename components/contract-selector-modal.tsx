"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, Search, Rocket } from "lucide-react";

interface ContractSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ContractSelectorModal = ({ open, onOpenChange }: ContractSelectorModalProps) => {
  const router = useRouter();
  const contracts = useQuery(api.contracts.list);
  const [searchQuery, setSearchQuery] = useState("");
  const loading = contracts === undefined;

  const filteredContracts = useMemo(() => {
    if (!contracts) return [];
    if (searchQuery.trim() === "") return contracts;

    const query = searchQuery.toLowerCase();
    return contracts.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.symbol.toLowerCase().includes(query) ||
        c.contractAddress.toLowerCase().includes(query)
    );
  }, [searchQuery, contracts]);

  const handleSelectContract = (address: string) => {
    router.push(`/contracts/${address}/home`);
    onOpenChange(false);
    setSearchQuery("");
  };

  const handleDeploy = () => {
    router.push("/deploy");
    onOpenChange(false);
    setSearchQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Contract</DialogTitle>
          <DialogDescription>
            Choose a contract to view or deploy a new one
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contracts by name, symbol, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={handleDeploy} variant="default">
              <Rocket className="mr-2 h-4 w-4" />
              Deploy New
            </Button>
          </div>

          {/* Contracts Grid */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="pb-3">
                      <div className="h-5 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2 mt-2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="h-3 bg-muted rounded w-full"></div>
                        <div className="h-3 bg-muted rounded w-2/3"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredContracts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8">
                <Coins className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  {searchQuery ? "No contracts match your search" : "No contracts deployed yet"}
                </p>
                {!searchQuery && (
                  <Button onClick={handleDeploy} className="mt-4">
                    <Rocket className="mr-2 h-4 w-4" />
                    Deploy Your First Contract
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredContracts.map((contract) => (
                  <Card
                    key={contract._id}
                    className="hover:border-primary cursor-pointer transition-colors"
                    onClick={() => handleSelectContract(contract.contractAddress)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Coins className="h-4 w-4" />
                        {contract.name}
                      </CardTitle>
                      <CardDescription className="font-mono text-xs">
                        {contract.symbol}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Address:</span>
                        <span className="font-mono">
                          {contract.contractAddress.slice(0, 6)}...
                          {contract.contractAddress.slice(-4)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Chain:</span>
                        <span>
                          {contract.chainId === 31337 ? "Localhost" : "Arb Sepolia"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Deployed:</span>
                        <span>{new Date(contract.deployedAt).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
