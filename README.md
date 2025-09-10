# Badminton Court Scheduler

A sophisticated web-based tournament scheduler for badminton doubles matches that optimises player rotation and court assignments to ensure fair play and minimal repetition.

## 🎯 Features

### Core Functionality

- **Smart Player Management**: Input player names with duplicate detection
- **Flexible Configuration**: Support for 1-6 courts and 1-10 rounds
- **Intelligent Scheduling**: Optimised algorithm that minimises:
  - Partner repetition (players paired together)
  - Opponent repetition (players facing each other)
  - Court imbalance (uneven court usage)
  - New interaction promotion (encourages new partnerships)
- **Print-Optimised Output**: Clean, formatted schedules ready for printing
- **Detailed Statistics**: Optional player statistics showing partnerships, opponents, and court usage

### Technical Features

- **React-based UI**: Modern, responsive interface built with React 18
- **Tailwind CSS**: Clean, professional styling
- **Real-time Validation**: Immediate feedback on player name duplicates
- **Print Functionality**: Dedicated print view with optimised formatting
- **Error Handling**: Comprehensive error messages for better user experience

## 🚀 Live Application

**[Launch Badminton Scheduler](https://damalcheruvu.github.io/doublesScheduler/)**

## 📖 How to Use

1. **Enter Players**: Add player names (one per line) in the text area
2. **Configure Settings**:
   - Select number of courts (1-6)
   - Set number of rounds (1-10)
   - Toggle statistics inclusion (optional)
3. **Generate Schedule**: Click "Generate Schedule" to create the tournament
4. **Print or Save**: Use "Print Games Only" for a clean, printable format

### Player Requirements

- Minimum 4 players required
- Each player name must be unique (duplicates will be flagged)
- Names are case-insensitive for duplicate detection

## 🛠️ Development

### Tech Stack

- **Frontend**: React 18 with Vite
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Deployment**: GitHub Pages / Vercel

### Local Development

```bash
# Clone the repository
git clone https://github.com/damalcheruvu/doublesScheduler.git
cd doublesScheduler

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run deploy` - Deploy to GitHub Pages

## 🧠 Algorithm Details

The scheduling algorithm uses a weighted scoring system that considers:

1. **Partnership Balance** (Weight: 2000)
   - Heavily penalizes repeated partnerships
   - Encourages new player combinations

2. **Opposition Balance** (Weight: 800)
   - Reduces repeated opponent matchups
   - Ensures varied competition

3. **New Interaction Bonus** (Weight: 400)
   - Rewards completely new partnerships
   - Promotes social interaction

4. **Game Balance** (Weight: 200)
   - Balances total games played per player
   - Ensures fair participation

## 📊 Output Format

The scheduler generates two types of output:

### Full Schedule

- Round-by-round breakdown
- Resting players for each round
- Court assignments with player matchups
- Optional detailed statistics

### Games Only (Print Format)

- Clean, print-optimised layout
- Formatted for A4 paper
- Professional appearance for tournaments

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

Built for badminton enthusiasts who want to organise fair and engaging tournaments with minimal administrative overhead.
