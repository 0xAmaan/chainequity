import contractABI from "../../backend/src/lib/GatedEquityToken.abi.json";
import { baseSepolia, localhost } from "./chains";
import { client } from "./client";
import { getContract, type ThirdwebContract } from "thirdweb";
import type { Chain } from "thirdweb/chains";

// Determine which chain to use based on chain ID
export const getChainById = (chainId: number): Chain => {
  if (chainId === 31337) return localhost;
  if (chainId === 84532) return baseSepolia;
  // Default to Base Sepolia for unknown chains
  return baseSepolia;
};

// Factory function to create contract instance for any address
export const getContractInstance = (
  address: string,
  chainId?: number,
): ThirdwebContract => {
  const isDevelopment = process.env.NODE_ENV === "development";
  const chain = chainId
    ? getChainById(chainId)
    : isDevelopment
      ? localhost
      : baseSepolia;

  return getContract({
    client,
    address,
    chain,
    abi: contractABI as any,
  });
};

// Legacy export for backward compatibility (uses env variable)
// This will be deprecated once all pages use the new routing
const legacyContractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const isDevelopment = process.env.NODE_ENV === "development";
const defaultChain = isDevelopment ? localhost : baseSepolia;

export const gatedEquityContract = legacyContractAddress
  ? getContract({
      client,
      address: legacyContractAddress,
      chain: defaultChain,
      abi: contractABI as any,
    })
  : null;
