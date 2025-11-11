"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useReadContract } from "thirdweb/react";
import { gatedEquityContract } from "@/lib/frontend/contract";
import { CopyableAddress } from "@/components/ui/copyable-address";

export const ContractInfo = () => {
  const { data: name } = useReadContract({
    contract: gatedEquityContract,
    method: "function name() view returns (string)",
    params: [],
  });

  const { data: symbol } = useReadContract({
    contract: gatedEquityContract,
    method: "function symbol() view returns (string)",
    params: [],
  });

  const { data: owner } = useReadContract({
    contract: gatedEquityContract,
    method: "function owner() view returns (address)",
    params: [],
  });

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  const chainId = process.env.NEXT_PUBLIC_CHAIN_ID;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Contract Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Name</span>
          <span className="text-sm font-medium">{name || "Loading..."}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Symbol</span>
          <span className="text-sm font-medium">{symbol || "Loading..."}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Contract</span>
          {contractAddress ? (
            <CopyableAddress address={contractAddress} className="text-sm font-mono" />
          ) : (
            <span className="text-sm font-mono">N/A</span>
          )}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Owner</span>
          {owner ? (
            <CopyableAddress address={owner} className="text-sm font-mono" />
          ) : (
            <span className="text-sm font-mono">Loading...</span>
          )}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Chain</span>
          <span className="text-sm font-medium">
            {chainId === "31337" ? "Localhost" : "Arbitrum Sepolia"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
