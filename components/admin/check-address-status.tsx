"use client";

import { useState } from "react";
import { useReadContract } from "thirdweb/react";
import { useContract } from "@/lib/frontend/contract-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

export const CheckAddressStatus = () => {
  const { contractInstance } = useContract();
  const [address, setAddress] = useState("");
  const [searchAddress, setSearchAddress] = useState("");

  // Create dummy contract for hooks
  const dummyContract = contractInstance || {
    address: "0x0000000000000000000000000000000000000000",
    chain: { id: 1, name: "dummy" },
    abi: [],
  };

  // Read allowlist status
  const { data: isAllowlisted, isLoading: isLoadingAllowlist } = useReadContract({
    contract: dummyContract as any,
    method: "function isAllowlisted(address account) view returns (bool)",
    params: searchAddress ? [searchAddress as `0x${string}`] : [] as any,
    queryOptions: { enabled: !!contractInstance && !!searchAddress },
  });

  // Read balance
  const { data: balance, isLoading: isLoadingBalance } = useReadContract({
    contract: dummyContract as any,
    method: "function balanceOf(address account) view returns (uint256)",
    params: searchAddress ? [searchAddress as `0x${string}`] : [] as any,
    queryOptions: { enabled: !!contractInstance && !!searchAddress },
  });

  const handleCheck = () => {
    if (!address || !address.startsWith("0x")) {
      return;
    }
    setSearchAddress(address);
  };

  const formatBalance = (bal: bigint | undefined) => {
    if (!bal) return "0";
    const num = Number(bal) / Math.pow(10, 18);
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Check Address Status</CardTitle>
        <CardDescription className="text-xs">
          Look up allowlist status and balance for any address
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="check-address" className="text-xs">Ethereum Address</Label>
          <Input
            id="check-address"
            placeholder="0x..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCheck()}
            className="h-8 text-sm"
          />
        </div>
        <Button
          onClick={handleCheck}
          disabled={!address || !address.startsWith("0x")}
          size="sm"
          className="w-full"
        >
          <Search className="h-4 w-4 mr-2" />
          Check Status
        </Button>

        {searchAddress && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Status</span>
              {isLoadingAllowlist ? (
                <span className="text-xs">Loading...</span>
              ) : (
                <Badge
                  variant={isAllowlisted ? "default" : "secondary"}
                  className="text-xs py-0 h-5"
                >
                  {isAllowlisted ? "Approved" : "Pending"}
                </Badge>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Balance</span>
              {isLoadingBalance ? (
                <span className="text-xs">Loading...</span>
              ) : (
                <span className="text-xs font-medium">{formatBalance(balance)} tokens</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
