import type { Metadata } from "next";
import { ThirdwebProvider } from "thirdweb/react";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChainEquity - Tokenized Cap Table Management",
  description: "Manage your company's equity on-chain with gated token transfers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ThirdwebProvider>
          {children}
          <Toaster />
        </ThirdwebProvider>
      </body>
    </html>
  );
}
