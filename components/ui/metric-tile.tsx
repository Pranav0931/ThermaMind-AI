import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function MetricTile({
  icon: Icon,
  label,
  value,
  unit,
  delta,
  tone = "cyan",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  unit?: string;
  delta: string;
  tone?: "cyan" | "green" | "amber" | "violet";
}) {
  const toneClass = {
    cyan: "text-cyan-plasma bg-cyan-plasma/12",
    green: "text-aurora-green bg-aurora-green/12",
    amber: "text-aurora-amber bg-aurora-amber/12",
    violet: "text-aurora-violet bg-aurora-violet/12",
  }[tone];

  return (
    <motion.div
      initial={{ opacity: 0.96 }}
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ duration: 0.24 }}
      className="premium-shadow futuristic-loader holographic-overlay rounded-[8px] border border-white/10 bg-white/[0.045] p-4 shadow-innerglass"
    >
      <div className="flex items-center justify-between gap-3">
        <div className={cn("grid size-9 place-items-center rounded-[8px]", toneClass)}>
          <Icon size={18} />
        </div>
        <span className="font-mono text-[11px] text-slate-300">{delta}</span>
      </div>
      <div className="mt-5">
        <p className="text-[12px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
        <p className="mt-1 flex items-baseline gap-1 font-mono text-3xl font-semibold text-white">
          {value}
          {unit ? <span className="text-sm font-medium text-slate-400">{unit}</span> : null}
        </p>
      </div>
    </motion.div>
  );
}
