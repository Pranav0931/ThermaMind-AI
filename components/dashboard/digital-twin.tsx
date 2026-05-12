"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Cpu,
  ScanLine,
  SunMedium,
  ThermometerSun,
  Users,
  Wind,
} from "lucide-react";
import type { BuildingSnapshot, ThermalRoomIntelligence, TwinRoom } from "@/lib/realtime/types";
import { StatusPill } from "@/components/ui/status-pill";

const roomTypeLabel = {
  meeting: "Meeting room",
  office: "Office space",
  hallway: "Hallway",
  conference: "Conference room",
};

type RoomPrediction = {
  predictedTemperature: number;
  predictedComfort: number;
  risk: number;
};

export function DigitalTwin({ snapshot }: { snapshot: BuildingSnapshot }) {
  const [hoveredRoom, setHoveredRoom] = useState<TwinRoom | null>(null);

  const predictionByRoom = useMemo(() => buildPredictionMap(snapshot.thermalIntelligence.rooms), [snapshot.thermalIntelligence.rooms]);
  const futureRiskRooms = useMemo(
    () =>
      snapshot.twinRooms
        .filter((room) => {
          const prediction = predictionByRoom[room.id];
          return prediction ? prediction.risk > 56 : false;
        })
        .sort((a, b) => (predictionByRoom[b.id]?.risk ?? 0) - (predictionByRoom[a.id]?.risk ?? 0)),
    [predictionByRoom, snapshot.twinRooms],
  );

  return (
    <div className="relative min-h-[560px] overflow-hidden rounded-[8px] border border-white/10 bg-black/25 metric-grid">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(25,211,255,0.18),transparent_44%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(73,247,178,0.08),transparent_38%,rgba(255,92,138,0.08))]" />
      <motion.div
        className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-cyan-plasma/15 to-transparent"
        animate={{ y: ["-30%", "122%"] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />

      <div className="relative z-10 flex min-h-[560px] flex-col gap-5 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">digital twin visualization</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Climate Intelligence Command Floorplate</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
              A predictive climate intelligence simulation with airflow particles, thermal waves,
              sunlight vectors, occupancy movement, and AI rerouting overlays.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill tone="learning">Prediction layer live</StatusPill>
            <StatusPill tone="warning">Future risk mapping</StatusPill>
            <StatusPill tone="stable">HVAC overload avoided</StatusPill>
          </div>
        </div>

        <div className="grid flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="relative min-h-[380px] overflow-hidden rounded-[8px] border border-cyan-plasma/15 bg-slate-950/50 p-4 shadow-glow">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(25,211,255,0.12),transparent_30%),radial-gradient(circle_at_84%_78%,rgba(255,92,138,0.10),transparent_28%)]" />
            <SunlightDirectionOverlay />
            <AirflowField />
            <AirflowParticles />
            <CoolingRerouteOverlay rooms={snapshot.twinRooms} predictions={predictionByRoom} />
            <ThermalPredictionLayers rooms={snapshot.twinRooms} predictions={predictionByRoom} />
            <ThermalWaveOverlay rooms={snapshot.twinRooms} predictions={predictionByRoom} />
            <ThermalLegend />

            <div className="relative z-20 h-[380px] w-full">
              {snapshot.twinRooms.map((room, index) => (
                <RoomCell
                  key={room.id}
                  room={room}
                  index={index}
                  prediction={predictionByRoom[room.id]}
                  isHovered={hoveredRoom?.id === room.id}
                  onHover={setHoveredRoom}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <TwinSignal icon={Cpu} label="AI confidence" value={`${snapshot.aiConfidence}%`} />
            <TwinSignal icon={ThermometerSun} label="Adaptive setpoint" value={`${snapshot.adaptiveSetpoint} C`} />
            <TwinSignal icon={Wind} label="Airflow balance" value={`${snapshot.airflowBalance}%`} />
            <TwinSignal icon={Users} label="Tracked occupants" value={`${snapshot.occupancy}`} />
            <HvacLoadVisualization snapshot={snapshot} />
            <FutureRiskPanel rooms={futureRiskRooms} predictions={predictionByRoom} />

            <AnimatePresence mode="wait">
              <motion.div
                key={hoveredRoom?.id ?? "summary"}
                initial={{ opacity: 0, y: 8, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -8, filter: "blur(8px)" }}
                className="rounded-[8px] border border-white/10 bg-black/30 p-4"
              >
                {hoveredRoom ? (
                  <RoomIntel room={hoveredRoom} prediction={predictionByRoom[hoveredRoom.id]} />
                ) : (
                  <TwinSummary snapshot={snapshot} riskCount={futureRiskRooms.length} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
      <ScanLine className="absolute bottom-5 right-5 text-cyan-plasma/30" size={42} />
    </div>
  );
}

function RoomCell({
  room,
  index,
  prediction,
  isHovered,
  onHover,
}: {
  room: TwinRoom;
  index: number;
  prediction?: RoomPrediction;
  isHovered: boolean;
  onHover: (room: TwinRoom | null) => void;
}) {
  const heat = heatStyle(room);
  const occupancyRatio = Math.min(1, room.occupancy / room.capacity);
  const futureHot = prediction ? prediction.predictedTemperature > 24.6 || prediction.risk > 68 : false;

  return (
    <motion.button
      type="button"
      onMouseEnter={() => onHover(room)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(room)}
      onBlur={() => onHover(null)}
      className="group absolute z-20 overflow-hidden rounded-[8px] border text-left outline-none"
      style={{
        left: `${room.x}%`,
        top: `${room.y}%`,
        width: `${room.w}%`,
        height: `${room.h}%`,
        borderColor: isHovered ? "rgba(155,232,255,.75)" : heat.border,
        background: heat.background,
        boxShadow: isHovered ? `0 0 38px ${heat.glow}` : `0 0 24px ${heat.glow}`,
      }}
      animate={{
        scale: isHovered ? 1.025 : 1,
        opacity: [0.88, 1, 0.88],
      }}
      transition={{
        scale: { type: "spring", stiffness: 260, damping: 22 },
        opacity: { duration: 3.2 + index * 0.24, repeat: Infinity },
      }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,.12),transparent_42%)]" />
      <motion.div
        className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/15 to-transparent"
        animate={{ x: ["-120%", "240%"] }}
        transition={{ duration: 5.2 + index * 0.35, repeat: Infinity, ease: "linear" }}
      />
      {futureHot ? (
        <motion.div
          className="absolute inset-1 rounded-[8px] border border-aurora-rose/60"
          animate={{ opacity: [0.15, 0.95, 0.15], scale: [0.96, 1.02, 0.96] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
      ) : null}
      {room.active ? (
        <motion.div
          className="absolute inset-2 rounded-[8px] border border-white/30"
          animate={{ opacity: [0.1, 0.75, 0.1], scale: [0.96, 1.03, 0.96] }}
          transition={{ duration: 2.4, repeat: Infinity }}
        />
      ) : null}

      <div className="relative flex h-full flex-col justify-between p-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/55">{roomTypeLabel[room.type]}</p>
              <h3 className="mt-1 text-sm font-semibold text-white">{room.name}</h3>
            </div>
            <span className="rounded-full border border-white/20 bg-black/25 px-2 py-1 font-mono text-[11px] text-white">
              {room.temperature} C
            </span>
          </div>
        </div>

        <div>
          <OccupancyMovement room={room} />
          <div className="h-1.5 overflow-hidden rounded-full bg-black/30">
            <motion.div
              className="h-full rounded-full bg-white/75"
              animate={{ width: `${occupancyRatio * 100}%` }}
              transition={{ type: "spring", stiffness: 80, damping: 18 }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-white/75">
            <span>
              {room.occupancy}/{room.capacity}
            </span>
            <span>{room.comfortScore} comfort</span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

function AirflowField() {
  const paths = [
    "M 20 84 C 180 12, 390 38, 620 90",
    "M 28 210 C 210 160, 372 172, 620 132",
    "M 44 320 C 190 256, 410 282, 642 218",
    "M 110 42 C 210 132, 440 112, 570 310",
  ];

  return (
    <svg className="pointer-events-none absolute inset-0 z-[2] h-full w-full" viewBox="0 0 680 390" preserveAspectRatio="none">
      {paths.map((path, index) => (
        <g key={path}>
          <path d={path} fill="none" stroke="rgba(155,232,255,.12)" strokeWidth="1.2" />
          <motion.path
            d={path}
            fill="none"
            stroke={index % 2 === 0 ? "rgba(25,211,255,.78)" : "rgba(73,247,178,.62)"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="34 180"
            animate={{ strokeDashoffset: [240, 0] }}
            transition={{ duration: 3.8 + index * 0.5, repeat: Infinity, ease: "linear" }}
          />
        </g>
      ))}
    </svg>
  );
}

function AirflowParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 28 }, (_, index) => ({
        id: index,
        left: ((index * 17) % 118) - 12,
        top: 10 + ((index * 13) % 78),
        duration: 4.5 + (index % 7) * 0.55,
        delay: (index % 11) * 0.26,
        bright: index % 3 === 0,
      })),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-[3] overflow-hidden">
      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className={`absolute rounded-full ${particle.bright ? "size-2 bg-cyan-soft/75" : "size-1.5 bg-aurora-green/70"}`}
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            boxShadow: particle.bright ? "0 0 12px rgba(155,232,255,.7)" : "0 0 10px rgba(73,247,178,.55)",
          }}
          animate={{
            x: [0, 120, 260, 420],
            y: [0, -6, 4, -3],
            opacity: [0, 0.95, 0.95, 0],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

function ThermalPredictionLayers({
  rooms,
  predictions,
}: {
  rooms: TwinRoom[];
  predictions: Record<string, RoomPrediction>;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[4]">
      {rooms.map((room, index) => {
        const prediction = predictions[room.id];
        if (!prediction) {
          return null;
        }

        const heatIntensity = clamp((prediction.predictedTemperature - 22.6) * 0.36 + prediction.risk * 0.01, 0, 1);
        const coolIntensity = clamp((22 - prediction.predictedTemperature) * 0.2, 0, 0.5);

        return (
          <motion.div
            key={room.id}
            className="absolute rounded-[8px]"
            style={{
              left: `${room.x}%`,
              top: `${room.y}%`,
              width: `${room.w}%`,
              height: `${room.h}%`,
              background: `linear-gradient(145deg, rgba(255,92,138,${0.08 + heatIntensity * 0.35}), rgba(25,211,255,${0.04 + coolIntensity * 0.22}))`,
            }}
            animate={{ opacity: [0.22, 0.42, 0.22] }}
            transition={{ duration: 2.6 + index * 0.22, repeat: Infinity }}
          />
        );
      })}
    </div>
  );
}

function ThermalWaveOverlay({
  rooms,
  predictions,
}: {
  rooms: TwinRoom[];
  predictions: Record<string, RoomPrediction>;
}) {
  const hotspots = rooms
    .map((room) => ({ room, prediction: predictions[room.id] }))
    .filter((item) => item.prediction && item.prediction.risk > 62)
    .slice(0, 3);

  return (
    <div className="pointer-events-none absolute inset-0 z-[5]">
      {hotspots.map(({ room, prediction }, index) => {
        const centerX = room.x + room.w / 2;
        const centerY = room.y + room.h / 2;
        const radius = 28 + (prediction?.risk ?? 50) * 0.16;
        return (
          <motion.div
            key={room.id}
            className="absolute rounded-full border border-aurora-rose/45"
            style={{
              left: `${centerX}%`,
              top: `${centerY}%`,
              width: `${radius}%`,
              height: `${radius}%`,
              marginLeft: `${-radius / 2}%`,
              marginTop: `${-radius / 2}%`,
              boxShadow: "0 0 38px rgba(255,92,138,.25)",
            }}
            animate={{ scale: [0.72, 1.18, 1.36], opacity: [0.36, 0.22, 0] }}
            transition={{ duration: 2.4 + index * 0.35, repeat: Infinity, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}

function CoolingRerouteOverlay({
  rooms,
  predictions,
}: {
  rooms: TwinRoom[];
  predictions: Record<string, RoomPrediction>;
}) {
  const source = [...rooms].sort((a, b) => a.temperature - b.temperature)[0];
  const targets = [...rooms]
    .sort((a, b) => (predictions[b.id]?.risk ?? 0) - (predictions[a.id]?.risk ?? 0))
    .slice(0, 2);

  if (!source || targets.length === 0) {
    return null;
  }

  const sourcePoint = roomCenter(source);

  return (
    <svg className="pointer-events-none absolute inset-0 z-[6] h-full w-full" viewBox="0 0 680 390" preserveAspectRatio="none">
      {targets.map((target, index) => {
        const targetPoint = roomCenter(target);
        const midX = (sourcePoint.x + targetPoint.x) / 2;
        const controlY = Math.min(sourcePoint.y, targetPoint.y) - 24;
        const path = `M ${sourcePoint.x} ${sourcePoint.y} Q ${midX} ${controlY} ${targetPoint.x} ${targetPoint.y}`;

        return (
          <g key={target.id}>
            <path d={path} fill="none" stroke="rgba(73,247,178,.22)" strokeWidth="1.6" />
            <motion.path
              d={path}
              fill="none"
              stroke="rgba(73,247,178,.8)"
              strokeWidth="2.4"
              strokeDasharray="22 96"
              animate={{ strokeDashoffset: [160, 0] }}
              transition={{ duration: 2.4 + index * 0.3, repeat: Infinity, ease: "linear" }}
            />
            <motion.circle
              cx={sourcePoint.x}
              cy={sourcePoint.y}
              r="3.2"
              fill="rgba(73,247,178,.92)"
              animate={{ cx: [sourcePoint.x, targetPoint.x], cy: [sourcePoint.y, targetPoint.y], opacity: [0, 1, 0] }}
              transition={{ duration: 2.1 + index * 0.22, repeat: Infinity, ease: "easeInOut" }}
            />
          </g>
        );
      })}
    </svg>
  );
}

function SunlightDirectionOverlay() {
  return (
    <div className="pointer-events-none absolute right-4 top-4 z-[7] rounded-[8px] border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-400">
        <SunMedium size={14} className="text-aurora-amber" />
        sunlight vector
      </div>
      <div className="mt-2 relative h-7 w-24 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="absolute inset-y-0 left-0 w-10 rounded-full bg-gradient-to-r from-aurora-amber/50 to-transparent"
          animate={{ x: ["-45%", "160%"] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute left-2 top-1/2 h-px w-16 bg-aurora-amber/70"
          style={{ transformOrigin: "left center" }}
          animate={{ rotate: [-8, 6, -8] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
      </div>
    </div>
  );
}

function OccupancyMovement({ room }: { room: TwinRoom }) {
  const dotCount = Math.min(10, Math.max(2, Math.round(room.occupancy / 8)));
  const dots = Array.from({ length: dotCount }, (_, index) => occupancySeed(room.id, index));

  return (
    <div className="mb-2 h-4 overflow-hidden rounded-[4px]">
      <div className="relative h-full">
        {dots.map((dot, index) => (
          <motion.span
            key={`${room.id}-${index}`}
            className="absolute size-1.5 rounded-full bg-white/85"
            style={{ left: `${dot.left}%`, top: `${dot.top}%` }}
            animate={{
              x: [0, dot.shiftX, 0],
              y: [0, dot.shiftY, 0],
              opacity: [0.35, 1, 0.35],
            }}
            transition={{
              duration: dot.duration,
              delay: dot.delay,
              repeat: Infinity,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ThermalLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-20 flex flex-wrap gap-2 rounded-[8px] border border-white/10 bg-black/45 p-2 text-[11px] text-slate-300 backdrop-blur-xl">
      <LegendSwatch color="bg-aurora-green" label="optimal" />
      <LegendSwatch color="bg-cyan-plasma" label="airflow optimized" />
      <LegendSwatch color="bg-aurora-amber" label="future discomfort" />
      <LegendSwatch color="bg-aurora-rose" label="future overheating" />
    </div>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`size-2 rounded-full ${color}`} /> {label}
    </span>
  );
}

function RoomIntel({ room, prediction }: { room: TwinRoom; prediction?: RoomPrediction }) {
  const status =
    room.temperature > 23.7
      ? "Overheating risk"
      : room.temperature < 21.2
        ? "Overcooling risk"
        : "Optimal comfort";

  return (
    <>
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">hover intelligence</p>
      <h3 className="mt-2 text-lg font-semibold text-white">{room.name}</h3>
      <p className="mt-1 text-sm text-cyan-soft">{status}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <IntelMetric label="temp" value={`${room.temperature} C`} />
        <IntelMetric label="comfort" value={`${room.comfortScore}`} />
        <IntelMetric label="airflow" value={`${room.airVelocity} m/s`} />
        <IntelMetric label="drift" value={`${room.thermalDrift > 0 ? "+" : ""}${room.thermalDrift} C`} />
        <IntelMetric label="future temp" value={prediction ? `${prediction.predictedTemperature} C` : "--"} />
        <IntelMetric label="future risk" value={prediction ? `${Math.round(prediction.risk)}%` : "--"} />
      </div>
    </>
  );
}

function TwinSummary({
  snapshot,
  riskCount,
}: {
  snapshot: BuildingSnapshot;
  riskCount: number;
}) {
  return (
    <>
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">system readout</p>
      <h3 className="mt-2 text-lg font-semibold text-white">Thermal Twin Active</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        AI is simulating future discomfort zones and rerouting cooling paths to avoid HVAC overload
        before threshold breaches.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <IntelMetric label="rooms" value={`${snapshot.twinRooms.length}`} />
        <IntelMetric label="future risks" value={`${riskCount}`} />
      </div>
    </>
  );
}

function HvacLoadVisualization({ snapshot }: { snapshot: BuildingSnapshot }) {
  const compressorAvoidance = snapshot.comfortIntelligence.compressorSpikeAvoidance;
  const load = clamp(snapshot.energyLoad * 2.1, 10, 100);

  return (
    <div className="rounded-[8px] border border-white/10 bg-black/30 p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">HVAC load visualization</p>
      <div className="mt-3 space-y-2">
        <ProgressRow label="system load" value={load} tone="from-cyan-plasma to-cyan-soft" />
        <ProgressRow
          label="compressor risk"
          value={snapshot.compressorSpikeRisk}
          tone="from-aurora-amber to-aurora-rose"
        />
        <ProgressRow
          label="overload avoided"
          value={compressorAvoidance}
          tone="from-aurora-green to-cyan-soft"
        />
      </div>
    </div>
  );
}

function FutureRiskPanel({
  rooms,
  predictions,
}: {
  rooms: TwinRoom[];
  predictions: Record<string, RoomPrediction>;
}) {
  const top = rooms.slice(0, 3);

  return (
    <div className="rounded-[8px] border border-white/10 bg-black/30 p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-slate-500">
        <AlertTriangle size={14} className="text-aurora-amber" />
        predicted thermal issues
      </div>
      <div className="mt-3 space-y-2">
        {top.length === 0 ? (
          <p className="text-xs text-slate-400">No major future discomfort zones detected.</p>
        ) : (
          top.map((room) => {
            const prediction = predictions[room.id];
            return (
              <div key={room.id} className="rounded-[8px] bg-white/[0.045] p-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-white">{room.name}</p>
                  <span className="font-mono text-xs text-aurora-amber">
                    {Math.round(prediction?.risk ?? 0)}%
                  </span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-slate-400">
                  forecast {prediction?.predictedTemperature ?? "--"} C /{" "}
                  {prediction?.predictedComfort ?? "--"} comfort
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-slate-500">
        <span>{label}</span>
        <span className="font-mono text-slate-300">{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${tone}`}
          animate={{ width: `${clamp(value, 0, 100)}%` }}
          transition={{ type: "spring", stiffness: 90, damping: 18 }}
        />
      </div>
    </div>
  );
}

function IntelMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] bg-white/[0.045] p-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-sm text-white">{value}</p>
    </div>
  );
}

function TwinSignal({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[8px] border border-white/10 bg-black/30 p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-slate-500">
        <Icon size={14} className="text-cyan-soft" /> {label}
      </div>
      <p className="mt-2 font-mono text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function heatStyle(room: TwinRoom) {
  if (room.temperature >= 23.7 || room.comfortScore < 82) {
    return {
      border: "rgba(255,92,138,.44)",
      glow: "rgba(255,92,138,.24)",
      background:
        "radial-gradient(circle at 70% 30%, rgba(255,92,138,.42), transparent 60%), linear-gradient(135deg, rgba(255,92,138,.22), rgba(255,209,102,.08))",
    };
  }

  if (room.temperature <= 21.2) {
    return {
      border: "rgba(25,211,255,.44)",
      glow: "rgba(25,211,255,.24)",
      background:
        "radial-gradient(circle at 30% 20%, rgba(25,211,255,.42), transparent 58%), linear-gradient(135deg, rgba(25,211,255,.24), rgba(167,139,250,.08))",
    };
  }

  return {
    border: "rgba(73,247,178,.36)",
    glow: "rgba(73,247,178,.2)",
    background:
      "radial-gradient(circle at 50% 38%, rgba(73,247,178,.34), transparent 60%), linear-gradient(135deg, rgba(73,247,178,.18), rgba(25,211,255,.08))",
  };
}

function buildPredictionMap(thermalRooms: ThermalRoomIntelligence[]) {
  return thermalRooms.reduce<Record<string, RoomPrediction>>((acc, room) => {
    const latest = room.forecast[room.forecast.length - 1];
    const predictedTemperature = latest?.predictedTemperature ?? 22.4;
    const predictedComfort = latest?.predictedComfort ?? 90;
    const risk = clamp(
      (predictedTemperature - 23.6) * 22 + (88 - predictedComfort) * 2.5 + room.thermalMomentum * 0.14,
      0,
      100,
    );

    acc[room.roomId] = {
      predictedTemperature: round(predictedTemperature, 1),
      predictedComfort: round(predictedComfort, 0),
      risk: round(risk, 0),
    };

    return acc;
  }, {});
}

function roomCenter(room: TwinRoom) {
  return {
    x: ((room.x + room.w / 2) / 100) * 680,
    y: ((room.y + room.h / 2) / 100) * 390,
  };
}

function occupancySeed(roomId: string, index: number) {
  const hash = Array.from(`${roomId}-${index}`).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return {
    left: 5 + ((hash * 7) % 86),
    top: 8 + ((hash * 13) % 56),
    shiftX: -3 + (hash % 8),
    shiftY: -2 + ((hash * 3) % 7),
    duration: 1.4 + (hash % 4) * 0.35,
    delay: (hash % 9) * 0.08,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 1) {
  return Number(value.toFixed(digits));
}
