"use client";

import { useEffect, useState } from "react";
import { createBuildingSnapshot } from "@/lib/realtime/mock-engine";
import type { BuildingSnapshot, SimulationScenario } from "@/lib/realtime/types";

export function useBuildingSnapshot(intervalMs = 1800): {
  snapshot: BuildingSnapshot;
  activeSimulation: SimulationScenario | null;
  activateSimulation: (scenario: SimulationScenario) => void;
} {
  const [tick, setTick] = useState(0);
  const [activeSimulation, setActiveSimulation] = useState<SimulationScenario | null>(null);
  const [simulationActivatedAtTick, setSimulationActivatedAtTick] = useState(0);
  const [snapshot, setSnapshot] = useState(() =>
    createBuildingSnapshot(0, {
      scenario: null,
      activatedAtTick: 0,
    }),
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTick((current) => current + 1);
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [intervalMs]);

  useEffect(() => {
    setSnapshot(
      createBuildingSnapshot(tick, {
        scenario: activeSimulation,
        activatedAtTick: simulationActivatedAtTick,
      }),
    );
  }, [activeSimulation, simulationActivatedAtTick, tick]);

  function activateSimulation(scenario: SimulationScenario) {
    setActiveSimulation(scenario);
    setSimulationActivatedAtTick(tick);
    setTick((current) => current + 1);
  }

  return {
    snapshot,
    activeSimulation,
    activateSimulation,
  };
}
