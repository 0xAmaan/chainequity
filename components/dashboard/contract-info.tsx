"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useReadContract } from "thirdweb/react";
import { useContract } from "@/lib/frontend/contract-context";
import { CopyableAddress } from "@/components/ui/copyable-address";

export const ContractInfo = () => {
  const { contractInstance, contractData, isLoading } = useContract();

  // Create dummy contract for hooks (hooks must always be called in same order)
  const dummyContract = contractInstance || {
    address: "0x0000000000000000000000000000000000000000",
    chain: { id: 1, name: "dummy" },
    abi: [],
  };

  // Don't try to read contract data until we have a contract instance
  const { data: name } = useReadContract({
    contract: dummyContract as any,
    method: "function name() view returns (string)",
    params: [],
    queryOptions: { enabled: !!contractInstance && !isLoading },
  });

  const { data: symbol } = useReadContract({
    contract: dummyContract as any,
    method: "function symbol() view returns (string)",
    params: [],
    queryOptions: { enabled: !!contractInstance && !isLoading },
  });

  const { data: owner } = useReadContract({
    contract: dummyContract as any,
    method: "function owner() view returns (address)",
    params: [],
    queryOptions: { enabled: !!contractInstance && !isLoading },
  });

  const contractAddress = contractData?.contract_address;
  const chainId = contractData?.chain_id;

  // Show loading state AFTER hooks are called
  if (isLoading || !contractInstance) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contract Information</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading contract details...</p>
        </CardContent>
      </Card>
    );
  }

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
