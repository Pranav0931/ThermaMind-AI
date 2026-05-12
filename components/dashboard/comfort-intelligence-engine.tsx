"use client";

import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BrainCircuit,
  Droplets,
  Fan,
  ShieldAlert,
  ThermometerSun,
  Users,
  Zap,
} from "lucide-react";
import type {
  ComfortAIDecision,
  ComfortIntelligence,
  ComfortZonePrediction,
} from "@/lib/realtime/types";
import { StatusPill } from "@/components/ui/status-pill";

const decisionTone: Record<ComfortAIDecision["priority"], string> = {
  high: "border-aurora-rose/25 bg-aurora-rose/[0.055]",
  medium: "border-cyan-plasma/25 bg-cyan-plasma/[0.055]",
  low: "border-aurora-green/25 bg-aurora-green/[0.055]",
};

const modeLabel: Record<ComfortIntelligence["mode"], string> = {
  "airflow-first": "Airflow-first",
  "stability-guard": "Stability guard",
  "humidity-balance": "Humidity balance",
  "energy-coast": "Energy coast",
};

export function ComfortIntelligenceEnginePanel({
  intelligence,
}: {
  intelligence: ComfortIntelligence;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">AI comfort intelligence simulation</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Airflow-First Comfort Brain</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
            Predicts occupancy and discomfort, then favors airflow, humidity balance, and thermal
            stability before touching temperature.
          </p>
        </div>
        <StatusPill tone={intelligence.mode === "stability-guard" ? "warning" : "learning"}>
          {modeLabel[intelligence.mode]}
        </StatusPill>
      </div>

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-3">
          <ComfortCore intelligence={intelligence} />
          <div className="grid grid-cols-2 gap-3">
            <ComfortMetric icon={Fan} label="airflow opt" value={`${intelligence.airflowOptimization}%`} />
            <ComfortMetric icon={Droplets} label="humidity" value={`${intelligence.humidityBalance}%`} />
            <ComfortMetric icon={Zap} label="waste cut" value={`${intelligence.coolingWasteReduction}%`} />
            <ComfortMetric icon={ShieldAlert} label="spike guard" value={`${intelligence.compressorSpikeAvoidance}%`} />
          </div>
        </div>

        <div className="grid gap-4 2xl:grid-cols-2">
          <div className="holographic-overlay rounded-[8px] border border-white/10 bg-black/25 p-4">
            <ChartTitle icon={Users} title="Occupancy And Discomfort Prediction" />
            <PredictionChart zones={intelligence.zonePredictions} />
          </div>
          <div className="holographic-overlay rounded-[8px] border border-white/10 bg-black/25 p-4">
            <ChartTitle icon={Fan} title="Airflow Bias vs Cooling Waste" />
            <AirflowWasteChart zones={intelligence.zonePredictions} />
          </div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        {intelligence.decisions.slice(0, 6).map((decision) => (
          <DecisionCard key={decision.id} decision={decision} />
        ))}
      </div>
    </div>
  );
}

function ComfortCore({ intelligence }: { intelligence: ComfortIntelligence }) {
  return (
    <div className="holographic-overlay relative overflow-hidden rounded-[8px] border border-white/10 bg-black/25 p-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(73,247,178,.16),transparent_48%)]" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">perceived comfort</p>
            <p className="mt-2 font-mono text-5xl font-semibold text-white">{intelligence.perceivedComfort}</p>
          </div>
          <motion.div
            className="grid size-20 place-items-center rounded-full border border-cyan-plasma/30 text-cyan-soft"
            animate={{ scale: [0.96, 1.06, 0.96], opacity: [0.72, 1, 0.72] }}
            transition={{ duration: 3.2, repeat: Infinity }}
          >
            <BrainCircuit size={28} />
          </motion.div>
        </div>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-cyan-plasma via-aurora-green to-aurora-amber"
            animate={{ width: `${intelligence.setpointDiscipline}%` }}
            transition={{ type: "spring", stiffness: 70, damping: 18 }}
          />
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-400">
          Setpoint discipline is {intelligence.setpointDiscipline}%. The AI is preserving stable
          temperature and using air movement to lift comfort.
        </p>
      </div>
    </div>
  );
}

function ComfortMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Fan;
  label: string;
  value: string;
}) {
  return (
    <div className="holographic-overlay rounded-[8px] border border-white/10 bg-white/[0.045] p-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-slate-500">
        <Icon size={14} className="text-cyan-soft" /> {label}
      </div>
      <p className="mt-2 font-mono text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function DecisionCard({ decision }: { decision: ComfortAIDecision }) {
  return (
    <motion.div whileHover={{ y: -2, scale: 1.006 }} transition={{ duration: 0.2 }} className={`holographic-overlay rounded-[8px] border p-4 ${decisionTone[decision.priority]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{decision.target}</p>
          <h3 className="mt-1 font-semibold text-white">{decision.title}</h3>
        </div>
        <span className="font-mono text-sm text-aurora-green">{decision.expectedImpact}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-400">{decision.reasoning}</p>
      <div className="mt-3 rounded-[8px] bg-black/25 p-3 text-sm text-slate-300">{decision.action}</div>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-cyan-plasma"
            animate={{ width: `${decision.confidence}%` }}
            transition={{ type: "spring", stiffness: 80, damping: 18 }}
          />
        </div>
        <span className="font-mono text-xs text-slate-400">{decision.confidence}%</span>
      </div>
    </motion.div>
  );
}

function PredictionChart({ zones }: { zones: ComfortZonePrediction[] }) {
  return (
    <ChartFrame>
      <AreaChart data={zones} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="discomfortGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff5c8a" stopOpacity={0.38} />
            <stop offset="100%" stopColor="#ff5c8a" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(155,232,255,.08)" vertical={false} />
        <XAxis dataKey="zoneName" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="discomfortRisk" name="discomfort risk" stroke="#ff5c8a" strokeWidth={2} fill="url(#discomfortGradient)" />
        <Area type="monotone" dataKey="occupancyForecast" name="occupancy forecast" stroke="#19d3ff" strokeWidth={2} fill="rgba(25,211,255,.08)" />
      </AreaChart>
    </ChartFrame>
  );
}

function AirflowWasteChart({ zones }: { zones: ComfortZonePrediction[] }) {
  return (
    <ChartFrame>
      <BarChart data={zones} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
        <CartesianGrid stroke="rgba(155,232,255,.08)" vertical={false} />
        <XAxis dataKey="zoneName" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="airflowNeed" name="airflow need" fill="rgba(25,211,255,.55)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="coolingWasteRisk" name="cooling waste risk" fill="rgba(73,247,178,.35)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartFrame>
  );
}

function ChartTitle({ icon: Icon, title }: { icon: typeof ThermometerSun; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Icon size={17} className="text-cyan-soft" />
      <h3 className="font-semibold text-white">{title}</h3>
    </div>
  );
}

const tooltipStyle = {
  background: "rgba(3, 7, 18, 0.94)",
  border: "1px solid rgba(155, 232, 255, 0.18)",
  borderRadius: 8,
  color: "white",
};

function ChartFrame({ children }: { children: React.ReactElement }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}
