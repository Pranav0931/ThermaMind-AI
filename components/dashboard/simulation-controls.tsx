"use client";

import { motion } from "framer-motion";
import {
  Building2,
  Flame,
  Gauge,
  ThermometerSun,
  Users,
  Waves,
} from "lucide-react";
import type { SimulationScenario } from "@/lib/realtime/types";

const controls: Array<{
  scenario: SimulationScenario;
  label: string;
  icon: typeof Users;
}> = [
  { scenario: "occupancy-surge", label: "Simulate Occupancy Surge", icon: Users },
  { scenario: "heatwave", label: "Simulate Heatwave", icon: ThermometerSun },
  { scenario: "empty-building", label: "Simulate Empty Building", icon: Building2 },
  { scenario: "conference-event", label: "Simulate Conference Event", icon: Waves },
  { scenario: "humidity-spike", label: "Simulate Humidity Spike", icon: Flame },
  { scenario: "hvac-stress", label: "Simulate HVAC Stress", icon: Gauge },
];

export function SimulationControls({
  activeSimulation,
  onActivate,
}: {
  activeSimulation: SimulationScenario | null;
  onActivate: (scenario: SimulationScenario) => void;
}) {
  return (
    <motion.section
      className="glass-panel relative overflow-hidden rounded-[8px] p-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(25,211,255,0.14),transparent_58%)]" />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">interactive simulation controls</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Live Scenario Simulator</h2>
        </div>
        <p className="font-mono text-xs text-cyan-soft">
          {activeSimulation ? `${labelFor(activeSimulation)} active` : "No active simulation"}
        </p>
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {controls.map((control) => {
          const isActive = activeSimulation === control.scenario;
          const Icon = control.icon;

          return (
            <motion.button
              key={control.scenario}
              type="button"
              onClick={() => onActivate(control.scenario)}
              className={`group relative overflow-hidden rounded-[8px] border px-4 py-3 text-left transition ${
                isActive
                  ? "border-cyan-plasma/60 bg-cyan-plasma/15 text-white shadow-glow"
                  : "border-white/12 bg-black/30 text-slate-200 hover:border-cyan-plasma/35 hover:bg-cyan-plasma/10"
              }`}
              whileTap={{ scale: 0.98 }}
              whileHover={{ y: -2 }}
            >
              {isActive ? (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-cyan-plasma/20 via-white/10 to-cyan-plasma/20"
                  animate={{ x: ["-120%", "140%"] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                />
              ) : null}
              <span className="relative z-10 flex items-center gap-2">
                <Icon size={15} className={isActive ? "text-cyan-soft" : "text-slate-400"} />
                <span className="text-sm font-medium">{control.label}</span>
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.section>
  );
}

function labelFor(scenario: SimulationScenario) {
  const control = controls.find((item) => item.scenario === scenario);
  return control?.label ?? "Simulation";
}
