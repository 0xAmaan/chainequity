"use client";

import { useEffect } from "react";
import { useActiveAccount, useReadContract } from "thirdweb/react";
import { useContract } from "@/lib/frontend/contract-context";

interface NavbarContractInfoProps {
  onOwnershipChange: (isOwner: boolean) => void;
  onContractDataChange: (data: any) => void;
}

export const NavbarContractInfo = ({ onOwnershipChange, onContractDataChange }: NavbarContractInfoProps) => {
  const account = useActiveAccount();
  const { contractInstance, contractData, isLoading } = useContract();

  // Check ownership if we have a contract instance
  // Don't call the hook if contractInstance is null - use a minimal valid contract shape
  const dummyContract = contractInstance || {
    address: "0x0000000000000000000000000000000000000000",
    chain: { id: 1, name: "dummy" },
    abi: [],
  };

  const { data: owner } = useReadContract({
    contract: dummyContract as any,
    method: "function owner() view returns (address)",
    params: [],
    queryOptions: { enabled: !!contractInstance && !isLoading },
  });

  // Read live name and symbol from blockchain
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

  // Pass contract data to parent immediately, then enhance with blockchain data when available
  useEffect(() => {
    if (contractData) {
      // Pass data immediately so tabs can render
      onContractDataChange({
        ...contractData,
        // Use blockchain data if available, otherwise fallback to cached data
        name: name || contractData.name,
        symbol: symbol || contractData.symbol,
      });
    }
  }, [contractData, name, symbol, onContractDataChange]);

  // Calculate and pass ownership status to parent when it changes
  useEffect(() => {
    const isOwner = !!(account?.address && owner && account.address.toLowerCase() === owner.toLowerCase());
    onOwnershipChange(isOwner);
  }, [account?.address, owner, onOwnershipChange]);

  return null; // This component doesn't render anything, just manages state
};
