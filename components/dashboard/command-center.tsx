"use client";

import { motion } from "framer-motion";
import {
  Activity,
  BrainCircuit,
  Eye,
  Gauge,
  Leaf,
  Network,
  Radar,
  ShieldAlert,
  Sparkles,
  ThermometerSun,
  Users,
  Waves,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { riseIn, staggerContainer } from "@/lib/animations/motion";
import type { SimulationScenario } from "@/lib/realtime/types";
import { useBuildingSnapshot } from "@/lib/realtime/use-building-snapshot";
import { AdvancedAnalyticsPanels } from "@/components/dashboard/advanced-analytics-panels";
import { AirflowMap } from "@/components/dashboard/airflow-map";
import { ComfortChart } from "@/components/dashboard/comfort-chart";
import { ComfortEfficiencyOrb } from "@/components/dashboard/comfort-efficiency-orb";
import { ComfortIntelligenceEnginePanel } from "@/components/dashboard/comfort-intelligence-engine";
import { ComfortPerKwhOptimizerPanel } from "@/components/dashboard/comfort-per-kwh-optimizer";
import { DigitalTwin } from "@/components/dashboard/digital-twin";
import { ExplainableAI } from "@/components/dashboard/explainable-ai";
import { IntelligenceFeed } from "@/components/dashboard/intelligence-feed";
import { SimulationControls } from "@/components/dashboard/simulation-controls";
import { ThermalInertiaIntelligencePanel } from "@/components/dashboard/thermal-inertia-intelligence";
import { ZoneMatrix } from "@/components/dashboard/zone-matrix";
import { GlassCard } from "@/components/ui/glass-card";
import { MetricTile } from "@/components/ui/metric-tile";
import { StatusPill } from "@/components/ui/status-pill";

const systemModes: Array<[string, string, LucideIcon]> = [
  ["Predictive occupancy", "forecasting", Radar],
  ["Airflow-first comfort", "primary", Wind],
  ["Thermal inertia model", "learning", Waves],
  ["Spike avoidance", "armed", ShieldAlert],
];

export function CommandCenter() {
  const { snapshot, activeSimulation, activateSimulation } = useBuildingSnapshot(1500);

  return (
    <main className="relative z-10 min-h-screen overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_25%_8%,rgba(25,211,255,0.12),transparent_30%),radial-gradient(circle_at_88%_16%,rgba(73,247,178,0.09),transparent_26%),radial-gradient(circle_at_48%_92%,rgba(167,139,250,0.12),transparent_34%)]" />
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="mx-auto flex max-w-[1720px] flex-col gap-5"
      >
        <motion.header variants={riseIn} className="glass-panel holographic-overlay premium-shadow rounded-[8px] px-5 py-4">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4">
              <div className="ai-pulse relative grid size-[52px] place-items-center rounded-[8px] border border-cyan-plasma/30 bg-cyan-plasma/10 text-cyan-plasma shadow-glow">
                <motion.div
                  className="absolute inset-0 rounded-[8px] border border-cyan-plasma/30"
                  animate={{ scale: [1, 1.18, 1], opacity: [0.7, 0, 0.7] }}
                  transition={{ duration: 2.8, repeat: Infinity }}
                />
                <BrainCircuit size={26} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-[30px] font-semibold leading-none text-white sm:text-[34px]">
                      ThermaMind AI
                    </h1>
                    <StatusPill tone="learning">Comfort Intelligence OS</StatusPill>
                    <StatusPill tone="stable">Realtime</StatusPill>
                    {activeSimulation ? <StatusPill tone="warning">{scenarioLabel(activeSimulation)}</StatusPill> : null}
                  </div>
                  <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-300">
                    Autonomous comfort intelligence balancing human perception, airflow, thermal
                    inertia, compressor behavior, and energy efficiency across a living digital twin.
                  </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <HeaderSignal label="occupants" value={`${snapshot.occupancy}`} icon={Users} />
              <HeaderSignal label="surge in" value={`${snapshot.predictedPeakMinutes}m`} icon={Radar} />
              <HeaderSignal label="AI confidence" value={`${snapshot.aiConfidence}%`} icon={Sparkles} />
              <HeaderSignal label="setpoint" value={`${snapshot.adaptiveSetpoint} C`} icon={ThermometerSun} />
            </div>
          </div>
        </motion.header>

        <motion.section variants={riseIn} className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_380px]">
          <aside className="space-y-4">
            <GlassCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">operating state</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Autonomous Comfort</h2>
                </div>
                <Network className="text-cyan-plasma" size={22} />
              </div>
              <div className="mt-5 space-y-3">
                {systemModes.map(([label, value, Icon]) => (
                  <motion.div
                    key={label}
                    whileHover={{ y: -1, scale: 1.01 }}
                    transition={{ duration: 0.2 }}
                    className="holographic-overlay flex items-center justify-between rounded-[8px] border border-white/10 bg-white/[0.045] p-3"
                  >
                    <span className="flex items-center gap-2 text-sm text-slate-300">
                      <Icon size={15} className="text-cyan-soft" /> {label}
                    </span>
                    <span className="font-mono text-xs text-aurora-green">{value}</span>
                  </motion.div>
                ))}
              </div>
            </GlassCard>

            <ComfortEfficiencyOrb snapshot={snapshot} />

            <GlassCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">thermal stability</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">{snapshot.stabilityScore}% stable</h2>
                </div>
                <Activity className="text-aurora-violet" />
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-aurora-violet via-cyan-plasma to-aurora-green"
                  animate={{ width: `${snapshot.stabilityScore}%` }}
                  transition={{ type: "spring", stiffness: 70, damping: 18 }}
                />
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-400">
                Thermal drift is being absorbed by air distribution and building mass before setpoint
                intervention.
              </p>
            </GlassCard>
          </aside>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricTile icon={Gauge} label="Comfort-per-kWh" value={`${snapshot.comfortPerKwhOptimization.score}`} delta="+core KPI" tone="cyan" />
              <MetricTile icon={Leaf} label="Energy Waste Avoided" value={`${snapshot.comfortPerKwhOptimization.avoidedEnergyWaste}`} unit="kWh" delta={`${snapshot.comfortPerKwhOptimization.carbonReductionEstimate} kg CO2e`} tone="green" />
              <MetricTile icon={Zap} label="Compressor Avoided" value={`${snapshot.comfortPerKwhOptimization.avoidedCompressorUsage}`} unit="%" delta="spike guarded" tone="amber" />
              <MetricTile icon={Wind} label="Airflow Performance" value={`${snapshot.comfortPerKwhOptimization.optimizedAirflowPerformance}`} unit="%" delta="optimized comfort" tone="violet" />
            </div>

            <SimulationControls activeSimulation={activeSimulation} onActivate={activateSimulation} />

            <DigitalTwin snapshot={snapshot} />

            <GlassCard>
              <ComfortPerKwhOptimizerPanel optimization={snapshot.comfortPerKwhOptimization} />
            </GlassCard>

            <GlassCard>
              <ComfortIntelligenceEnginePanel intelligence={snapshot.comfortIntelligence} />
            </GlassCard>

            <GlassCard>
              <ThermalInertiaIntelligencePanel intelligence={snapshot.thermalIntelligence} />
            </GlassCard>

            <div className="grid gap-4 2xl:grid-cols-2">
              <GlassCard>
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">AI comfort intelligence</p>
                    <h2 className="mt-2 text-xl font-semibold text-white">Comfort Stability vs Energy Load</h2>
                  </div>
                  <StatusPill tone="stable">Setpoint movement minimized</StatusPill>
                </div>
                <ComfortChart data={snapshot.trend} />
              </GlassCard>

              <GlassCard>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">airflow optimization</p>
                    <h2 className="mt-2 text-xl font-semibold text-white">Perceived Comfort Map</h2>
                  </div>
                  <Wind className="text-cyan-plasma" />
                </div>
                <AirflowMap zones={snapshot.zones} />
              </GlassCard>
            </div>

            <AdvancedAnalyticsPanels data={snapshot.trend} />
          </div>

          <aside className="space-y-4">
            <GlassCard>
              <PanelTitle eyebrow="explainable AI" title="Decision Rationale" icon={Eye} />
              <ExplainableAI
                factors={snapshot.explainability}
                decisions={snapshot.comfortIntelligence.decisions}
                thermal={snapshot.thermalIntelligence}
              />
            </GlassCard>

            <GlassCard>
              <PanelTitle eyebrow="realtime AI event feed" title="Autonomous Interventions" icon={BrainCircuit} />
              <IntelligenceFeed events={snapshot.events} />
            </GlassCard>

            <GlassCard>
              <PanelTitle eyebrow="zone intelligence" title="Comfort Matrix" icon={Activity} />
              <div className="mt-4">
                <ZoneMatrix zones={snapshot.zones} />
              </div>
            </GlassCard>
          </aside>
        </motion.section>
      </motion.div>
    </main>
  );
}

function scenarioLabel(scenario: SimulationScenario | null) {
  switch (scenario) {
    case "occupancy-surge":
      return "Occupancy Surge";
    case "heatwave":
      return "Heatwave";
    case "empty-building":
      return "Empty Building";
    case "conference-event":
      return "Conference Event";
    case "humidity-spike":
      return "Humidity Spike";
    case "hvac-stress":
      return "HVAC Stress";
    default:
      return "Simulation";
  }
}

function HeaderSignal({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className="holographic-overlay min-w-32 rounded-[8px] border border-white/10 bg-black/20 px-4 py-3"
    >
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">
        <Icon size={13} className="text-cyan-soft" /> {label}
      </div>
      <p className="mt-2 font-mono text-xl font-semibold text-white">{value}</p>
    </motion.div>
  );
}

function PanelTitle({
  eyebrow,
  title,
  icon: Icon,
}: {
  eyebrow: string;
  title: string;
  icon: LucideIcon;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{eyebrow}</p>
        <h2 className="mt-2 text-xl font-semibold text-white">{title}</h2>
      </div>
      <motion.div
        className="ai-pulse shrink-0 rounded-[8px] border border-cyan-plasma/20 bg-cyan-plasma/10 p-2"
        animate={{ rotate: [0, 2.5, 0, -2.5, 0] }}
        transition={{ duration: 5, repeat: Infinity }}
      >
        <Icon className="text-cyan-plasma" size={18} />
      </motion.div>
    </div>
  );
}
