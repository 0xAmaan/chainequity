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

export const BuybackShares = () => {
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const { mutate: sendTransaction, isPending, data: transactionResult } = useSendTransaction();

  const handleBuyback = () => {
    if (!address || !address.startsWith("0x")) {
      toast.error("Please enter a valid Ethereum address");
      return;
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const amountInWei = BigInt(Math.floor(Number(amount) * 10 ** 18));

    const transaction = prepareContractCall({
      contract: gatedEquityContract,
      method: "function buyback(address holder, uint256 amount)",
      params: [address as `0x${string}`, amountInWei],
    });

    toast.promise(
      new Promise((resolve, reject) => {
        sendTransaction(transaction, {
          onSuccess: (result) => {
            console.log("Transaction sent:", result.transactionHash);
            setAddress("");
            setAmount("");
            resolve(result);
          },
          onError: (error) => {
            console.error("Transaction failed:", error);
            reject(error);
          },
        });
      }),
      {
        loading: `Buying back ${amount} tokens...`,
        success: (result: any) => `Bought back ${amount} tokens! Tx: ${result.transactionHash.slice(0, 10)}...`,
        error: (error: any) => `Transaction failed: ${error.message}`,
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Buyback Shares</CardTitle>
        <CardDescription>
          Repurchase equity tokens from a holder
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="buyback-address">Holder Address</Label>
          <Input
            id="buyback-address"
            placeholder="0x..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="buyback-amount">Amount</Label>
          <Input
            id="buyback-amount"
            type="number"
            placeholder="500"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <Button
          onClick={handleBuyback}
          variant="destructive"
          disabled={isPending || !address || !amount}
          className="w-full"
        >
          {isPending ? "Processing..." : "Buyback Tokens"}
        </Button>
        {transactionResult && (
          <Badge variant="outline">
            Tx: {transactionResult.transactionHash.slice(0, 10)}...
          </Badge>
        )}
      </CardContent>
    </Card>
  );
};
