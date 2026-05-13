"use client";

import { motion } from "framer-motion";
import {
  Activity,
  BrainCircuit,
  Gauge,
  Leaf,
  Radar,
  Sparkles,
  ThermometerSun,
  Users,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { riseIn, staggerContainer } from "@/lib/animations/motion";
import { useBuildingSnapshot } from "@/lib/realtime/use-building-snapshot";
import { ComfortChart } from "@/components/dashboard/comfort-chart";
import { ComfortPerKwhOptimizerPanel } from "@/components/dashboard/comfort-per-kwh-optimizer";
import { DigitalTwin } from "@/components/dashboard/digital-twin";
import { GlassCard } from "@/components/ui/glass-card";
import { MetricTile } from "@/components/ui/metric-tile";
import { StatusPill } from "@/components/ui/status-pill";

export function CommandCenter() {
  const { snapshot } = useBuildingSnapshot(1500);
  const primaryDecision = snapshot.comfortIntelligence.decisions[0];

  return (
    <main className="relative z-10 min-h-screen overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_24%_8%,rgba(25,211,255,0.12),transparent_30%),radial-gradient(circle_at_88%_14%,rgba(73,247,178,0.09),transparent_26%),radial-gradient(circle_at_52%_92%,rgba(167,139,250,0.1),transparent_34%)]" />

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="mx-auto flex max-w-[1540px] flex-col gap-5"
      >
        <motion.header variants={riseIn} className="glass-panel holographic-overlay premium-shadow rounded-[8px] px-5 py-4">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_520px] xl:items-center">
            <div className="flex gap-4">
              <div className="ai-pulse relative grid size-[52px] shrink-0 place-items-center rounded-[8px] border border-cyan-plasma/30 bg-cyan-plasma/10 text-cyan-plasma shadow-glow">
                <motion.div
                  className="absolute inset-0 rounded-[8px] border border-cyan-plasma/30"
                  animate={{ scale: [1, 1.18, 1], opacity: [0.7, 0, 0.7] }}
                  transition={{ duration: 2.8, repeat: Infinity }}
                />
                <BrainCircuit size={26} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-[30px] font-semibold leading-none text-white sm:text-[36px]">
                    ThermaMind AI
                  </h1>
                  <StatusPill tone="stable">Live Comfort OS</StatusPill>
                </div>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">
                  A focused command center for smart buildings: predict occupancy, preserve human
                  comfort, and reduce cooling waste before HVAC load turns into energy loss.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <HeaderSignal label="occupants" value={`${snapshot.occupancy}`} icon={Users} />
              <HeaderSignal label="surge in" value={`${snapshot.predictedPeakMinutes}m`} icon={Radar} />
              <HeaderSignal label="AI confidence" value={`${snapshot.aiConfidence}%`} icon={Sparkles} />
              <HeaderSignal label="setpoint" value={`${snapshot.adaptiveSetpoint.toFixed(1)} C`} icon={ThermometerSun} />
            </div>
          </div>
        </motion.header>

        <motion.section variants={riseIn} className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <MetricTile
            icon={Gauge}
            label="Comfort-per-kWh"
            value={`${snapshot.comfortPerKwhOptimization.score}`}
            delta="+core KPI"
            tone="cyan"
          />
          <MetricTile
            icon={Leaf}
            label="Energy Waste Avoided"
            value={`${snapshot.comfortPerKwhOptimization.avoidedEnergyWaste}`}
            unit="kWh"
            delta={`${snapshot.comfortPerKwhOptimization.carbonReductionEstimate} kg CO2e`}
            tone="green"
          />
          <MetricTile
            icon={Zap}
            label="Compressor Avoided"
            value={`${snapshot.comfortPerKwhOptimization.avoidedCompressorUsage}`}
            unit="%"
            delta="spike guarded"
            tone="amber"
          />
          <MetricTile
            icon={Wind}
            label="Airflow Performance"
            value={`${snapshot.comfortPerKwhOptimization.optimizedAirflowPerformance}`}
            unit="%"
            delta="comfort optimized"
            tone="violet"
          />
        </motion.section>

        <motion.section variants={riseIn} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_410px]">
          <div className="space-y-5">
            <DigitalTwin snapshot={snapshot} />

            <GlassCard>
              <ComfortPerKwhOptimizerPanel optimization={snapshot.comfortPerKwhOptimization} />
            </GlassCard>

            <GlassCard>
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">live comfort intelligence</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Comfort Stability vs Energy Load</h2>
                </div>
                <StatusPill tone="stable">Setpoint movement minimized</StatusPill>
              </div>
              <ComfortChart data={snapshot.trend} />
            </GlassCard>
          </div>

          <aside className="space-y-5">
            <GlassCard>
              <PanelTitle eyebrow="current action" title="AI Decision" icon={Activity} />
              {primaryDecision ? (
                <div className="space-y-4">
                  <div className="rounded-[8px] border border-white/10 bg-white/[0.045] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold text-white">{primaryDecision.title}</h3>
                      <StatusPill tone={primaryDecision.priority === "high" ? "warning" : "stable"}>
                        {primaryDecision.confidence}% sure
                      </StatusPill>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-400">{primaryDecision.reasoning}</p>
                    <p className="mt-4 font-mono text-sm text-aurora-green">{primaryDecision.expectedImpact}</p>
                  </div>
                </div>
              ) : null}
            </GlassCard>

          </aside>
        </motion.section>
      </motion.div>
    </main>
  );
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
