"use client";

import { useState } from "react";
import { useActiveAccount, useActiveWalletChain, useSwitchActiveWalletChain } from "thirdweb/react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Rocket, Loader2, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import { deployContract } from "thirdweb/deploys";
import { client } from "@/lib/frontend/client";
import { baseSepolia, localhost } from "@/lib/frontend/chains";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import contractData from "@/lib/GatedEquityToken.abi.json";

// Determine which chain to use based on environment
const isDevelopment = process.env.NODE_ENV === "development";
const targetChain = isDevelopment ? localhost : baseSepolia;

export default function DeployPage() {
  const router = useRouter();
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const switchChain = useSwitchActiveWalletChain();
  const upsertContract = useMutation(api.mutations.contracts.upsert);
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);

  const isCorrectChain = activeChain?.id === targetChain.id;

  const handleDeploy = async () => {
    if (!account) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!isCorrectChain) {
      toast.error(`Please switch to ${targetChain.name} network`);
      try {
        await switchChain(targetChain);
      } catch (error) {
        console.error("Failed to switch chain:", error);
        return;
      }
    }

    if (!tokenName.trim() || !tokenSymbol.trim()) {
      toast.error("Please enter both token name and symbol");
      return;
    }

    setIsDeploying(true);
    setDeployedAddress(null);

    try {
      toast.info("Preparing deployment transaction...", { duration: 3000 });

      console.log("Deploying with params:", {
        name: tokenName,
        symbol: tokenSymbol,
        chain: targetChain.name,
        chainId: targetChain.id,
        account: account.address,
      });

      const contractAddress = await deployContract({
        client,
        chain: targetChain,
        account,
        abi: contractData.abi as any,
        bytecode: contractData.bytecode.object as `0x${string}`,
        constructorParams: {
          name_: tokenName,
          symbol_: tokenSymbol,
        },
      });

      setDeployedAddress(contractAddress);

      // Save contract to database
      try {
        await upsertContract({
          contractAddress,
          chainId: targetChain.id,
          name: tokenName,
          symbol: tokenSymbol,
          decimals: 18,
          deployedAt: Date.now(),
          deployedBy: account.address,
        });

        toast.success("Token deployed successfully! Redirecting to dashboard...");

        // The indexer will automatically detect the new contract from Convex
        // Wait a moment for the contract to be written to Convex, then redirect
        setTimeout(() => {
          router.push(`/contracts/${contractAddress}/home`);
        }, 2000);
      } catch (dbError) {
        console.error("Database save error:", dbError);
        toast.warning("Contract deployed but failed to save to registry");
      }

      // Reset form
      setTokenName("");
      setTokenSymbol("");
    } catch (error: any) {
      console.error("Deployment failed:", error);

      // More detailed error message
      let errorMessage = "Failed to deploy token";
      if (error?.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for gas. Please add testnet ETH to your wallet.";
      } else if (error?.message?.includes("Internal JSON-RPC error")) {
        errorMessage = `Transaction failed. Please check you have enough ${isDevelopment ? 'ETH' : 'testnet ETH'} for gas and are connected to ${targetChain.name}.`;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">Deploy New Token</h2>
            <p className="text-sm text-muted-foreground">
              Deploy a new GatedEquityToken contract with custom name and symbol
            </p>
          </div>

          {!account && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please connect your wallet to deploy a token
              </AlertDescription>
            </Alert>
          )}

          {account && !isCorrectChain && (
            <Alert className="border-yellow-500/30 bg-yellow-500/5">
              <AlertCircle className="h-4 w-4 text-yellow-400" />
              <AlertDescription className="text-yellow-300">
                You are connected to {activeChain?.name || "an unknown network"}. Please switch to {targetChain.name} to deploy.
                <button
                  onClick={() => switchChain(targetChain)}
                  className="ml-2 underline hover:text-yellow-200"
                >
                  Switch Network
                </button>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="md:col-span-2 lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="h-5 w-5" />
                  Token Configuration
                </CardTitle>
                <CardDescription>
                  Configure your equity token settings. You will be the admin/owner of the deployed contract.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token-name">Token Name</Label>
              <Input
                id="token-name"
                placeholder="e.g., MyCompany Equity Token"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                disabled={isDeploying}
              />
              <p className="text-xs text-muted-foreground">
                The full name of your equity token (e.g., "Acme Inc. Common Stock")
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="token-symbol">Token Symbol</Label>
              <Input
                id="token-symbol"
                placeholder="e.g., MYCO"
                value={tokenSymbol}
                onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
                disabled={isDeploying}
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">
                A short ticker symbol (2-5 characters recommended)
              </p>
            </div>

                <div className="pt-4 space-y-4">
                  <Button
                    onClick={handleDeploy}
                    disabled={!account || !isCorrectChain || isDeploying || !tokenName.trim() || !tokenSymbol.trim()}
                    className="w-full"
                    size="lg"
                  >
                    {isDeploying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deploying Contract...
                      </>
                    ) : (
                      <>
                        <Rocket className="mr-2 h-4 w-4" />
                        Deploy Token
                      </>
                    )}
                  </Button>

                  {deployedAddress && (
                    <Alert className="bg-green-500/10 border-green-500/30">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <AlertDescription className="text-green-300">
                        <div className="space-y-1">
                          <p className="font-semibold">Token deployed successfully!</p>
                          <p className="text-xs font-mono break-all">{deployedAddress}</p>
                          {!isDevelopment && (
                            <a
                              href={`https://sepolia.arbiscan.io/address/${deployedAddress}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs underline hover:text-green-200"
                            >
                              View on Arbiscan
                            </a>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-purple-400" />
                  Admin Privileges
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-foreground font-medium text-sm">As the contract owner, you can:</p>
                <ul className="space-y-2.5 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span>Mint new tokens to any address</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span>Manage the allowlist for transfers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span>Execute stock splits</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span>Buy back shares from holders</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span>Change token name and symbol</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 lg:col-span-3 border-yellow-500/30 bg-yellow-500/5">
              <CardHeader>
                <CardTitle className="text-yellow-400">Important Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• This deploys to {targetChain.name} {targetChain.testnet ? 'testnet' : ''} - {isDevelopment ? 'use local Anvil chain' : 'use testnet ETH for gas fees'}</p>
                  <p>• The contract includes transfer restrictions (allowlist gating) for compliance</p>
                </div>
                <p className="text-yellow-400 font-medium text-sm pt-1">
                  ⚠️ DISCLAIMER: This is a technical prototype for demonstration purposes only. NOT regulatory-compliant and should NOT be used for real securities without legal review.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
