"use client";

import { useState } from "react";
import { useSendTransaction } from "thirdweb/react";
import { prepareContractCall } from "thirdweb";
import { gatedEquityContract } from "@/lib/frontend/contract";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const AllowlistManager = () => {
  const [address, setAddress] = useState("");
  const { mutate: sendTransaction, isPending, data: transactionResult } = useSendTransaction();

  const handleAddToAllowlist = () => {
    if (!address || !address.startsWith("0x")) {
      toast.error("Please enter a valid Ethereum address");
      return;
    }

    const transaction = prepareContractCall({
      contract: gatedEquityContract,
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
    if (!address || !address.startsWith("0x")) {
      toast.error("Please enter a valid Ethereum address");
      return;
    }

    const transaction = prepareContractCall({
      contract: gatedEquityContract,
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
    <Card>
      <CardHeader>
        <CardTitle>Allowlist Management</CardTitle>
        <CardDescription>
          Add or remove addresses from the transfer allowlist
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="allowlist-address">Address</Label>
          <Input
            id="allowlist-address"
            placeholder="0x..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleAddToAllowlist}
            disabled={isPending || !address}
          >
            {isPending ? "Processing..." : "Add to Allowlist"}
          </Button>
          <Button
            onClick={handleRemoveFromAllowlist}
            variant="destructive"
            disabled={isPending || !address}
          >
            {isPending ? "Processing..." : "Remove"}
          </Button>
        </div>
        {transactionResult && (
          <Badge variant="outline" className="mt-2">
            Tx: {transactionResult.transactionHash.slice(0, 10)}...
          </Badge>
        )}
      </CardContent>
    </Card>
  );
};
