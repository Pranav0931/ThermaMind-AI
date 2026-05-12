"use client";

import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Fan, Gauge, Leaf, ShieldCheck, ThermometerSun, Zap } from "lucide-react";
import type { ComfortPerKwhOptimization } from "@/lib/realtime/types";
import { StatusPill } from "@/components/ui/status-pill";

export function ComfortPerKwhOptimizerPanel({
  optimization,
}: {
  optimization: ComfortPerKwhOptimization;
}) {
  const improvement = Math.max(
    0,
    Math.round(((optimization.thermaMindEfficiency - optimization.traditionalEfficiency) / optimization.traditionalEfficiency) * 100),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">comfort-per-kWh optimization engine</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Comfort Delivery Per Unit Energy</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
            Proprietary KPI combining perceived comfort, airflow delivery, thermal stability,
            avoided compressor usage, cooling waste reduction, and carbon impact.
          </p>
        </div>
        <StatusPill tone="stable">+{improvement}% vs HVAC baseline</StatusPill>
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="holographic-overlay relative overflow-hidden rounded-[8px] border border-white/10 bg-black/25 p-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(73,247,178,.16),transparent_50%)]" />
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">realtime score</p>
            <div className="mt-4 flex items-end justify-between gap-4">
              <p className="font-mono text-6xl font-semibold text-white">{optimization.score}</p>
              <motion.div
                className="mb-2 grid size-16 place-items-center rounded-full border border-aurora-green/30 text-aurora-green"
                animate={{ scale: [0.96, 1.08, 0.96], opacity: [0.72, 1, 0.72] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Gauge size={26} />
              </motion.div>
            </div>
            <div className="mt-5 space-y-3">
              <BaselineRow label="Traditional HVAC" value={optimization.traditionalEfficiency} muted />
              <BaselineRow label="ThermaMind AI" value={optimization.thermaMindEfficiency} />
            </div>
          </div>
        </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <OptimizerMetric icon={ThermometerSun} label="thermal stability" value={`${optimization.thermalStabilityScore}%`} />
          <OptimizerMetric icon={Fan} label="airflow effectiveness" value={`${optimization.airflowEffectiveness}%`} />
          <OptimizerMetric icon={Zap} label="compressor avoided" value={`${optimization.avoidedCompressorUsage}%`} />
          <OptimizerMetric icon={Leaf} label="carbon reduction" value={`${optimization.carbonReductionEstimate} kg`} />
          <OptimizerMetric icon={ShieldCheck} label="waste reduced" value={`${optimization.coolingWasteReduction}%`} />
          <OptimizerMetric icon={Gauge} label="comfort gain" value={`+${optimization.comfortDeliveryGain}%`} />
        </div>
      </div>

      <div className="grid gap-4 2xl:grid-cols-3">
        <div className="holographic-overlay rounded-[8px] border border-white/10 bg-black/25 p-4 2xl:col-span-2">
          <ChartTitle title="Efficiency Improvement Curve" />
          <EfficiencyChart optimization={optimization} />
        </div>
        <div className="holographic-overlay rounded-[8px] border border-white/10 bg-black/25 p-4">
          <ChartTitle title="Avoided Energy Waste" />
          <WasteChart optimization={optimization} />
        </div>
      </div>
    </div>
  );
}

function BaselineRow({ label, value, muted = false }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className="holographic-overlay rounded-[8px] bg-white/[0.045] p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-slate-400">{label}</span>
        <span className={`font-mono text-xl font-semibold ${muted ? "text-slate-300" : "text-aurora-green"}`}>
          {value}
        </span>
      </div>
    </div>
  );
}

function OptimizerMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
}) {
  return (
    <motion.div whileHover={{ y: -2, scale: 1.006 }} transition={{ duration: 0.2 }} className="holographic-overlay rounded-[8px] border border-white/10 bg-white/[0.045] p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-slate-500">
        <Icon size={15} className="text-cyan-soft" /> {label}
      </div>
      <p className="mt-3 font-mono text-2xl font-semibold text-white">{value}</p>
    </motion.div>
  );
}

function EfficiencyChart({ optimization }: { optimization: ComfortPerKwhOptimization }) {
  return (
    <ChartFrame>
      <AreaChart data={optimization.trend} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
        <defs>
          <linearGradient id="tmEfficiency" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#49f7b2" stopOpacity={0.42} />
            <stop offset="100%" stopColor="#49f7b2" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(155,232,255,.08)" vertical={false} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="thermaMind" name="ThermaMind AI" stroke="#49f7b2" strokeWidth={2} fill="url(#tmEfficiency)" />
        <Line type="monotone" dataKey="traditional" name="Traditional HVAC" stroke="#94a3b8" strokeWidth={2} dot={false} />
      </AreaChart>
    </ChartFrame>
  );
}

function WasteChart({ optimization }: { optimization: ComfortPerKwhOptimization }) {
  return (
    <ChartFrame>
      <BarChart data={optimization.trend} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
        <CartesianGrid stroke="rgba(155,232,255,.08)" vertical={false} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="avoidedWaste" name="Avoided waste" fill="rgba(25,211,255,.56)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartFrame>
  );
}

function ChartTitle({ title }: { title: string }) {
  return <h3 className="mb-4 font-semibold text-white">{title}</h3>;
}

const tooltipStyle = {
  background: "rgba(3, 7, 18, 0.94)",
  border: "1px solid rgba(155, 232, 255, 0.18)",
  borderRadius: 8,
  color: "white",
};

function ChartFrame({ children }: { children: React.ReactElement }) {
  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}
