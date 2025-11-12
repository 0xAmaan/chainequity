"use client";

import { useState } from "react";
import { useSendTransaction } from "thirdweb/react";
import { prepareContractCall } from "thirdweb";
import { useContract } from "@/lib/frontend/contract-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const AllowlistManager = () => {
  const { contractInstance } = useContract();
  const [address, setAddress] = useState("");
  const { mutate: sendTransaction, isPending, data: transactionResult } = useSendTransaction();

  const handleAddToAllowlist = () => {
    if (!contractInstance) {
      toast.error("Contract not loaded");
      return;
    }

    if (!address || !address.startsWith("0x")) {
      toast.error("Please enter a valid Ethereum address");
      return;
    }

    const transaction = prepareContractCall({
      contract: contractInstance,
      method: "function addToAllowlist(address account)",
      params: [address as `0x${string}`],
    });

    toast.promise(
      new Promise((resolve, reject) => {
        sendTransaction(transaction, {
          onSuccess: (result) => {
            console.log("Transaction sent:", result.transactionHash);
            setAddress("");
            resolve(result);
          },
          onError: (error) => {
            console.error("Transaction failed:", error);
            reject(error);
          },
        });
      }),
      {
        loading: "Adding to allowlist...",
        success: (result: any) => `Added ${address.slice(0, 6)}...${address.slice(-4)} to allowlist! Tx: ${result.transactionHash.slice(0, 10)}...`,
        error: (error: any) => `Transaction failed: ${error.message}`,
      }
    );
  };

  const handleRemoveFromAllowlist = () => {
    if (!contractInstance) {
      toast.error("Contract not loaded");
      return;
    }

    if (!address || !address.startsWith("0x")) {
      toast.error("Please enter a valid Ethereum address");
      return;
    }

    const transaction = prepareContractCall({
      contract: contractInstance,
      method: "function removeFromAllowlist(address account)",
      params: [address as `0x${string}`],
    });

    toast.promise(
      new Promise((resolve, reject) => {
        sendTransaction(transaction, {
          onSuccess: (result) => {
            console.log("Transaction sent:", result.transactionHash);
            setAddress("");
            resolve(result);
          },
          onError: (error) => {
            console.error("Transaction failed:", error);
            reject(error);
          },
        });
      }),
      {
        loading: "Removing from allowlist...",
        success: (result: any) => `Removed ${address.slice(0, 6)}...${address.slice(-4)} from allowlist! Tx: ${result.transactionHash.slice(0, 10)}...`,
        error: (error: any) => `Transaction failed: ${error.message}`,
      }
    );
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Allowlist</CardTitle>
        <CardDescription className="text-xs">
          Manage transfer permissions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="allowlist-address" className="text-xs">Address</Label>
          <Input
            id="allowlist-address"
            placeholder="0x..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Button
            onClick={handleAddToAllowlist}
            disabled={isPending || !address}
            size="sm"
            className="w-full"
          >
            Add
          </Button>
          <Button
            onClick={handleRemoveFromAllowlist}
            variant="destructive"
            disabled={isPending || !address}
            size="sm"
            className="w-full"
          >
            Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
