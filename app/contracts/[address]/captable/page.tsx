"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CapTableChart } from "@/components/captable/cap-table-chart";
import { CapTableDataTable } from "@/components/captable/cap-table-data-table";
import { Download } from "lucide-react";
import { useContract } from "@/lib/frontend/contract-context";
import { api } from "@/convex/_generated/api";

interface CapTableRow {
  address: string;
  balance: string;
  ownership_percentage: string;
  is_allowlisted: boolean;
}

export default function CapTablePage() {
  const { contractAddress, isLoading: contractLoading } = useContract();
  const [blockNumber, setBlockNumber] = useState("");
  const [historicalBlock, setHistoricalBlock] = useState<string | null>(null);

  // Get contract from Convex
  const contract = useQuery(
    api.contracts.getByAddress,
    contractAddress ? { contractAddress: contractAddress.toLowerCase() } : "skip"
  );

  // Get current cap table (auto-updates in real-time!)
  const currentCapTable = useQuery(
    api.captable.getCurrent,
    contract?._id && !historicalBlock ? { contractId: contract._id } : "skip"
  );

  // Get historical cap table (if requested)
  const historicalCapTable = useQuery(
    api.captable.getAtBlock,
    contract?._id && historicalBlock
      ? { contractId: contract._id, blockNumber: historicalBlock }
      : "skip"
  );

  const capTable = historicalBlock ? historicalCapTable : currentCapTable;
  const loading = contractLoading || contract === undefined || capTable === undefined;

  const handleHistoricalFetch = () => {
    if (!blockNumber || isNaN(Number(blockNumber))) {
      alert("Please enter a valid block number");
      return;
    }
    setHistoricalBlock(blockNumber);
  };

  const handleResetToCurrentBlock = () => {
    setHistoricalBlock(null);
    setBlockNumber("");
  };

  const handleExportCSV = () => {
    if (!capTable) return;

    const headers = ["Address", "Balance", "Ownership %", "Allowlisted"];
    const rows = capTable.map((row) => [
      row.address,
      row.balance,
      row.ownership_percentage,
      row.is_allowlisted ? "Yes" : "No",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `captable-${historicalBlock || "current"}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    if (!capTable) return;

    const jsonContent = JSON.stringify(capTable, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `captable-${historicalBlock || "current"}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <main className="container mx-auto px-4 py-6 space-y-4">
        {/* Header with Export Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Cap Table</h2>
            <p className="text-sm text-muted-foreground">
              {historicalBlock ? `Viewing block ${historicalBlock}` : "Current distribution"}
            </p>
          </div>

          {/* Export Buttons */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleExportCSV}
              variant="outline"
              size="sm"
              disabled={!capTable || capTable.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={handleExportJSON}
              variant="outline"
              size="sm"
              disabled={!capTable || capTable.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Loading cap table...</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Chart and Table Side by Side - Always show to keep historical filter accessible */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {capTable && capTable.length > 0 ? (
                <CapTableChart data={capTable} />
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No data for this block. Try a different block or reset to current.
                    </p>
                  </CardContent>
                </Card>
              )}
              <CapTableDataTable
                data={capTable || []}
                blockNumber={blockNumber}
                setBlockNumber={setBlockNumber}
                onFetchHistorical={handleHistoricalFetch}
                onReset={handleResetToCurrentBlock}
                loading={loading}
              />
            </div>
          </>
        )}
    </main>
  );
}
