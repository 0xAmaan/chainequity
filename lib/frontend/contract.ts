import contractABI from "../../backend/src/lib/GatedEquityToken.abi.json";
import { arbitrumSepolia, localhost } from "./chains";
import { client } from "./client";
import { getContract } from "thirdweb";

// Get contract address from environment variable
const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;

// Determine which chain to use based on environment
const isDevelopment = process.env.NODE_ENV === "development";
const chain = isDevelopment ? localhost : arbitrumSepolia;

// Create contract instance
export const gatedEquityContract = getContract({
  client,
  address: contractAddress,
  chain,
  abi: contractABI,
});
