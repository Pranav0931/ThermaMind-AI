import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { cardHoverLift } from "@/lib/animations/motion";

type GlassCardProps = {
  children: React.ReactNode;
  className?: string;
  dense?: boolean;
};

export function GlassCard({ children, className, dense = false }: GlassCardProps) {
  return (
    <motion.section
      initial="rest"
      whileHover="hover"
      variants={cardHoverLift}
      className={cn(
        "glass-panel holographic-overlay relative overflow-hidden rounded-[8px]",
        dense ? "p-4" : "p-5",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-plasma/70 to-transparent" />
      <motion.div
        className="pointer-events-none absolute -left-1/4 top-0 h-full w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        animate={{ x: ["0%", "240%"] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "linear" }}
      />
      {children}
    </motion.section>
  );
}
