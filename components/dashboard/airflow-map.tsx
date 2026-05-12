"use client";

import { motion } from "framer-motion";
import type { BuildingZone } from "@/lib/realtime/types";

export function AirflowMap({ zones }: { zones: BuildingZone[] }) {
  return (
    <div className="metric-grid holographic-overlay relative min-h-72 overflow-hidden rounded-[8px] border border-white/10 bg-black/20 p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(25,211,255,0.12),transparent_48%)]" />
      <AirflowParticles />
      <div className="relative grid h-full grid-cols-2 gap-3">
        {zones.map((zone, index) => (
          <motion.div
            key={zone.id}
            layout
            whileHover={{ y: -2, scale: 1.01 }}
            transition={{ duration: 0.22 }}
            className="premium-shadow relative overflow-hidden rounded-[8px] border border-cyan-plasma/15 bg-cyan-plasma/[0.045] p-4"
          >
            <motion.div
              className="absolute left-0 top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-cyan-plasma/20 to-transparent"
              animate={{ x: ["-80%", "220%"] }}
              transition={{ duration: 4 + index * 0.7, repeat: Infinity, ease: "linear" }}
            />
            <div className="relative">
              <p className="font-mono text-[11px] text-cyan-soft">{zone.floor}</p>
              <p className="mt-1 font-semibold text-white">{zone.name}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                thermal risk {Math.round(Math.abs(zone.thermalDrift) * 100)}%
              </p>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-plasma to-aurora-green"
                  animate={{ width: `${Math.round(zone.airVelocity * 160)}%` }}
                  transition={{ type: "spring", stiffness: 80, damping: 18 }}
                />
              </div>
              <p className="mt-3 font-mono text-sm text-slate-300">
                drift {zone.thermalDrift > 0 ? "+" : ""}
                {zone.thermalDrift} C
              </p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-aurora-green via-cyan-soft to-aurora-rose"
                  animate={{ width: `${Math.min(100, Math.abs(zone.thermalDrift) * 300)}%` }}
                  transition={{ type: "spring", stiffness: 90, damping: 18 }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function AirflowParticles() {
  const particles = Array.from({ length: 20 }, (_, index) => ({
    id: index,
    y: 8 + ((index * 11) % 80),
    delay: (index % 9) * 0.24,
    duration: 4.2 + (index % 5) * 0.5,
  }));

  return (
    <div className="pointer-events-none absolute inset-0">
      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute size-1.5 rounded-full bg-cyan-soft/80"
          style={{ top: `${particle.y}%`, left: "-10%" }}
          animate={{ x: ["0%", "1200%"], opacity: [0, 1, 1, 0] }}
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
