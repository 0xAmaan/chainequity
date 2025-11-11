"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CopyableAddress } from "@/components/ui/copyable-address";

interface CapTableRow {
  address: string;
  balance: string;
  ownership_percentage: string;
  is_allowlisted: boolean;
}

interface CapTableDataTableProps {
  data: CapTableRow[];
  blockNumber: string;
  setBlockNumber: (value: string) => void;
  onFetchHistorical: () => void;
  onReset: () => void;
  loading: boolean;
}

export const CapTableDataTable = ({
  data,
  blockNumber,
  setBlockNumber,
  onFetchHistorical,
  onReset,
  loading,
}: CapTableDataTableProps) => {
  const [sortField, setSortField] = useState<keyof CapTableRow>("balance");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const sortedData = [...data].sort((a, b) => {
    let aVal, bVal;

    if (sortField === "balance" || sortField === "ownership_percentage") {
      aVal = parseFloat(a[sortField]);
      bVal = parseFloat(b[sortField]);
    } else if (sortField === "is_allowlisted") {
      aVal = a[sortField] ? 1 : 0;
      bVal = b[sortField] ? 1 : 0;
    } else {
      aVal = a[sortField];
      bVal = b[sortField];
    }

    if (sortDirection === "asc") {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const toggleSort = (field: keyof CapTableRow) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    const humanReadable = num / Math.pow(10, 18); // Convert from wei to tokens
    return humanReadable.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">Cap Table Details</CardTitle>
            <CardDescription className="text-xs">
              {data.length} holders
            </CardDescription>
          </div>
          {/* Historical Filter */}
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Block #"
              value={blockNumber}
              onChange={(e) => {
                const value = e.target.value;
                // Prevent negative numbers
                if (value === '' || parseInt(value) >= 0) {
                  setBlockNumber(value);
                }
              }}
              min="0"
              className="w-28 h-8 text-xs"
            />
            <Button onClick={onFetchHistorical} disabled={loading} size="sm" className="h-8 text-xs px-3">
              Fetch
            </Button>
            <Button
              onClick={onReset}
              variant="outline"
              size="sm"
              className="h-8 text-xs px-3"
            >
              Reset
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {data.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No holders found. Use the controls above to fetch a different block.
            </p>
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 text-xs h-8 pl-4 w-[45%]"
                    onClick={() => toggleSort("address")}
                  >
                    Address {sortField === "address" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 text-xs text-right h-8 w-[20%]"
                    onClick={() => toggleSort("balance")}
                  >
                    Balance {sortField === "balance" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 text-xs text-right h-8 w-[15%]"
                    onClick={() => toggleSort("ownership_percentage")}
                  >
                    % {sortField === "ownership_percentage" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 text-xs h-8 pr-4 w-[20%]"
                    onClick={() => toggleSort("is_allowlisted")}
                  >
                    Status {sortField === "is_allowlisted" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((row, index) => (
                  <TableRow key={index} className="h-10">
                    <TableCell className="font-mono text-xs py-2 pl-4 w-[45%]">
                      <CopyableAddress address={row.address} className="font-mono text-xs" />
                    </TableCell>
                    <TableCell className="text-xs text-right py-2 w-[20%]">{formatBalance(row.balance)}</TableCell>
                    <TableCell className="text-xs text-right py-2 w-[15%]">{parseFloat(row.ownership_percentage).toFixed(2)}%</TableCell>
                    <TableCell className="py-2 pr-4 w-[20%]">
                      {row.is_allowlisted ? (
                        <Badge variant="default" className="text-xs py-0 h-5">Approved</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs py-0 h-5">Pending</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
