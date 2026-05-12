"use client";

import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "@/lib/realtime/types";

type ChartMetricKey =
  | "hvacEnergyConsumption"
  | "occupancyTrend"
  | "comfortScoreTrend"
  | "airflowEfficiency"
  | "thermalStability"
  | "humidityBalance"
  | "carbonReduction"
  | "compressorUsageReduction";

type AnalyticsPoint = TrendPoint & {
  hvacEnergyConsumption: number;
  occupancyTrend: number;
  comfortScoreTrend: number;
  airflowEfficiency: number;
  thermalStability: number;
  humidityBalance: number;
  carbonReduction: number;
  compressorUsageReduction: number;
};

const metricCards: Array<{
  key: ChartMetricKey;
  title: string;
  unit: string;
  stroke: string;
}> = [
  { key: "hvacEnergyConsumption", title: "HVAC energy consumption", unit: "kWh", stroke: "#49f7b2" },
  { key: "occupancyTrend", title: "Occupancy trends", unit: "%", stroke: "#19d3ff" },
  { key: "comfortScoreTrend", title: "Comfort score trends", unit: "%", stroke: "#8b9bff" },
  { key: "airflowEfficiency", title: "Airflow efficiency", unit: "%", stroke: "#66ffd2" },
  { key: "thermalStability", title: "Thermal stability", unit: "%", stroke: "#a78bfa" },
  { key: "humidityBalance", title: "Humidity balance", unit: "%", stroke: "#4dd9ff" },
  { key: "carbonReduction", title: "Carbon reduction", unit: "%", stroke: "#7dffa4" },
  { key: "compressorUsageReduction", title: "Compressor usage reduction", unit: "%", stroke: "#ffd166" },
];

const comparison = [
  { name: "Traditional HVAC", value: 82, color: "#ff6d93" },
  { name: "ThermaMind AI", value: 56, color: "#19d3ff" },
];

const tooltipStyle = {
  background: "rgba(3, 7, 18, 0.94)",
  border: "1px solid rgba(155, 232, 255, 0.2)",
  borderRadius: 8,
  boxShadow: "0 20px 50px rgba(3, 7, 18, 0.66)",
};

export function AdvancedAnalyticsPanels({ data }: { data: TrendPoint[] }) {
  const chartData: AnalyticsPoint[] = data.map((point, index) => {
    const humidityBalance = clamp(
      47 + (point.stability - 86) * 0.26 + (point.airflow - 70) * 0.08 - (point.occupancy - 55) * 0.04,
      40,
      58,
    );
    const carbonReduction = clamp((82 - point.kwh) * 0.7, 15, 38);
    const compressorUsageReduction = clamp((64 - point.compressor) * 0.86, 8, 52);

    return {
      ...point,
      hvacEnergyConsumption: point.kwh,
      occupancyTrend: point.occupancy,
      comfortScoreTrend: point.comfort,
      airflowEfficiency: point.airflow,
      thermalStability: point.stability,
      humidityBalance: round(humidityBalance, 1),
      carbonReduction: round(carbonReduction + Math.sin(index * 0.35) * 1.2, 1),
      compressorUsageReduction: round(compressorUsageReduction + Math.cos(index * 0.28) * 1.4, 1),
    };
  });

  return (
    <section className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {metricCards.map((metric, index) => {
          const latestValue = chartData[chartData.length - 1]?.[metric.key] ?? 0;
          const gradientId = `metric-${metric.key}`;

          return (
            <motion.article
              key={metric.key}
              className="glass-panel relative overflow-hidden rounded-[8px] p-4"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: index * 0.04 }}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(25,211,255,0.16),transparent_60%)]" />
              <div className="relative z-10 flex items-center justify-between">
                <h3 className="text-sm font-medium text-white">{metric.title}</h3>
                <p className="font-mono text-sm text-cyan-soft">
                  {latestValue.toFixed(1)} {metric.unit}
                </p>
              </div>
              <div className="relative z-10 mt-4 h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={metric.stroke} stopOpacity={0.44} />
                        <stop offset="100%" stopColor={metric.stroke} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(155,232,255,.09)" vertical={false} />
                    <XAxis
                      dataKey="time"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      interval={4}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelStyle={{ color: "#9be8ff" }}
                      formatter={(value) => [`${value} ${metric.unit}`, metric.title]}
                    />
                    <Area
                      type="monotone"
                      dataKey={metric.key}
                      stroke={metric.stroke}
                      strokeWidth={2.1}
                      fill={`url(#${gradientId})`}
                      isAnimationActive
                      animationDuration={1200}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.article>
          );
        })}
      </div>

      <motion.article
        className="glass-panel relative overflow-hidden rounded-[8px] p-5"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.22 }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(167,139,250,0.18),transparent_58%)]" />
        <div className="relative z-10 mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">comparison analytics</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Traditional HVAC vs ThermaMind AI</h3>
          </div>
          <div className="grid gap-1 font-mono text-sm text-slate-300">
            <p>
              Traditional HVAC: <span className="text-rose-300">82 kWh</span>
            </p>
            <p>
              ThermaMind AI: <span className="text-cyan-soft">56 kWh</span>
            </p>
          </div>
        </div>

        <div className="relative z-10 h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparison} margin={{ top: 8, right: 16, left: 16, bottom: 8 }} barCategoryGap={28}>
              <CartesianGrid stroke="rgba(155,232,255,.09)" vertical={false} />
              <XAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} dataKey="name" />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: "#9be8ff" }}
                formatter={(value) => [`${value} kWh`, "Energy use"]}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} animationDuration={1300}>
                {comparison.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} fillOpacity={0.86} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.article>
    </section>
  );
}

function round(value: number, digits = 1) {
  return Number(value.toFixed(digits));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
