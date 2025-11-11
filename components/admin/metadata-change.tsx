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

export const MetadataChange = () => {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const { mutate: sendTransaction, isPending, data: transactionResult } = useSendTransaction();

  const handleChangeMetadata = () => {
    if (!name || name.trim() === "") {
      toast.error("Please enter a valid token name");
      return;
    }

    if (!symbol || symbol.trim() === "") {
      toast.error("Please enter a valid token symbol");
      return;
    }

    const transaction = prepareContractCall({
      contract: gatedEquityContract,
      method: "function changeMetadata(string name, string symbol)",
      params: [name, symbol],
    });

    toast.promise(
      new Promise((resolve, reject) => {
        sendTransaction(transaction, {
          onSuccess: (result) => {
            console.log("Transaction sent:", result.transactionHash);
            setName("");
            setSymbol("");
            resolve(result);
          },
          onError: (error) => {
            console.error("Transaction failed:", error);
            reject(error);
          },
        });
      }),
      {
        loading: "Updating metadata...",
        success: (result: any) => `Metadata updated! ${name} (${symbol}) - Tx: ${result.transactionHash.slice(0, 10)}...`,
        error: (error: any) => `Transaction failed: ${error.message}`,
      }
    );
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Metadata</CardTitle>
        <CardDescription className="text-xs">
          Update token name and symbol
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="metadata-name" className="text-xs">Name</Label>
          <Input
            id="metadata-name"
            placeholder="ChainEquity Token"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="metadata-symbol" className="text-xs">Symbol</Label>
          <Input
            id="metadata-symbol"
            placeholder="CEQ"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="h-8 text-sm"
          />
        </div>
        <Button
          onClick={handleChangeMetadata}
          disabled={isPending || !name || !symbol}
          size="sm"
          className="w-full"
        >
          Update
        </Button>
      </CardContent>
    </Card>
  );
};
