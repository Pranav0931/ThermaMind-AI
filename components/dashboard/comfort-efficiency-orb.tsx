"use client";

import { motion } from "framer-motion";
import { Fan, Gauge, Leaf, Zap } from "lucide-react";
import type { BuildingSnapshot } from "@/lib/realtime/types";

export function ComfortEfficiencyOrb({ snapshot }: { snapshot: BuildingSnapshot }) {
  const kpi = snapshot.comfortPerKwhOptimization;

  return (
    <div className="premium-shadow holographic-overlay relative overflow-hidden rounded-[8px] border border-white/10 bg-black/25 p-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(73,247,178,0.16),transparent_46%)]" />
      <div className="relative flex flex-col items-center text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">proprietary core kpi</p>
        <div className="relative mt-5 grid size-48 place-items-center rounded-full border border-cyan-plasma/20">
          <motion.div
            className="absolute inset-0 rounded-full bg-[conic-gradient(from_180deg,rgba(25,211,255,0.35),rgba(73,247,178,0.18),rgba(255,209,102,0.28),rgba(25,211,255,0.35))]"
            animate={{ rotate: 360 }}
            transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
            style={{ filter: "blur(10px)" }}
          />
          <motion.div
            className="absolute inset-3 rounded-full border border-dashed border-aurora-green/40"
            animate={{ rotate: 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute inset-8 rounded-full border border-cyan-plasma/30"
            animate={{ rotate: -360 }}
            transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
          />
          <div>
            <p className="font-mono text-5xl font-semibold text-white">{kpi.score}</p>
            <p className="mt-1 text-sm text-slate-300">Comfort-per-kWh Score</p>
          </div>
        </div>
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-cyan-plasma via-aurora-green to-aurora-amber"
            animate={{ width: `${Math.min(100, kpi.score)}%` }}
            transition={{ type: "spring", stiffness: 70, damping: 18 }}
          />
        </div>
        <div className="mt-5 grid w-full grid-cols-2 gap-3">
          <div className="rounded-[8px] border border-white/10 bg-white/[0.045] p-3">
            <Gauge className="mx-auto text-cyan-soft" size={18} />
            <p className="mt-2 font-mono text-lg text-white">{kpi.comfortScore}</p>
            <p className="text-xs text-slate-500">comfort</p>
          </div>
          <div className="rounded-[8px] border border-white/10 bg-white/[0.045] p-3">
            <Leaf className="mx-auto text-aurora-green" size={18} />
            <p className="mt-2 font-mono text-lg text-white">{kpi.carbonReductionEstimate}</p>
            <p className="text-xs text-slate-500">kg CO2e cut</p>
          </div>
          <div className="rounded-[8px] border border-white/10 bg-white/[0.045] p-3">
            <Zap className="mx-auto text-aurora-amber" size={18} />
            <p className="mt-2 font-mono text-lg text-white">{kpi.avoidedCompressorUsage}%</p>
            <p className="text-xs text-slate-500">compressor</p>
          </div>
          <div className="rounded-[8px] border border-white/10 bg-white/[0.045] p-3">
            <Fan className="mx-auto text-cyan-plasma" size={18} />
            <p className="mt-2 font-mono text-lg text-white">{kpi.optimizedAirflowPerformance}%</p>
            <p className="text-xs text-slate-500">airflow</p>
          </div>
        </div>
      </div>
    </div>
  );
}
