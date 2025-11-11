import { defineChain } from "thirdweb";

// Arbitrum Sepolia Testnet
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

// You can also add localhost for development
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
