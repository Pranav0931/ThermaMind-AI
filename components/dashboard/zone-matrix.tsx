"use client";

import { motion } from "framer-motion";
import { Wind } from "lucide-react";
import type { BuildingZone } from "@/lib/realtime/types";

export function ZoneMatrix({ zones }: { zones: BuildingZone[] }) {
  return (
    <div className="grid gap-3">
      {zones.map((zone, index) => (
        <motion.div
          layout
          initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.32, delay: index * 0.04 }}
          whileHover={{ y: -2, scale: 1.006 }}
          key={zone.id}
          className="holographic-overlay rounded-[8px] border border-white/10 bg-white/[0.045] p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-cyan-soft">{zone.floor}</span>
                <h3 className="font-semibold text-white">{zone.name}</h3>
              </div>
              <p className="mt-1 text-sm text-slate-400">
                {zone.occupancy}/{zone.targetOccupancy} people predicted
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-2xl font-semibold text-white">{zone.comfortScore}</p>
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">comfort</p>
              <p className="mt-1 font-mono text-[10px] text-aurora-amber">
                risk {Math.round(Math.abs(zone.thermalDrift) * 100)}%
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-[8px] border border-white/10 bg-black/20 p-3">
              <p className="text-slate-500">Airflow</p>
              <p className="mt-1 flex items-center gap-1 font-mono text-cyan-soft">
                <Wind size={13} /> {zone.airVelocity} m/s
              </p>
            </div>
            <div className="rounded-[8px] border border-white/10 bg-black/20 p-3">
              <p className="text-slate-500">Supply</p>
              <p className="mt-1 font-mono text-white">{zone.supplyTemp} C</p>
            </div>
            <div className="rounded-[8px] border border-white/10 bg-black/20 p-3">
              <p className="text-slate-500">CO2</p>
              <p className="mt-1 font-mono text-white">{zone.co2} ppm</p>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>load share</span>
              <span className="font-mono text-slate-300">{zone.loadShare}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-plasma to-aurora-green"
                style={{ width: `${zone.loadShare}%` }}
              />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
