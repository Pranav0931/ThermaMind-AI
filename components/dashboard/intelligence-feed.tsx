"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Cpu,
  Droplets,
  Fan,
  Flame,
  Gauge,
  Radio,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { IntelligenceEvent } from "@/lib/realtime/types";

const severityTone: Record<
  IntelligenceEvent["severity"],
  {
    shell: string;
    rail: string;
    icon: string;
    glow: string;
    label: string;
  }
> = {
  info: {
    shell: "border-cyan-plasma/20 bg-cyan-plasma/[0.045]",
    rail: "from-cyan-plasma to-cyan-soft",
    icon: "bg-cyan-plasma/10 text-cyan-soft",
    glow: "rgba(25,211,255,.32)",
    label: "advisory",
  },
  optimization: {
    shell: "border-aurora-green/20 bg-aurora-green/[0.05]",
    rail: "from-aurora-green to-cyan-soft",
    icon: "bg-aurora-green/10 text-aurora-green",
    glow: "rgba(73,247,178,.28)",
    label: "optimized",
  },
  guardrail: {
    shell: "border-aurora-amber/25 bg-aurora-amber/[0.055]",
    rail: "from-aurora-amber to-aurora-rose",
    icon: "bg-aurora-amber/10 text-aurora-amber",
    glow: "rgba(255,209,102,.34)",
    label: "guardrail",
  },
};

const categoryIcon: Record<IntelligenceEvent["category"], LucideIcon> = {
  occupancy: Users,
  airflow: Fan,
  humidity: Droplets,
  thermal: Flame,
  energy: Gauge,
  compressor: Zap,
};

export function IntelligenceFeed({ events }: { events: IntelligenceEvent[] }) {
  const [stream, setStream] = useState<IntelligenceEvent[]>(events);

  useEffect(() => {
    setStream((current) => {
      const known = new Set(current.map((event) => event.id));
      const incoming = events.filter((event) => !known.has(event.id));
      return [...incoming, ...current].slice(0, 9);
    });
  }, [events]);

  const highSignalCount = useMemo(
    () => stream.filter((event) => event.severity === "guardrail").length,
    [stream],
  );

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-[8px] border border-white/10 bg-black/25 p-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(25,211,255,.14),transparent_32%)]" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative grid size-10 place-items-center rounded-[8px] border border-cyan-plasma/25 bg-cyan-plasma/10 text-cyan-soft">
              <motion.div
                className="absolute inset-0 rounded-[8px] border border-cyan-plasma/35"
                animate={{ scale: [1, 1.22, 1], opacity: [0.72, 0, 0.72] }}
                transition={{ duration: 2.4, repeat: Infinity }}
              />
              <Radio size={18} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">live event stream</p>
              <h3 className="mt-1 font-semibold text-white">AI command center feed</h3>
            </div>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 font-mono text-xs text-cyan-soft">
            {highSignalCount} guardrails
          </div>
        </div>
      </div>

      <div className="relative space-y-3">
        <div className="absolute bottom-0 left-[18px] top-0 w-px bg-gradient-to-b from-cyan-plasma/0 via-cyan-plasma/30 to-cyan-plasma/0" />
        <AnimatePresence initial={false}>
          {stream.map((event, index) => (
            <EventCard key={event.id} event={event} index={index} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function EventCard({ event, index }: { event: IntelligenceEvent; index: number }) {
  const tone = severityTone[event.severity];
  const Icon = categoryIcon[event.category] ?? Cpu;
  const isFresh = index === 0;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: -18, scale: 0.96, filter: "blur(10px)" }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        boxShadow: isFresh ? `0 0 34px ${tone.glow}` : "0 0 0 rgba(0,0,0,0)",
      }}
      exit={{ opacity: 0, y: 16, scale: 0.98, filter: "blur(8px)" }}
      transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
      className={`relative overflow-hidden rounded-[8px] border p-4 ${tone.shell}`}
    >
      <motion.div
        className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${tone.rail}`}
        animate={{ opacity: [0.45, 1, 0.45] }}
        transition={{ duration: 2.6, repeat: Infinity }}
      />
      {isFresh ? (
        <motion.div
          className="absolute inset-0 bg-white/10"
          initial={{ x: "-120%" }}
          animate={{ x: "140%" }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />
      ) : null}

      <div className="relative flex items-start gap-3 pl-1">
        <div className={`grid size-9 shrink-0 place-items-center rounded-[8px] ${tone.icon}`}>
          <Icon size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  {tone.label}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  {event.category}
                </span>
              </div>
              <h3 className="mt-1 font-semibold text-white">{event.label}</h3>
            </div>
            <div className="text-right">
              <span className="font-mono text-sm text-aurora-green">{event.impact}</span>
              <p className="mt-1 font-mono text-[10px] text-slate-500">{formatEventTime(event.timestamp)}</p>
            </div>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-400">{event.detail}</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className={`h-full rounded-full bg-gradient-to-r ${tone.rail}`}
                animate={{ width: `${event.confidence}%` }}
                transition={{ type: "spring", stiffness: 80, damping: 18 }}
              />
            </div>
            <span className="font-mono text-xs text-slate-400">{event.confidence}%</span>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function formatEventTime(timestamp: number) {
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));

  if (seconds < 5) {
    return "now";
  }

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  return `${Math.round(seconds / 60)}m ago`;
}
