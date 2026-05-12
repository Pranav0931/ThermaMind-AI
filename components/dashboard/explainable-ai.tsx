"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Brain,
  Gauge,
  Leaf,
  ShieldAlert,
  Sparkles,
  Waves,
  Wind,
} from "lucide-react";
import type {
  ComfortAIDecision,
  ExplainableFactor,
  ThermalInertiaIntelligence,
} from "@/lib/realtime/types";

const iconMap = {
  comfort: Brain,
  energy: Leaf,
  risk: ShieldAlert,
};

const toneMap = {
  comfort: "from-cyan-plasma to-cyan-soft",
  energy: "from-aurora-green to-cyan-soft",
  risk: "from-aurora-amber to-aurora-rose",
};

const decisionIcon = {
  "increase-airflow": Wind,
  "redirect-cooling": ArrowRight,
  "preempt-overheat": ShieldAlert,
  "balance-humidity": Waves,
  "hold-setpoint": Brain,
  "avoid-compressor-spike": Gauge,
  "reduce-cooling-waste": Leaf,
};

export function ExplainableAI({
  factors,
  decisions,
  thermal,
}: {
  factors: ExplainableFactor[];
  decisions: ComfortAIDecision[];
  thermal: ThermalInertiaIntelligence;
}) {
  const topDecisions = decisions.slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-[8px] border border-cyan-plasma/25 bg-cyan-plasma/[0.06] p-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_20%,rgba(25,211,255,.18),transparent_44%)]" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-sm font-semibold text-cyan-soft">
            <Sparkles size={16} /> AI reasoning visualization
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Confidence pathways show the explainability chain from occupancy and thermal signals to
            control actions.
          </p>
          <div className="mt-4">
            <ReasoningFlow factors={factors} />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {topDecisions.map((decision, index) => {
          const Icon = decisionIcon[decision.type] ?? Brain;
          const confidence = decision.confidence;
          return (
            <motion.article
              key={decision.id}
              initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.42, delay: index * 0.06 }}
              className="rounded-[8px] border border-white/12 bg-white/[0.045] p-4"
            >
              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-[8px] bg-cyan-plasma/10 text-cyan-soft">
                  <Icon size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <motion.h3
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35, delay: index * 0.07 + 0.1 }}
                      className="font-semibold text-white"
                    >
                      {explainWhy(decision)}
                    </motion.h3>
                    <span className="rounded-full border border-cyan-plasma/30 bg-cyan-plasma/10 px-2 py-1 font-mono text-xs text-cyan-soft">
                      {confidence}%
                    </span>
                  </div>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: index * 0.07 + 0.18 }}
                    className="mt-2 text-sm leading-6 text-slate-400"
                  >
                    {decision.reasoning}
                  </motion.p>
                  <p className="mt-2 text-xs text-slate-400">{decision.action}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <ImpactMetric
                      label="energy impact"
                      value={estimateEnergyImpact(decision, confidence)}
                      tone="energy"
                    />
                    <ImpactMetric
                      label="comfort impact"
                      value={estimateComfortImpact(decision, confidence)}
                      tone="comfort"
                    />
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-plasma via-cyan-soft to-aurora-green"
                      animate={{ width: `${confidence}%` }}
                      transition={{ type: "spring", stiffness: 80, damping: 18 }}
                    />
                  </div>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>

      <div className="grid gap-2">
        {factors.map((factor) => {
          const Icon = iconMap[factor.direction];
          return (
            <div key={factor.label} className="rounded-[8px] border border-white/10 bg-white/[0.04] p-3">
              <div className="flex items-start gap-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-[8px] bg-white/10 text-cyan-soft">
                  <Icon size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-sm font-medium text-white">{factor.label}</h4>
                    <span className="font-mono text-xs text-slate-300">{factor.weight}%</span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{factor.reasoning}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className={`h-full rounded-full bg-gradient-to-r ${toneMap[factor.direction]}`}
                      animate={{ width: `${factor.weight}%` }}
                      transition={{ type: "spring", stiffness: 70, damping: 18 }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-[8px] border border-cyan-plasma/20 bg-cyan-plasma/[0.06] p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-cyan-soft">
          <Sparkles size={16} /> Thermal intelligence status
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Thermal inertia optimization applied. Current mode is{" "}
          <span className="font-mono text-cyan-soft">{thermal.organismState}</span> with{" "}
          <span className="font-mono text-cyan-soft">{thermal.fluctuationSuppression}%</span>{" "}
          fluctuation suppression.
        </p>
      </div>
    </div>
  );
}

function ReasoningFlow({ factors }: { factors: ExplainableFactor[] }) {
  const top = [...factors].sort((a, b) => b.weight - a.weight).slice(0, 3);
  return (
    <div className="rounded-[8px] border border-white/10 bg-black/25 p-3">
      <div className="space-y-2">
        {top.map((factor, index) => (
          <div key={factor.label} className="flex items-center gap-2">
            <span className="w-16 shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
              signal {index + 1}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-plasma via-cyan-soft to-aurora-green"
                animate={{ width: `${factor.weight}%`, opacity: [0.65, 1, 0.65] }}
                transition={{ width: { duration: 0.5 }, opacity: { duration: 2, repeat: Infinity } }}
              />
            </div>
            <span className="w-9 text-right font-mono text-xs text-cyan-soft">{factor.weight}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImpactMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "comfort" | "energy";
}) {
  return (
    <div
      className={`rounded-[8px] border p-2 ${
        tone === "energy"
          ? "border-aurora-green/25 bg-aurora-green/[0.06]"
          : "border-cyan-plasma/25 bg-cyan-plasma/[0.06]"
      }`}
    >
      <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-xs text-white">{value}</p>
    </div>
  );
}

function explainWhy(decision: ComfortAIDecision) {
  switch (decision.type) {
    case "increase-airflow":
      return "AI increased airflow instead of lowering temperature.";
    case "preempt-overheat":
      return "Predicted discomfort exceeded threshold.";
    case "avoid-compressor-spike":
      return "Compressor activation avoided.";
    case "hold-setpoint":
      return "Thermal inertia optimization applied.";
    case "redirect-cooling":
      return "Cooling redirected to occupied zones.";
    case "balance-humidity":
      return "Humidity imbalance crossed comfort tolerance.";
    case "reduce-cooling-waste":
      return "Cooling waste exceeded efficiency threshold.";
  }
}

function estimateEnergyImpact(decision: ComfortAIDecision, confidence: number) {
  const base = confidence * 0.08;
  switch (decision.type) {
    case "increase-airflow":
      return `-${(base + 1.2).toFixed(1)} kWh projected`;
    case "redirect-cooling":
      return `-${(base + 1.7).toFixed(1)} kWh projected`;
    case "preempt-overheat":
      return `+${(base + 0.9).toFixed(1)} kWh preventive`;
    case "avoid-compressor-spike":
      return `-${(base + 2.4).toFixed(1)} kWh peak avoided`;
    case "hold-setpoint":
      return `-${(base + 1.4).toFixed(1)} kWh stabilized`;
    case "balance-humidity":
      return `+${(base + 0.6).toFixed(1)} kWh latent load`;
    case "reduce-cooling-waste":
      return `-${(base + 2.1).toFixed(1)} kWh recovered`;
  }
}

function estimateComfortImpact(decision: ComfortAIDecision, confidence: number) {
  const base = confidence * 0.03;
  switch (decision.type) {
    case "increase-airflow":
      return `+${(base + 1.2).toFixed(1)} comfort pts`;
    case "redirect-cooling":
      return `+${(base + 1.4).toFixed(1)} comfort pts`;
    case "preempt-overheat":
      return `+${(base + 1.8).toFixed(1)} comfort pts`;
    case "avoid-compressor-spike":
      return `+${(base + 0.9).toFixed(1)} stability pts`;
    case "hold-setpoint":
      return `+${(base + 1.1).toFixed(1)} comfort pts`;
    case "balance-humidity":
      return `+${(base + 1).toFixed(1)} comfort pts`;
    case "reduce-cooling-waste":
      return `+${(base + 0.7).toFixed(1)} comfort pts`;
  }
}
