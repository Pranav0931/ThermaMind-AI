"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "@/lib/realtime/types";

const tooltipStyle = {
  background: "rgba(3, 7, 18, 0.94)",
  border: "1px solid rgba(155, 232, 255, 0.18)",
  borderRadius: 8,
  color: "white",
};

export function EnergyAnalytics({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveFrame>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
        <CartesianGrid stroke="rgba(155,232,255,.08)" vertical={false} />
        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} interval={3} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="kwh" name="kWh" fill="rgba(73,247,178,.42)" radius={[4, 4, 0, 0]} />
        <Line type="monotone" dataKey="compressor" name="Compressor" stroke="#ffd166" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveFrame>
  );
}

export function ThermalStabilityAnalytics({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveFrame>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
        <defs>
          <linearGradient id="stabilityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.42} />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(155,232,255,.08)" vertical={false} />
        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} interval={3} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="stability" name="Stability" stroke="#a78bfa" strokeWidth={2} fill="url(#stabilityGradient)" />
      </AreaChart>
    </ResponsiveFrame>
  );
}

export function OccupancyAnalytics({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveFrame>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
        <CartesianGrid stroke="rgba(155,232,255,.08)" vertical={false} />
        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} interval={3} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="occupancy" name="Occupancy" fill="rgba(25,211,255,.52)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveFrame>
  );
}

function ResponsiveFrame({ children }: { children: React.ReactElement }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}
