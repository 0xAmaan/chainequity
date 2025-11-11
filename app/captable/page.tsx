"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CapTableChart } from "@/components/captable/cap-table-chart";
import { CapTableDataTable } from "@/components/captable/cap-table-data-table";

interface CapTableRow {
  address: string;
  balance: string;
  ownership_percentage: string;
  is_allowlisted: boolean;
}

export default function CapTablePage() {
  const [capTable, setCapTable] = useState<CapTableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [blockNumber, setBlockNumber] = useState("");
  const [currentBlock, setCurrentBlock] = useState<number | null>(null);

  const fetchCapTable = async (block?: string) => {
    setLoading(true);
    try {
      const url = block ? `/api/captable?block=${block}` : "/api/captable";
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setCapTable(data.data);
        setCurrentBlock(data.block);
      } else {
        alert(`Failed to fetch cap table: ${data.error}`);
      }
    } catch (error) {
      console.error("Failed to fetch cap table:", error);
      alert("Failed to fetch cap table");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCapTable();
  }, []);

  const handleHistoricalFetch = () => {
    if (!blockNumber || isNaN(Number(blockNumber))) {
      alert("Please enter a valid block number");
      return;
    }
    fetchCapTable(blockNumber);
  };

  const handleExportCSV = () => {
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
    a.download = `captable-${currentBlock || "current"}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const jsonContent = JSON.stringify(capTable, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `captable-${currentBlock || "current"}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Capitalization Table</h2>
            <p className="text-muted-foreground">
              View current and historical ownership distribution
            </p>
          </div>

          {/* Historical Snapshot Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Historical Snapshot</CardTitle>
              <CardDescription>
                View cap table at a specific block number
                {currentBlock && ` (Currently viewing: ${currentBlock === null ? "Latest" : `Block ${currentBlock}`})`}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="block-number">Block Number</Label>
                <Input
                  id="block-number"
                  type="number"
                  placeholder="Enter block number"
                  value={blockNumber}
                  onChange={(e) => setBlockNumber(e.target.value)}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={handleHistoricalFetch} disabled={loading}>
                  {loading ? "Loading..." : "Fetch"}
                </Button>
                <Button onClick={() => { setBlockNumber(""); fetchCapTable(); }} variant="outline">
                  Reset to Current
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Export Buttons */}
          <div className="flex gap-2">
            <Button onClick={handleExportCSV} variant="outline" disabled={capTable.length === 0}>
              Export CSV
            </Button>
            <Button onClick={handleExportJSON} variant="outline" disabled={capTable.length === 0}>
              Export JSON
            </Button>
          </div>

          {/* Ownership Chart */}
          {!loading && capTable.length > 0 && (
            <CapTableChart data={capTable} />
          )}

          {/* Cap Table Data Table */}
          {!loading && capTable.length > 0 && (
            <CapTableDataTable data={capTable} />
          )}

          {!loading && capTable.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>No Data</CardTitle>
                <CardDescription>
                  No cap table data found. Make sure the indexer is running and has processed events.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {loading && (
            <Card>
              <CardHeader>
                <CardTitle>Loading...</CardTitle>
              </CardHeader>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
