"use client";

import { useState } from "react";
import { useSendTransaction, useReadContract } from "thirdweb/react";
import { prepareContractCall } from "thirdweb";
import { gatedEquityContract } from "@/lib/frontend/contract";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const StockSplit = () => {
  const [multiplier, setMultiplier] = useState("");
  const { mutate: sendTransaction, isPending, data: transactionResult } = useSendTransaction();

  // Fetch all holder addresses from the cap table
  const [holders, setHolders] = useState<string[]>([]);
  const [loadingHolders, setLoadingHolders] = useState(false);

  const fetchHolders = async () => {
    setLoadingHolders(true);
    try {
      const response = await fetch("/api/captable");
      const data = await response.json();
      if (data.success) {
        const addresses = data.data.map((row: any) => row.address);
        setHolders(addresses);
        toast.success(`Fetched ${addresses.length} holders`);
      }
    } catch (error) {
      console.error("Failed to fetch holders:", error);
      toast.error("Failed to fetch current holders from database");
    } finally {
      setLoadingHolders(false);
    }
  };

  const handleSplit = () => {
    if (!multiplier || isNaN(Number(multiplier)) || Number(multiplier) <= 1) {
      toast.error("Please enter a valid multiplier greater than 1 (e.g., 2 for 2-for-1 split)");
      return;
    }

    if (holders.length === 0) {
      toast.error("Please fetch holders first");
      return;
    }

    const transaction = prepareContractCall({
      contract: gatedEquityContract,
      method: "function executeSplit(uint256 multiplier, address[] holders)",
      params: [BigInt(multiplier), holders as `0x${string}`[]],
    });

    toast.promise(
      new Promise((resolve, reject) => {
        sendTransaction(transaction, {
          onSuccess: (result) => {
            console.log("Transaction sent:", result.transactionHash);
            setMultiplier("");
            resolve(result);
          },
          onError: (error) => {
            console.error("Transaction failed:", error);
            reject(error);
          },
        });
      }),
      {
        loading: `Executing ${multiplier}-for-1 stock split...`,
        success: (result: any) => `Stock split executed! Tx: ${result.transactionHash.slice(0, 10)}...`,
        error: (error: any) => `Transaction failed: ${error.message}`,
      }
    );
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Stock Split</CardTitle>
        <CardDescription className="text-xs">
          Execute split for all holders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="split-multiplier" className="text-xs">Multiplier</Label>
          <Input
            id="split-multiplier"
            type="number"
            placeholder="2"
            value={multiplier}
            onChange={(e) => setMultiplier(e.target.value)}
            className="h-8 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
        <div className="space-y-2">
          <Button
            onClick={fetchHolders}
            variant="outline"
            disabled={loadingHolders}
            size="sm"
            className="w-full"
          >
            {holders.length > 0 ? `${holders.length} Holders` : "Fetch Holders"}
          </Button>
          <Button
            onClick={handleSplit}
            disabled={isPending || !multiplier || holders.length === 0}
            size="sm"
            className="w-full"
          >
            Execute
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
