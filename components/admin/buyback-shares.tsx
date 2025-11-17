"use client";

import { useState } from "react";
import { useSendTransaction } from "thirdweb/react";
import { prepareContractCall, waitForReceipt } from "thirdweb";
import { useContract } from "@/lib/frontend/contract-context";
import { useIndexEvents } from "@/lib/frontend/index-events";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { client } from "@/lib/frontend/client";
import { getChainById } from "@/lib/frontend/contract";

export const BuybackShares = () => {
  const { contractInstance, contractData } = useContract();
  const { indexTransferEvents, indexBuybackEvents } = useIndexEvents();
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

    if (!contractInstance) {
      toast.error("Contract not initialized");
      return;
    }

    const transaction = prepareContractCall({
      contract: contractInstance,
      method: "function buyback(address holder, uint256 amount)",
      params: [address as `0x${string}`, amountInWei],
    });

    toast.promise(
      new Promise(async (resolve, reject) => {
        try {
          const result = await new Promise<any>((resolveTx, rejectTx) => {
            sendTransaction(transaction, {
              onSuccess: resolveTx,
              onError: rejectTx,
            });
          });

          console.log("Transaction sent:", result.transactionHash);

          // Wait for confirmation and index events (buyback emits Transfer events)
          if (!contractData) {
            throw new Error("Contract data not available");
          }
          const receipt = await waitForReceipt({
            client,
            chain: getChainById(contractData.chainId),
            transactionHash: result.transactionHash,
          });

          if (receipt.status === "success") {
            try {
              // Index both Transfer events (for balance updates) and SharesBoughtBack event
              await Promise.all([
                indexTransferEvents(result.transactionHash as `0x${string}`),
                indexBuybackEvents(result.transactionHash as `0x${string}`),
              ]);
              console.log("✅ Buyback events indexed immediately to Convex");
            } catch (indexError) {
              console.warn("Failed to index events immediately:", indexError);
            }

            setAddress("");
            setAmount("");
            resolve(result);
          } else {
            reject(new Error("Transaction failed"));
          }
        } catch (error: any) {
          console.error("Transaction failed:", error);
          reject(error);
        }
      }),
      {
        loading: `Buying back ${amount} tokens...`,
        success: (result: any) => `Bought back ${amount} tokens!`,
        error: (error: any) => `Transaction failed: ${error.message}`,
      }
    );
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Buyback</CardTitle>
        <CardDescription className="text-xs">
          Repurchase tokens from holder
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="buyback-address" className="text-xs">Holder</Label>
          <Input
            id="buyback-address"
            placeholder="0x..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="buyback-amount" className="text-xs">Amount</Label>
          <Input
            id="buyback-amount"
            type="number"
            placeholder="500"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-8 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
        <Button
          onClick={handleBuyback}
          variant="destructive"
          disabled={isPending || !address || !amount}
          size="sm"
          className="w-full"
        >
          Buyback
        </Button>
      </CardContent>
    </Card>
  );
};
