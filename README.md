# Badminton Tournament Scheduler

A React-based web application for generating badminton doubles tournament schedules with automated player rotation and court assignment.

## Features

- Player input with duplicate validation
- Configurable courts (1-6) and rounds (1-10)
- Automated schedule generation using weighted algorithm
- Export/import player lists as text files
- Mobile-optimized interface with 24px fonts
- Print-ready schedule output
- Partnership and opposition statistics

## Technical Stack

- **React 18.3.1** with functional components and hooks
- **Vite 6.0.3** for build tooling and development server
- **Tailwind CSS 3.4.17** for styling with mobile-first responsive design
- **TypeScript** support with ESLint and Prettier
- **Vitest** for testing framework
- **GitHub Pages** deployment

## Development Setup

```bash
git clone https://github.com/damalcheruvu/doublesScheduler.git
cd doublesScheduler
npm install
npm run dev
```

## Available Scripts

- `npm run dev` - Development server on http://localhost:5173
- `npm run build` - Production build to `dist/`
- `npm run preview` - Preview production build
- `npm run lint` - ESLint with auto-fix
- `npm run test` - Run test suite
- `npm run deploy` - Deploy to GitHub Pages

## Algorithm Implementation

The scheduling algorithm uses a weighted scoring system:

1. **Partnership penalty**: 1500 base weight with exponential scaling for repeated partnerships
2. **Opposition penalty**: 600 base weight for repeated opponent matchups  
3. **Game balance**: 300 weight to distribute games evenly across players
4. **New interaction bonus**: 200 weight to encourage new partnerships

The algorithm generates multiple schedule candidates and selects the one with the lowest total penalty score.

## File Structure

```
src/
  components/
    BadmintonScheduler.jsx    # Main component with scheduling logic
  App.jsx                     # Root component
  main.jsx                    # Application entry point
```

## Key Dependencies

- `react` & `react-dom` - Core React framework
- `clsx` & `tailwind-merge` - Conditional CSS class utilities
- `lucide-react` - Icon components
- `gh-pages` - GitHub Pages deployment

## Build Output

- Bundle size: ~175KB JavaScript, ~17KB CSS
- Gzipped: ~55KB JavaScript, ~4KB CSS
- Single-page application with code splitting

## Browser Support

Requires modern browsers with ES modules support (Chrome 61+, Firefox 60+, Safari 11+).

## Deployment

Deployed to GitHub Pages at: https://damalcheruvu.github.io/doublesScheduler

Deployment is automated via GitHub Actions on push to main branch.
