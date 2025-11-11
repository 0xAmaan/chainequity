"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CapTableRow {
  address: string;
  balance: string;
  ownership_percentage: string;
  is_allowlisted: boolean;
}

interface CapTableChartProps {
  data: CapTableRow[];
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
  "#FFC658",
  "#FF6B9D",
  "#C2E59C",
  "#64B5F6",
];

export const CapTableChart = ({ data }: CapTableChartProps) => {
  const chartData = data.slice(0, 10).map((row, index) => ({
    name: `${row.address.slice(0, 6)}...${row.address.slice(-4)}`,
    value: parseFloat(row.ownership_percentage),
    fullAddress: row.address,
  }));

  // If there are more than 10 holders, group the rest as "Others"
  if (data.length > 10) {
    const othersPercentage = data
      .slice(10)
      .reduce((sum, row) => sum + parseFloat(row.ownership_percentage), 0);

    chartData.push({
      name: "Others",
      value: othersPercentage,
      fullAddress: "Multiple addresses",
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ownership Distribution</CardTitle>
        <CardDescription>
          Top {Math.min(10, data.length)} holders by ownership percentage
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry) => `${entry.name}: ${entry.value.toFixed(2)}%`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => `${value.toFixed(2)}%`}
              contentStyle={{ backgroundColor: "var(--background)", border: "1px solid var(--border)" }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
