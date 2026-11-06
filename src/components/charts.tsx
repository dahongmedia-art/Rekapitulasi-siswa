"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COLORS = ["#0284c7", "#ec4899", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

export function GenderPieChart({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={100} label>
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StudentBarChart({
  data,
  xKey,
  bars,
}: {
  data: Array<Record<string, string | number>>;
  xKey: string;
  bars: Array<{ key: string; name: string; color: string }>;
}) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          {bars.map((bar) => (
            <Bar key={bar.key} dataKey={bar.key} name={bar.name} fill={bar.color} radius={[10, 10, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
