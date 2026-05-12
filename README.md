# ThermaMind AI

ThermaMind AI is a real-time **comfort intelligence dashboard** for smart buildings.  
It combines occupancy trends, airflow behavior, thermal inertia, and energy analytics into a single autonomous control view.

## Features

- Realtime command center with AI confidence, adaptive setpoint, and occupancy pulse
- Digital twin building/room visualization
- Comfort-per-kWh optimization and avoided energy waste metrics
- Explainable AI rationale with intervention/event feed
- Comfort, thermal stability, occupancy, and compressor analytics panels

## Tech Stack

- Next.js 15 (App Router)
- React 19 + TypeScript
- Tailwind CSS
- Framer Motion
- Recharts

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

3. Open `http://localhost:3000` (or the port shown in terminal, e.g. `http://localhost:3001` if 3000 is occupied)

## Available Scripts

- `npm run dev` - run local dev server
- `npm run build` - create production build
- `npm run start` - start production server
- `npm run lint` - run ESLint
- `npm run typecheck` - run TypeScript checks

## Deployment (Vercel Recommended)

1. Push this repo to GitHub.
2. Import the repository in Vercel.
3. Framework preset: **Next.js**
4. Build command: `npm run build`
5. Output directory: `.next` (default)

## Repository Naming

Use a GitHub repository slug such as:

- `thermamind-ai` (recommended)
- `ThermaMind-AI`

GitHub repository URLs cannot use spaces, but the project title should remain **ThermaMind AI**.
