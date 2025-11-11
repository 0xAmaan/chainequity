"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CapTableChart } from "@/components/captable/cap-table-chart";
import { CapTableDataTable } from "@/components/captable/cap-table-data-table";
import { Download } from "lucide-react";

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

      <main className="container mx-auto px-4 py-6 space-y-4">
        {/* Header with Export Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Cap Table</h2>
            <p className="text-sm text-muted-foreground">
              {currentBlock !== null ? `Viewing block ${currentBlock}` : "Current distribution"}
            </p>
          </div>

          {/* Export Buttons */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleExportCSV}
              variant="outline"
              size="sm"
              disabled={capTable.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={handleExportJSON}
              variant="outline"
              size="sm"
              disabled={capTable.length === 0}
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
              {capTable.length > 0 ? (
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
                data={capTable}
                blockNumber={blockNumber}
                setBlockNumber={setBlockNumber}
                onFetchHistorical={handleHistoricalFetch}
                onReset={() => { setBlockNumber(""); fetchCapTable(); }}
                loading={loading}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
