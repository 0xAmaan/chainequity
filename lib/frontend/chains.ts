import { defineChain } from "thirdweb";

// Base Sepolia Testnet
export const baseSepolia = defineChain({
  id: 84532,
  name: "Base Sepolia",
  rpc: "https://sepolia.base.org",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  blockExplorers: [
    {
      name: "Basescan",
      url: "https://sepolia.basescan.org",
    },
  ],
  testnet: true,
});

// Arbitrum Sepolia Testnet (deprecated - kept for backward compatibility)
// @deprecated Use baseSepolia instead
export const arbitrumSepolia = defineChain({
  id: 421614,
  name: "Arbitrum Sepolia",
  rpc: "https://sepolia-rollup.arbitrum.io/rpc",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  blockExplorers: [
    {
      name: "Arbiscan",
      url: "https://sepolia.arbiscan.io",
    },
  ],
  testnet: true,
});

// Localhost for development
export const localhost = defineChain({
  id: 31337,
  name: "Localhost",
  rpc: "http://127.0.0.1:8545",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  testnet: true,
});
