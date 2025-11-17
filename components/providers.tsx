"use client";

import { ThirdwebProvider } from "thirdweb/react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

// Initialize Convex client
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export const Providers = ({ children }: { children: ReactNode }) => {
  return (
    <ConvexProvider client={convex}>
      <ThirdwebProvider>{children}</ThirdwebProvider>
    </ConvexProvider>
  );
};
