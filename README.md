# The 5-Ton Challenge

> Move **5,000 kg** of total bodyweight volume across pull-ups and dips.
> One session. One target. No excuses.

A single-page, high-intensity strength-endurance tracker built with Next.js 14,
Tailwind, Framer Motion and Lucide. The aesthetic is "Industrial Athlete" —
dark grit, amber timer, emerald progress.

## Core Logic

- **Target reps per lift** = `ceil(5000 / userWeight)`
- Two independent counters (pull-ups & dips) both target that same number.
- A single global timer auto-starts on the first rep of either lift and
  freezes only when **both** counters hit their target.
- Bodyweight and best-ever time are persisted in `localStorage`
  (`fiveTon.weight`, `fiveTon.bestMs`).

## Stack

- **Next.js 14** (App Router, `app/page.tsx` is the entire one-page flow)
- **Tailwind CSS** for the dark/grit visual system
- **Framer Motion** for screen transitions, progress fills and the finish overlay
- **Lucide React** icons

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command         | Action                            |
| --------------- | --------------------------------- |
| `npm run dev`   | Start the dev server              |
| `npm run build` | Production build                  |
| `npm start`     | Run the production build          |
| `npm run lint`  | Lint with `eslint-config-next`    |

## Flow

1. **Weight Input** — large, centered numeric field: *"Current Weight (kg)?"*.
   Live-previews the rep target as you type.
2. **Dashboard** — Mission Briefing card, amber global timer (with scan-line
   FX), and two glowing vertical progress bars for pull-ups and dips. Each
   track shows reps, kg lifted so far, and reps remaining.
3. **Finish Line** — When both bars hit 100%, a "Challenge Complete" overlay
   slides in with the total time. If it beats the saved PB, a "New PB"
   badge animates in and the value is written back to `localStorage`.

## File Map

```
app/
  layout.tsx     // Root layout + metadata
  page.tsx       // Entire app: weight screen, dashboard, complete overlay
  globals.css    // Tailwind layers + grit/noise utilities
tailwind.config.ts
next.config.mjs
```

## Notes

- The timer ticks at ~19 fps (53 ms interval) which is plenty for a session
  display and easy on the battery.
- All state resets cleanly via the **Reset Session** and **Recalibrate
  weight** controls, and the PB is preserved across resets.
