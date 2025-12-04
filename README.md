# Badminton Doubles Scheduler

Web app for generating fair badminton tournament schedules. Optimized for 18-21 players, 4 courts, 10 rounds.

**Live:** https://damalcheruvu.github.io/doublesScheduler

## Features

- Zero repeated partnerships across all rounds
- Fair opposition distribution (max 2× repeats)
- Balanced rest periods and court assignments
- Mobile-optimized interface
- Save/import player lists
- Print-ready schedule output

## Quick Start

```bash
git clone https://github.com/damalcheruvu/doublesScheduler.git
cd doublesScheduler
npm install
npm run dev
```

## Tech Stack

- React 18 + Vite 6
- Tailwind CSS 3
- Vitest for testing
- GitHub Pages deployment

## Scripts

```bash
npm run dev      # Dev server at localhost:5173
npm run build    # Production build
npm run test     # Run tests
npm run deploy   # Deploy to GitHub Pages
```

## Project Structure

```
src/
├── components/
│   ├── BadmintonScheduler.jsx    # Main UI
│   └── ui/                        # Toast, ConfirmDialog
├── lib/
│   ├── scheduler.js               # Core algorithm
│   ├── players.js                 # Player utilities
│   └── __tests__/                 # Unit tests
└── utils/                         # Helpers, validation
```

## Algorithm

The scheduler uses a multi-pass approach with weighted scoring:

1. **Partnership blocking** - Absolute prevention of repeats using `NEGATIVE_INFINITY`
2. **Opposition penalties** - Exponential scaling (3000 × count²)
3. **Rest selection** - Deterministic priority based on games played, rest count, and recency
4. **Court balance** - Even distribution across all courts

Each round evaluates 300+ player combinations to find the optimal assignment.

**Typical results (21 players, 4 courts, 10 rounds):**

- Partnerships: 0 repeats
- Oppositions: max 2× repeats
- Rest spread: 0-1 games difference
- Court spread: perfectly balanced

## Usage

1. Enter player names (one per line)
2. Select courts (1-6) and rounds (1-10)
3. Click "Generate Schedule"
4. View games tab for schedule
5. Check statistics tab for fairness metrics

**Save/Import:** Click Save to download `player_list.txt`, Import to reload it later.

## Browser Support

Chrome 61+, Firefox 60+, Safari 11+, modern mobile browsers.

## License

MIT
