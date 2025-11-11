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
    <Card>
      <CardHeader>
        <CardTitle>Change Token Metadata</CardTitle>
        <CardDescription>
          Update the token name and symbol
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="metadata-name">Token Name</Label>
          <Input
            id="metadata-name"
            placeholder="ChainEquity Token"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="metadata-symbol">Token Symbol</Label>
          <Input
            id="metadata-symbol"
            placeholder="CEQ"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          />
        </div>
        <Button
          onClick={handleChangeMetadata}
          disabled={isPending || !name || !symbol}
          className="w-full"
        >
          {isPending ? "Processing..." : "Update Metadata"}
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
