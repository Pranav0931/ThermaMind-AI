import type { Variants } from "framer-motion";

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.06,
    },
  },
};

export const riseIn: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.985, filter: "blur(10px)" },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.62, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export const cardHoverLift = {
  rest: { y: 0, scale: 1 },
  hover: {
    y: -3,
    scale: 1.005,
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const },
  },
};
