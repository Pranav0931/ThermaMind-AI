"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "@/lib/realtime/types";

export function ComfortChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 8, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id="comfort" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#19d3ff" stopOpacity={0.42} />
              <stop offset="95%" stopColor="#19d3ff" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="energy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#49f7b2" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#49f7b2" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(155, 232, 255, 0.09)" vertical={false} />
          <ReferenceArea y1={0} y2={78} fill="rgba(255,92,138,0.08)" />
          <XAxis
            dataKey="time"
            tick={{ fill: "rgba(203, 213, 225, 0.62)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval={2}
          />
          <YAxis
            tick={{ fill: "rgba(203, 213, 225, 0.62)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(3, 7, 18, 0.92)",
              border: "1px solid rgba(155, 232, 255, 0.18)",
              borderRadius: 8,
              color: "white",
              boxShadow: "0 20px 60px rgba(0,0,0,.35)",
            }}
            labelStyle={{ color: "#9be8ff" }}
          />
          <Area
            type="monotone"
            dataKey="comfort"
            name="Comfort"
            stroke="#19d3ff"
            strokeWidth={2.4}
            fill="url(#comfort)"
            activeDot={{ r: 4, fill: "#9be8ff", stroke: "#19d3ff", strokeWidth: 2 }}
          />
          <Area
            type="monotone"
            dataKey="kwh"
            name="kWh Load"
            stroke="#49f7b2"
            strokeWidth={2.1}
            fill="url(#energy)"
            activeDot={{ r: 3, fill: "#49f7b2" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
