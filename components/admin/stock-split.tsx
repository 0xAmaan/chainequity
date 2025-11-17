"use client";

import { useState, useMemo } from "react";
import { useSendTransaction, useReadContract } from "thirdweb/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
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

export const StockSplit = () => {
  const { contractInstance, contractAddress, contractData } = useContract();
  const { indexTransferEvents, indexStockSplitEvents } = useIndexEvents();
  const [multiplier, setMultiplier] = useState("");
  const { mutate: sendTransaction, isPending, data: transactionResult } = useSendTransaction();

  // Get contract from Convex
  const contract = useQuery(
    api.contracts.getByAddress,
    contractAddress ? { contractAddress: contractAddress.toLowerCase() } : "skip"
  );

  // Get cap table from Convex
  const capTable = useQuery(
    api.captable.getCurrent,
    contract?._id ? { contractId: contract._id } : "skip"
  );

  // Extract holder addresses
  const holders = useMemo(() => {
    return capTable?.map((row) => row.address) || [];
  }, [capTable]);

  const loadingHolders = capTable === undefined;

  const handleSplit = () => {
    if (!contractInstance) {
      toast.error("Contract not loaded");
      return;
    }

    if (!multiplier || isNaN(Number(multiplier)) || Number(multiplier) <= 1) {
      toast.error("Please enter a valid multiplier greater than 1 (e.g., 2 for 2-for-1 split)");
      return;
    }

    if (holders.length === 0) {
      toast.error("Please fetch holders first");
      return;
    }

    const transaction = prepareContractCall({
      contract: contractInstance,
      method: "function executeSplit(uint256 multiplier, address[] holders)",
      params: [BigInt(multiplier), holders as `0x${string}`[]],
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

          // Wait for confirmation and index events (split emits Transfer events)
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
              // Index both Transfer events (for balance updates) and StockSplit event
              await Promise.all([
                indexTransferEvents(result.transactionHash as `0x${string}`),
                indexStockSplitEvents(result.transactionHash as `0x${string}`),
              ]);
              console.log("✅ Stock split events indexed immediately to Convex");
            } catch (indexError) {
              console.warn("Failed to index events immediately:", indexError);
            }

            setMultiplier("");
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
        loading: `Executing ${multiplier}-for-1 stock split...`,
        success: (result: any) => `Stock split executed!`,
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
          <div className="text-xs text-muted-foreground">
            {loadingHolders ? "Loading holders..." : `${holders.length} holder${holders.length !== 1 ? 's' : ''} detected`}
          </div>
          <Button
            onClick={handleSplit}
            disabled={isPending || !multiplier || holders.length === 0 || loadingHolders}
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
