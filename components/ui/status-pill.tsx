import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

type StatusTone = "stable" | "warning" | "critical" | "learning";

const toneMap: Record<StatusTone, string> = {
  stable: "border-aurora-green/30 bg-aurora-green/10 text-aurora-green",
  warning: "border-aurora-amber/35 bg-aurora-amber/10 text-aurora-amber",
  critical: "border-aurora-rose/35 bg-aurora-rose/10 text-aurora-rose",
  learning: "border-cyan-plasma/35 bg-cyan-plasma/10 text-cyan-soft",
};

export function StatusPill({
  children,
  tone = "stable",
  className,
}: {
  children: React.ReactNode;
  tone?: StatusTone;
  className?: string;
}) {
  return (
    <motion.span
      whileHover={{ y: -1, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "holographic-overlay inline-flex h-7 items-center rounded-full border px-3 text-[11px] font-semibold uppercase tracking-[0.18em]",
        toneMap[tone],
        className,
      )}
    >
      {children}
    </motion.span>
  );
}
