import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#030712",
        obsidian: "#07111f",
        panel: "rgba(11, 18, 32, 0.72)",
        frost: "rgba(229, 247, 255, 0.76)",
        cyan: {
          plasma: "#19d3ff",
          soft: "#9be8ff",
        },
        aurora: {
          green: "#49f7b2",
          amber: "#ffd166",
          rose: "#ff5c8a",
          violet: "#a78bfa",
        },
      },
      boxShadow: {
        glow: "0 0 44px rgba(25, 211, 255, 0.24)",
        innerglass: "inset 0 1px 0 rgba(255,255,255,0.14)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "SFMono-Regular", "Consolas", "monospace"],
      },
      backgroundImage: {
        "radial-grid":
          "radial-gradient(circle at 25% 20%, rgba(25,211,255,0.18), transparent 28%), radial-gradient(circle at 80% 12%, rgba(73,247,178,0.12), transparent 26%), linear-gradient(135deg, #030712 0%, #07111f 46%, #0c1020 100%)",
      },
      keyframes: {
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
      },
      animation: {
        scan: "scan 6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
