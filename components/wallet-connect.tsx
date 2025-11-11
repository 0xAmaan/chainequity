"use client";

import { useEffect } from "react";
import { ConnectButton } from "thirdweb/react";
import { client } from "@/lib/frontend/client";
import { createWallet } from "thirdweb/wallets";

const wallets = [
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
];

export const WalletConnect = () => {
  useEffect(() => {
    // Only suppress errors in development mode
    // In production, ThirdWeb handles its own errors appropriately
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    // Suppress the specific nested button warning from thirdweb's modal
    const originalError = console.error;
    console.error = (...args) => {
      if (
        typeof args[0] === "string" &&
        (args[0].includes("cannot be a descendant of") ||
          args[0].includes("cannot contain a nested"))
      ) {
        return;
      }

      // Also suppress empty object errors during account switching
      if (args.length === 1 && typeof args[0] === "object" && Object.keys(args[0]).length === 0) {
        return;
      }

      originalError(...args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  return (
    <ConnectButton
      client={client}
      wallets={wallets}
      connectModal={{
        size: "compact",
        title: "Connect to ChainEquity",
        showThirdwebBranding: false,
      }}
    />
  );
};
