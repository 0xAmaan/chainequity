"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { getContractInstance } from "./contract";
import { api } from "@/convex/_generated/api";
import type { ThirdwebContract } from "thirdweb";

interface ContractData {
  _id: string;
  contractAddress: string;
  chainId: number;
  name: string;
  symbol: string;
  decimals: number;
  deployedBy?: string;
  deployedAt: number;
  isActive: boolean;
}

interface ContractContextType {
  contractAddress: string | null;
  contractData: ContractData | null;
  contractInstance: ThirdwebContract | null;
  isLoading: boolean;
  error: string | null;
  refetchContract: () => Promise<void>;
}

const ContractContext = createContext<ContractContextType | undefined>(undefined);

export const ContractProvider = ({ children }: { children: ReactNode }) => {
  const params = useParams();
  const contractAddress = params?.address as string | undefined;

  // Get contract from Convex (auto-updates in real-time!)
  const contract = useQuery(
    api.contracts.getByAddress,
    contractAddress ? { contractAddress: contractAddress.toLowerCase() } : "skip"
  );

  const [contractInstance, setContractInstance] = useState<ThirdwebContract | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isLoading = contract === undefined;

  useEffect(() => {
    if (!contract) {
      setContractInstance(null);
      setError(contract === null ? "Contract not found" : null);
      return;
    }

    // Create contract instance with the correct chain
    try {
      const instance = getContractInstance(contract.contractAddress, contract.chainId);
      setContractInstance(instance);
      setError(null);
    } catch (err) {
      console.error("Error creating contract instance:", err);
      setError("Failed to initialize contract");
      setContractInstance(null);
    }
  }, [contract]);

  return (
    <ContractContext.Provider
      value={{
        contractAddress: contractAddress || null,
        contractData: contract || null,
        contractInstance,
        isLoading,
        error,
        refetchContract: async () => {
          // Convex auto-refetches, but keep for API compatibility
          console.log("Contract auto-updates with Convex");
        },
      }}
    >
      {children}
    </ContractContext.Provider>
  );
};

export const useContract = () => {
  const context = useContext(ContractContext);
  if (context === undefined) {
    throw new Error("useContract must be used within a ContractProvider");
  }
  return context;
};
