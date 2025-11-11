"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface CapTableRow {
  address: string;
  balance: string;
  ownership_percentage: string;
  is_allowlisted: boolean;
}

interface CapTableDataTableProps {
  data: CapTableRow[];
}

export const CapTableDataTable = ({ data }: CapTableDataTableProps) => {
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
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cap Table Details</CardTitle>
        <CardDescription>
          Complete list of all token holders ({data.length} total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleSort("address")}
                >
                  Address {sortField === "address" && (sortDirection === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleSort("balance")}
                >
                  Balance {sortField === "balance" && (sortDirection === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleSort("ownership_percentage")}
                >
                  Ownership % {sortField === "ownership_percentage" && (sortDirection === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleSort("is_allowlisted")}
                >
                  Status {sortField === "is_allowlisted" && (sortDirection === "asc" ? "↑" : "↓")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="font-mono text-xs">
                    {row.address.slice(0, 10)}...{row.address.slice(-8)}
                  </TableCell>
                  <TableCell>{formatBalance(row.balance)}</TableCell>
                  <TableCell>{parseFloat(row.ownership_percentage).toFixed(2)}%</TableCell>
                  <TableCell>
                    {row.is_allowlisted ? (
                      <Badge variant="default">Allowlisted</Badge>
                    ) : (
                      <Badge variant="secondary">Not Allowlisted</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
