"use client";

import { ConnectButton } from "thirdweb/react";
import { client } from "@/lib/frontend/client";
import { createWallet } from "thirdweb/wallets";

const wallets = [
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
];

export const WalletConnect = () => {
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
