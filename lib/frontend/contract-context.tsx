"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useParams } from "next/navigation";
import { getContractInstance } from "./contract";
import type { ThirdwebContract } from "thirdweb";

interface ContractData {
  id: number;
  contract_address: string;
  chain_id: number;
  name: string;
  symbol: string;
  decimals: number;
  deployer_address: string;
  deployed_at: string;
  is_active: boolean;
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

  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [contractInstance, setContractInstance] = useState<ThirdwebContract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContract = async () => {
    if (!contractAddress) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/contracts/${contractAddress}`);
      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Failed to fetch contract");
        setContractData(null);
        setContractInstance(null);
      } else {
        setContractData(data.data);
        // Create contract instance with the correct chain
        const instance = getContractInstance(data.data.contract_address, data.data.chain_id);
        setContractInstance(instance);
      }
    } catch (err) {
      console.error("Error fetching contract:", err);
      setError("Failed to fetch contract");
      setContractData(null);
      setContractInstance(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContract();
  }, [contractAddress]);

  return (
    <ContractContext.Provider
      value={{
        contractAddress: contractAddress || null,
        contractData,
        contractInstance,
        isLoading,
        error,
        refetchContract: fetchContract,
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
