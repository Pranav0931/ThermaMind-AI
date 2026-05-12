"use client";

import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BrainCircuit, Clock, Flame, Snowflake, Waves } from "lucide-react";
import type { ThermalInertiaIntelligence, ThermalRoomIntelligence } from "@/lib/realtime/types";
import { StatusPill } from "@/components/ui/status-pill";

const actionLabel: Record<ThermalRoomIntelligence["aiAction"], string> = {
  "pre-stabilize": "pre-stabilize",
  coast: "thermal coast",
  "retain-cooling": "retain coolth",
  "defer-hvac": "defer HVAC",
};

const actionTone: Record<ThermalRoomIntelligence["aiAction"], string> = {
  "pre-stabilize": "border-aurora-rose/25 bg-aurora-rose/[0.06] text-aurora-rose",
  coast: "border-cyan-plasma/25 bg-cyan-plasma/[0.06] text-cyan-soft",
  "retain-cooling": "border-aurora-violet/25 bg-aurora-violet/[0.06] text-aurora-violet",
  "defer-hvac": "border-aurora-green/25 bg-aurora-green/[0.06] text-aurora-green",
};

export function ThermalInertiaIntelligencePanel({
  intelligence,
}: {
  intelligence: ThermalInertiaIntelligence;
}) {
  const focusRoom = [...intelligence.rooms].sort(
    (a, b) => Math.abs(b.thermalMomentum) - Math.abs(a.thermalMomentum),
  )[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">thermal inertia intelligence</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Living Thermal Organism Model</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
            The AI simulates heat absorption, cooling memory, sunlight gain, occupancy heat, and
            material lag before deciding when to cool.
          </p>
        </div>
        <StatusPill tone={intelligence.organismState === "pre-stabilizing" ? "warning" : "learning"}>
          {intelligence.organismState}
        </StatusPill>
      </div>

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-3">
          <OrganismGauge intelligence={intelligence} />
          <div className="grid grid-cols-2 gap-3">
            <InertiaMetric icon={Flame} label="heat risk" value={`${intelligence.heatAccumulationRisk}%`} />
            <InertiaMetric icon={Snowflake} label="cooling memory" value={`${intelligence.coolingRetentionScore}%`} />
            <InertiaMetric icon={Waves} label="fluctuation suppression" value={`${intelligence.fluctuationSuppression}%`} />
            <InertiaMetric icon={Clock} label="cooling window" value={`${intelligence.optimalCoolingWindow}m`} />
          </div>
        </div>

        <div className="grid gap-4 2xl:grid-cols-2">
          <div className="holographic-overlay rounded-[8px] border border-white/10 bg-black/25 p-4">
            <ChartTitle icon={Flame} title="Predicted Heat Accumulation" />
            <HeatAccumulationChart rooms={intelligence.rooms} />
          </div>
          <div className="holographic-overlay rounded-[8px] border border-white/10 bg-black/25 p-4">
            <ChartTitle icon={Snowflake} title="Cooling Retention Curves" />
            <CoolingRetentionChart room={focusRoom} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="holographic-overlay rounded-[8px] border border-white/10 bg-black/25 p-4">
          <ChartTitle icon={BrainCircuit} title="Future Comfort Prediction" />
          <FutureComfortChart room={focusRoom} />
        </div>
        <div className="space-y-3">
          {intelligence.rooms.slice(0, 4).map((room) => (
            <RoomThermalDecision key={room.roomId} room={room} />
          ))}
        </div>
      </div>
    </div>
  );
}

function OrganismGauge({ intelligence }: { intelligence: ThermalInertiaIntelligence }) {
  const normalizedMomentum = Math.max(0, Math.min(100, intelligence.thermalMomentum + 20));

  return (
    <div className="holographic-overlay relative overflow-hidden rounded-[8px] border border-white/10 bg-black/25 p-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(25,211,255,.16),transparent_48%)]" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">thermal momentum</p>
            <p className="mt-2 font-mono text-5xl font-semibold text-white">{intelligence.thermalMomentum}</p>
          </div>
          <motion.div
            className="grid size-20 place-items-center rounded-full border border-cyan-plasma/30 text-cyan-soft"
            animate={{ scale: [0.96, 1.05, 0.96], opacity: [0.75, 1, 0.75] }}
            transition={{ duration: 3.4, repeat: Infinity }}
          >
            <Waves size={28} />
          </motion.div>
        </div>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-cyan-plasma via-aurora-green to-aurora-rose"
            animate={{ width: `${normalizedMomentum}%` }}
            transition={{ type: "spring", stiffness: 70, damping: 18 }}
          />
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-400">
          Positive momentum means the building is absorbing heat; negative momentum means stored
          cooling is still protecting comfort.
        </p>
      </div>
    </div>
  );
}

function InertiaMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Flame;
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

function RoomThermalDecision({ room }: { room: ThermalRoomIntelligence }) {
  return (
    <motion.div whileHover={{ y: -2, scale: 1.006 }} transition={{ duration: 0.2 }} className="holographic-overlay rounded-[8px] border border-white/10 bg-white/[0.045] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">{room.roomName}</h3>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">{room.material} material</p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${actionTone[room.aiAction]}`}>
          {actionLabel[room.aiAction]}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-400">{room.actionDetail}</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniMetric label="sun" value={`${room.solarGain}%`} />
        <MiniMetric label="people" value={`${room.occupancyHeat}%`} />
        <MiniMetric label="retain" value={`${room.retentionFactor}%`} />
      </div>
    </motion.div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] bg-black/25 p-2">
      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-sm text-white">{value}</p>
    </div>
  );
}

function ChartTitle({ icon: Icon, title }: { icon: typeof Flame; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Icon size={17} className="text-cyan-soft" />
      <h3 className="font-semibold text-white">{title}</h3>
    </div>
  );
}

function HeatAccumulationChart({ rooms }: { rooms: ThermalRoomIntelligence[] }) {
  const data = rooms[0].forecast.map((point, index) => ({
    minute: `${point.minute}m`,
    heat: Math.round(rooms.reduce((sum, room) => sum + room.forecast[index].heatAccumulation, 0) / rooms.length),
    comfort: Math.round(rooms.reduce((sum, room) => sum + room.forecast[index].predictedComfort, 0) / rooms.length),
  }));

  return (
    <ChartFrame>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
        <defs>
          <linearGradient id="heatAccumulation" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff5c8a" stopOpacity={0.42} />
            <stop offset="100%" stopColor="#ff5c8a" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(155,232,255,.08)" vertical={false} />
        <XAxis dataKey="minute" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="heat" stroke="#ff5c8a" strokeWidth={2} fill="url(#heatAccumulation)" />
        <Line type="monotone" dataKey="comfort" stroke="#49f7b2" strokeWidth={2} dot={false} />
      </AreaChart>
    </ChartFrame>
  );
}

function CoolingRetentionChart({ room }: { room: ThermalRoomIntelligence }) {
  return (
    <ChartFrame>
      <AreaChart data={room.forecast} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
        <defs>
          <linearGradient id="coolingRetention" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#19d3ff" stopOpacity={0.42} />
            <stop offset="100%" stopColor="#19d3ff" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(155,232,255,.08)" vertical={false} />
        <XAxis dataKey="minute" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area
          type="monotone"
          dataKey="coolingRetention"
          name={`${room.roomName} coolth`}
          stroke="#19d3ff"
          strokeWidth={2}
          fill="url(#coolingRetention)"
        />
      </AreaChart>
    </ChartFrame>
  );
}

function FutureComfortChart({ room }: { room: ThermalRoomIntelligence }) {
  return (
    <ChartFrame height="h-64">
      <LineChart data={room.forecast} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
        <CartesianGrid stroke="rgba(155,232,255,.08)" vertical={false} />
        <XAxis dataKey="minute" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line
          type="monotone"
          dataKey="predictedComfort"
          name={`${room.roomName} comfort`}
          stroke="#49f7b2"
          strokeWidth={3}
          dot={{ r: 3, fill: "#49f7b2" }}
        />
        <Line
          type="monotone"
          dataKey="predictedTemperature"
          name="temperature"
          stroke="#ffd166"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartFrame>
  );
}

const tooltipStyle = {
  background: "rgba(3, 7, 18, 0.94)",
  border: "1px solid rgba(155, 232, 255, 0.18)",
  borderRadius: 8,
  color: "white",
};

function ChartFrame({
  children,
  height = "h-56",
}: {
  children: React.ReactElement;
  height?: string;
}) {
  return (
    <div className={`${height} w-full`}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}
