"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMajor } from "../../lib/format-major";

export default function BalanceChartInner({
  data,
}: {
  data: Array<{ year: string; balance: string; offset: string }>;
}) {
  const points = data.map((point) => ({
    year: point.year,
    balance: Number.parseFloat(point.balance),
    offset: Number.parseFloat(point.offset),
  }));
  return (
    <div className="h-64 w-full" role="img" aria-label="Line chart of loan and offset balances by year; a table alternative is available via the toggle above">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="var(--pc-grid-line)" vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fill: "var(--pc-text-tertiary)", fontFamily: "var(--pc-font-mono)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`}
            tick={{ fill: "var(--pc-text-tertiary)", fontFamily: "var(--pc-font-mono)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <Tooltip
            formatter={(value, name) => [
              formatMajor(typeof value === "number" ? value.toFixed(2) : String(value ?? 0)),
              name === "balance" ? "Loan balance" : "Offset balance",
            ]}
            contentStyle={{
              background: "var(--pc-surface)",
              border: "1px solid var(--pc-hairline-strong)",
              borderRadius: "0",
              fontFamily: "var(--pc-font-mono)",
              fontSize: "12px",
              color: "var(--pc-text)",
            }}
          />
          <Area type="monotone" dataKey="balance" stroke="var(--pc-text)" strokeWidth={2} fill="var(--pc-text)" fillOpacity={0.08} name="balance" />
          <Area type="monotone" dataKey="offset" stroke="var(--pc-text-tertiary)" strokeWidth={2} strokeDasharray="5 3" fill="none" name="offset" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
