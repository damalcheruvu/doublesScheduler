import { useState, useRef, useCallback, useMemo, useEffect } from 'react';

const defaultConfig = {
  maxCourts: 4,
  maxRounds: 10,
  printStats: false,
  weights: {
    PARTNERSHIP: 1500,      // Reduced base weight since we use exponential penalty
    OPPOSITION: 600,        // Reduced base weight since we use exponential penalty  
    GAME_BALANCE: 300,      // Increased importance of game balance
    NEW_INTERACTION: 200,   // Reduced since we give double bonus in algorithm
  },
};

const BadmintonScheduler = () => {
  const [players, setPlayers] = useState('');
  const [maxCourts, setMaxCourts] = useState(defaultConfig.maxCourts);
  const [maxRounds, setMaxRounds] = useState(defaultConfig.maxRounds);
  const [schedule, setSchedule] = useState('');
  const [error, setError] = useState('');
  const [gamesOnly, setGamesOnly] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('games');
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [fairnessStats, setFairnessStats] = useState(null);
  const [copyMessage, setCopyMessage] = useState('');
  const scheduleRef = useRef(null);

  // Load saved templates on component mount
  useEffect(() => {
    const saved = localStorage.getItem('badminton_templates');
    if (saved) {
      try {
        setSavedTemplates(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load templates:', e);
      }
    }
  }, []);

  // Enhanced player statistics
  const playerStats = useMemo(() => {
    const playerList = players
      .split('\n')
      .map(p => p.trim())
      .filter(p => p);
    const playerCount = playerList.length;
    const playersPerCourt = 4;
    const totalCourtSlots = maxCourts * maxRounds;
    const totalPlayerSlots = totalCourtSlots * playersPerCourt;
    const avgGamesPerPlayer =
      playerCount > 0 ? Math.floor(totalPlayerSlots / playerCount) : 0;
    const restingPerRound = Math.max(
      0,
      playerCount - maxCourts * playersPerCourt
    );

    return {
      playerCount,
      avgGamesPerPlayer,
      restingPerRound,
      totalGames: maxCourts * maxRounds,
      courtUtilization:
        playerCount >= maxCourts * 4
          ? '100%'
          : `${Math.round((playerCount / (maxCourts * 4)) * 100)}%`,
    };
  }, [players, maxCourts, maxRounds]);

  const printGamesOnly = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Badminton Games Schedule</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
              padding: 0;
              margin: 0;
              line-height: 1.3;
              font-size: 11px;
              background: white;
            }
            .page-container {
              padding: 0.8cm;
              max-width: 100%;
            }
            .tournament-header {
              text-align: center;
              margin-bottom: 15px;
              border-bottom: 2px solid #333;
              padding-bottom: 8px;
            }
            .tournament-title {
              font-size: 18px;
              font-weight: 700;
              color: #000;
              margin: 0;
            }
            .tournament-date {
              font-size: 12px;
              color: #666;
              margin: 4px 0 0 0;
            }
            .round {
              margin-bottom: 12px;
              page-break-inside: avoid;
              border: none;
              border-radius: 0;
              padding: 0;
              background: none;
            }
            .round-header {
              font-weight: 700;
              font-size: 14px;
              margin-bottom: 6px;
              color: #000;
              text-align: left;
              background: none;
              padding: 0;
              border-radius: 0;
              border-bottom: 1px solid #333;
              padding-bottom: 2px;
            }
            .resting-section {
              margin-bottom: 8px;
              padding: 0;
              background: none;
              border-left: none;
              border-radius: 0;
            }
            .resting-label {
              font-weight: 600;
              color: #333;
              font-size: 12px;
              text-transform: none;
              letter-spacing: 0;
              display: inline;
              margin-right: 8px;
            }
            .resting-players {
              font-weight: 600;
              color: #000;
              margin-top: 0;
              display: inline;
              font-size: 12px;
            }
            .courts-container {
              display: block;
            }
            .court-game {
              background: none;
              padding: 0;
              border-radius: 0;
              border: none;
              margin-bottom: 4px;
            }
            .court-number {
              font-weight: 600;
              color: #333;
              font-size: 12px;
              text-transform: none;
              letter-spacing: 0;
              margin-bottom: 0;
              display: inline;
              margin-right: 8px;
            }
            .player-names {
              font-weight: 700;
              color: #000;
              font-size: 12px;
              line-height: 1.3;
              display: inline;
            }
            .vs-separator {
              color: #666;
              font-weight: 400;
              margin: 0 4px;
            }
            .team {
              display: inline;
            }
            @media print {
              body {
                padding: 0;
                margin: 0;
                font-size: 14px;
              }
              .page-container {
                padding: 0.5cm;
              }
              @page {
                margin: 0.7cm;
                size: A4 portrait;
              }
              .tournament-header {
                margin-bottom: 12px;
              }
              .round {
                margin-bottom: 10px;
                break-inside: avoid;
              }
              .round-header {
                font-size: 15px;
                margin-bottom: 5px;
                border-bottom: 1px solid #333;
                padding-bottom: 2px;
              }
              .court-game {
                margin-bottom: 3px;
              }
              .player-names, .resting-players {
                font-weight: 700 !important;
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
                font-size: 13px !important;
              }
              .court-number {
                font-size: 13px !important;
              }
              .resting-label {
                font-size: 13px !important;
              }
              .resting-section {
                margin-bottom: 6px;
              }
            }
          </style>
        </head>
        <body>
          <div class="page-container">
            <div class="tournament-header">
              <h1 class="tournament-title">🏸 Badminton Tournament Schedule</h1>
              <p class="tournament-date">Generated on ${new Date().toLocaleDateString('en-GB', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
            </div>
            ${gamesOnly
              .split(/Round \d+/)
              .filter(section => section.trim())
              .map((section, index) => {
                const restingMatch = section.match(/Resting Players: (.*)\n/);
                const restingPlayers = restingMatch ? restingMatch[1] : '';
                
                const courtMatches = section.match(/Court (\d+): (.*?) vs (.*?)(?=\n|$)/g) || [];
                
                return `
                <div class="round">
                  <div class="round-header">Round ${index + 1}</div>
                  ${restingPlayers ? `
                    <div class="resting-section">
                      <div class="resting-label">Resting Players</div>
                      <div class="resting-players">${restingPlayers}</div>
                    </div>
                  ` : ''}
                  <div class="courts-container">
                    ${courtMatches.map(court => {
                      const courtMatch = court.match(/Court (\d+): (.*?) vs (.*?)$/);
                      if (courtMatch) {
                        const [, courtNum, team1, team2] = courtMatch;
                        return `
                          <div class="court-game">
                            <div class="court-number">Court ${courtNum}</div>
                            <div class="player-names">
                              <span class="team">${team1}</span>
                              <span class="vs-separator">vs</span>
                              <span class="team">${team2}</span>
                            </div>
                          </div>
                        `;
                      }
                      return '';
                    }).join('')}
                  </div>
                </div>
                `;
              })
              .join('')}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(gamesOnly);
      setCopyMessage('Games copied to clipboard!');
      setTimeout(() => setCopyMessage(''), 2000); // Hide message after 2 seconds
    } catch (err) {
      setCopyMessage('Failed to copy');
      setTimeout(() => setCopyMessage(''), 2000);
    }
  };

  // ... continuing from previous code ...

  const findDuplicates = playersText => {
    const names = playersText
      .split('\n')
      .map(p => p.trim())
      .filter(p => p);
    const duplicatesMap = new Map();

    names.forEach(name => {
      const lowercaseName = name.toLowerCase();
      if (!duplicatesMap.has(lowercaseName)) {
        duplicatesMap.set(lowercaseName, []);
      }
      duplicatesMap.get(lowercaseName).push(name);
    });

    return Array.from(duplicatesMap.entries()).filter(
      ([_, names]) => names.length > 1
    );
  };

  class BadmintonManager {
    constructor(maxCourts, maxRounds, printStats, weights) {
      this.maxCourts = maxCourts;
      this.maxRounds = maxRounds;
      this.printStats = printStats;
      this.players = new Set();
      this.gameHistory = [];
      this.playerGameCounts = new Map();
      this.partnerships = new Map(); // Track partnerships
      this.oppositions = new Map(); // Track oppositions
      this.courtAssignments = new Map(); // Track court assignments
      this.playerRestCounts = new Map();
      this.partnerHistory = new Map(); // Track partner history
      this.opponentHistory = new Map(); // Track opponent history
      this.courtHistory = new Map(); // Track court history
      this.restHistory = new Map(); // Track rest history
      this.gamesPlayed = new Map(); // Track games played
      this.lastRoundPlayers = new Map(); // Track last round players
      this.weights = weights;
      this.gamesOnlySchedule = '';
    }

    loadPlayers(playersText) {
      const duplicates = findDuplicates(playersText);
      if (duplicates.length > 0) {
        const duplicateDetails = duplicates
          .map(([_, names]) => names.join(', '))
          .join('\n');
        throw new Error(
          `Duplicate names detected!\nPlease add surnames to make these names unique:\n${duplicateDetails}`
        );
      }

      this.players = new Set(
        playersText
          .split('\n')
          .map(p => p.trim())
          .filter(p => p)
      );
      if (this.players.size < 4) {
        throw new Error('Need at least 4 players to create games');
      }
    }

    getOrDefault(map, key, defaultValue = new Map()) {
      if (!map.has(key)) {
        map.set(key, defaultValue);
      }
      return map.get(key);
    }

    // Track consecutive games for better rest distribution
    getConsecutiveGames(player, currentRound) {
      let consecutive = 0;
      for (let round = currentRound - 1; round >= 1; round--) {
        const playedInRound = this.lastRoundPlayers.get(`${player}_${round}`);
        if (playedInRound === true) {
          consecutive++;
        } else {
          break;
        }
      }
      return consecutive;
    }

    // Enhanced player selection that prioritizes rotation
    selectOptimalPlayers(availablePlayers, numPlayersNeeded, roundNum) {
      // Sort players by priority: rest history, game count, consecutive games
      const playerPriorities = availablePlayers.map(player => {
        const restCount = this.restHistory.get(player) || 0;
        const gameCount = this.gamesPlayed.get(player) || 0;
        const consecutiveRests = this.getConsecutiveRests(player, roundNum);
        const lastRoundRested = this.lastRoundPlayers.get(player) === false;
        
        // Priority score (higher is better)
        let priority = 0;
        priority += restCount * 1000; // Prioritize players who have rested more
        priority -= gameCount * 500;  // Prioritize players with fewer games
        priority += consecutiveRests * 800; // Prioritize players who have rested consecutively
        priority += lastRoundRested ? 1200 : 0; // High priority for players who rested last round
        
        return { player, priority };
      });

      // Sort by priority (descending) and select top players
      playerPriorities.sort((a, b) => b.priority - a.priority);
      return playerPriorities.slice(0, numPlayersNeeded).map(p => p.player);
    }

    getConsecutiveRests(player, currentRound) {
      let consecutive = 0;
      for (let round = currentRound - 1; round >= 1; round--) {
        const playedInRound = this.lastRoundPlayers.get(`${player}_${round}`);
        if (playedInRound === false) {
          consecutive++;
        } else {
          break;
        }
      }
      return consecutive;
    }

    updateHistory(team1, team2, court) {
      // Update partnership history
      for (const team of [team1, team2]) {
        const teamArr = Array.from(team);
        for (let i = 0; i < teamArr.length; i++) {
          for (let j = i + 1; j < teamArr.length; j++) {
            const p1 = teamArr[i],
              p2 = teamArr[j];
            const h1 = this.getOrDefault(this.partnerHistory, p1);
            const h2 = this.getOrDefault(this.partnerHistory, p2);
            h1.set(p2, (h1.get(p2) || 0) + 1);
            h2.set(p1, (h2.get(p1) || 0) + 1);

            // Track partnerships for statistics
            const partnerKey = [p1, p2].sort().join('-');
            this.partnerships.set(partnerKey, (this.partnerships.get(partnerKey) || 0) + 1);
          }
        }
      }

      // Update opponent history
      for (const p1 of team1) {
        for (const p2 of team2) {
          const h1 = this.getOrDefault(this.opponentHistory, p1);
          const h2 = this.getOrDefault(this.opponentHistory, p2);
          h1.set(p2, (h1.get(p2) || 0) + 1);
          h2.set(p1, (h2.get(p1) || 0) + 1);

          // Track oppositions for statistics
          const opponentKey = [p1, p2].sort().join('-');
          this.oppositions.set(opponentKey, (this.oppositions.get(opponentKey) || 0) + 1);
        }
      }

      // Track court assignments
      for (const player of [...team1, ...team2]) {
        if (!this.courtAssignments.has(player)) {
          this.courtAssignments.set(player, new Map());
        }
        const playerCourts = this.courtAssignments.get(player);
        playerCourts.set(court, (playerCourts.get(court) || 0) + 1);
      }

      // Update court and games history
      const allPlayers = new Set([...team1, ...team2]);
      for (const player of allPlayers) {
        const courtHist = this.getOrDefault(this.courtHistory, player);
        courtHist.set(court, (courtHist.get(court) || 0) + 1);
        this.gamesPlayed.set(player, (this.gamesPlayed.get(player) || 0) + 1);
      }
    }

    calculateTeamScore(team1, team2, roundNum) {
      let score = 0;
      const team1Arr = Array.from(team1);
      const team2Arr = Array.from(team2);

      // Enhanced partnership penalty with exponential growth for repeated partnerships
      for (const team of [team1Arr, team2Arr]) {
        for (let i = 0; i < team.length; i++) {
          for (let j = i + 1; j < team.length; j++) {
            const p1 = team[i], p2 = team[j];
            const partnerCount = this.getOrDefault(this.partnerHistory, p1).get(p2) || 0;
            // Exponential penalty for repeated partnerships
            score -= this.weights.PARTNERSHIP * Math.pow(partnerCount + 1, 2);
          }
        }
      }

      // Enhanced opposition tracking with diminishing returns for new interactions
      for (const p1 of team1) {
        for (const p2 of team2) {
          const oppCount = this.getOrDefault(this.opponentHistory, p1).get(p2) || 0;
          // Exponential penalty for repeated opponents
          score -= this.weights.OPPOSITION * Math.pow(oppCount + 1, 1.5);
          
          // Higher bonus for completely new interactions
          if (oppCount === 0) {
            score += this.weights.NEW_INTERACTION * 2;
          }
        }
      }

      // Enhanced game balance with progressive penalties
      const team1Games = team1Arr.reduce((sum, p) => sum + (this.gamesPlayed.get(p) || 0), 0);
      const team2Games = team2Arr.reduce((sum, p) => sum + (this.gamesPlayed.get(p) || 0), 0);
      const gameImbalance = Math.abs(team1Games - team2Games);
      score -= this.weights.GAME_BALANCE * Math.pow(gameImbalance, 1.8);

      // Bonus for players who rested last round (encourage rotation)
      const lastRoundBonus = [...team1, ...team2].reduce((bonus, player) => {
        if (this.lastRoundPlayers.get(player) === false) {
          return bonus + 500; // Significant bonus for players who rested last round
        }
        return bonus;
      }, 0);
      score += lastRoundBonus;

      // Penalty for consecutive games (encourage breaks)
      const consecutiveGamePenalty = [...team1, ...team2].reduce((penalty, player) => {
        const consecutiveGames = this.getConsecutiveGames(player, roundNum);
        if (consecutiveGames >= 2) {
          return penalty + (consecutiveGames * 300); // Increasing penalty
        }
        return penalty;
      }, 0);
      score -= consecutiveGamePenalty;

      return score;
    }

    generateRound(roundNum) {
      let availablePlayers = Array.from(this.players);
      const numCourts = Math.min(
        Math.floor(availablePlayers.length / 4),
        this.maxCourts
      );
      const actualPlayersNeeded = numCourts * 4;
      let restingPlayers = new Set();

      // Enhanced player selection for this round
      if (availablePlayers.length > actualPlayersNeeded) {
        // Use enhanced selection algorithm
        const selectedPlayers = this.selectOptimalPlayers(
          availablePlayers, 
          actualPlayersNeeded, 
          roundNum
        );
        
        restingPlayers = new Set(
          availablePlayers.filter(p => !selectedPlayers.includes(p))
        );
        
        // Update rest history and tracking
        restingPlayers.forEach(p => {
          this.restHistory.set(p, (this.restHistory.get(p) || 0) + 1);
          this.lastRoundPlayers.set(p, false);
          this.lastRoundPlayers.set(`${p}_${roundNum}`, false);
        });
        
        availablePlayers = selectedPlayers;
      }

      // Mark playing players
      availablePlayers.forEach(p => {
        this.lastRoundPlayers.set(p, true);
        this.lastRoundPlayers.set(`${p}_${roundNum}`, true);
      });

      const bestAssignments = [];
      const playersPerCourt = 4;

      // Enhanced team generation with better optimisation
      for (let court = 0; court < numCourts; court++) {
        const remainingPlayers = availablePlayers.filter(
          p =>
            !bestAssignments.some(
              assignment => assignment[1].has(p) || assignment[2].has(p)
            )
        );

        let bestScore = Number.NEGATIVE_INFINITY;
        let bestTeams = null;

        // Increased iterations for better optimisation
        const maxIterations = Math.min(100, this.factorial(remainingPlayers.length) / 24);
        
        for (let i = 0; i < maxIterations; i++) {
          const courtPlayers = this.shuffleWithBias(remainingPlayers, roundNum).slice(
            0,
            playersPerCourt
          );

          // Try multiple team combinations for these 4 players
          const combinations = this.generateTeamCombinations(courtPlayers);
          
          for (const [team1, team2] of combinations) {
            const score = this.calculateTeamScore(team1, team2, roundNum);

            if (score > bestScore) {
              bestScore = score;
              bestTeams = [team1, team2];
            }
          }
        }

        if (bestTeams) {
          bestAssignments.push([court + 1, bestTeams[0], bestTeams[1]]);
          this.updateHistory(bestTeams[0], bestTeams[1], court + 1);
        }
      }

      return [restingPlayers, bestAssignments];
    }

    shuffle(array) {
      const newArray = [...array];
      for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
      }
      return newArray;
    }

    // Enhanced shuffle that considers player history for better mixing
    shuffleWithBias(array, roundNum) {
      const newArray = [...array];
      
      // Sort by combination of randomness and strategic factors
      newArray.sort((a, b) => {
        const aGames = this.gamesPlayed.get(a) || 0;
        const bGames = this.gamesPlayed.get(b) || 0;
        const aConsecutive = this.getConsecutiveGames(a, roundNum);
        const bConsecutive = this.getConsecutiveGames(b, roundNum);
        
        // Weighted random with strategic bias
        const aWeight = Math.random() + (aGames * 0.1) + (aConsecutive * 0.2);
        const bWeight = Math.random() + (bGames * 0.1) + (bConsecutive * 0.2);
        
        return aWeight - bWeight;
      });
      
      return newArray;
    }

    // Generate all possible team combinations for 4 players
    generateTeamCombinations(players) {
      const combinations = [];
      const [p1, p2, p3, p4] = players;
      
      // All possible ways to split 4 players into 2 teams of 2
      combinations.push([new Set([p1, p2]), new Set([p3, p4])]);
      combinations.push([new Set([p1, p3]), new Set([p2, p4])]);
      combinations.push([new Set([p1, p4]), new Set([p2, p3])]);
      
      return combinations;
    }

    // Simple factorial for small numbers (used for iteration optimisation)
    factorial(n) {
      if (n <= 1) return 1;
      return n * this.factorial(n - 1);
    }

    generateSchedule() {
      let output = '';
      let gamesOutput = '';

      for (let roundNum = 1; roundNum <= this.maxRounds; roundNum++) {
        const [restingPlayers, courtAssignments] = this.generateRound(roundNum);

        const roundHeader = `Round ${roundNum}`;
        output += `${roundHeader}\n`;
        gamesOutput += `${roundHeader}\n`;

        const restingPlayersStr = `Resting Players: ${Array.from(restingPlayers).sort().join(', ')}`;
        output += `${restingPlayersStr}\n`;
        gamesOutput += `${restingPlayersStr}\n`;

        for (const [court, team1, team2] of courtAssignments) {
          const gameStr = `Court ${court}: ${Array.from(team1).sort().join(', ')} vs ${Array.from(team2).sort().join(', ')}\n`;
          output += gameStr;
          gamesOutput += gameStr;
        }
        output += '-'.repeat(50) + '\n';
        gamesOutput += '-'.repeat(50) + '\n';
      }

      this.gamesOnlySchedule = gamesOutput.trim();
      return output;
    }

    generatePlayerStats() {
      let output = '\nPlayer Statistics:\n' + '='.repeat(50) + '\n';

      for (const player of Array.from(this.players).sort()) {
        output += `\nPlayer: ${player}\n${'-'.repeat(20)}\n`;
        output += `Games Played: ${this.gamesPlayed.get(player) || 0}\n`;
        output += `Times Rested: ${this.restHistory.get(player) || 0}\n\n`;

        output += 'Partnership History:\n';
        const partnerships = Array.from(
          this.getOrDefault(this.partnerHistory, player).entries()
        )
          .filter(([_, count]) => count > 0)
          .sort(([a1, c1], [a2, c2]) => c2 - c1 || a1.localeCompare(a2));
        partnerships.forEach(([partner, count]) => {
          output += `  - with ${partner}: ${count} times\n`;
        });

        output += '\nOpposition History:\n';
        const oppositions = Array.from(
          this.getOrDefault(this.opponentHistory, player).entries()
        )
          .filter(([_, count]) => count > 0)
          .sort(([a1, c1], [a2, c2]) => c2 - c1 || a1.localeCompare(a2));
        oppositions.forEach(([opponent, count]) => {
          output += `  - against ${opponent}: ${count} times\n`;
        });

        output += '\nCourt Distribution:\n';
        const courts = Array.from(
          this.getOrDefault(this.courtHistory, player).entries()
        ).sort(([a, _], [b, __]) => a - b);
        courts.forEach(([court, count]) => {
          output += `  - Court ${court}: ${count} times\n`;
        });

        output += '\n' + '='.repeat(50) + '\n';
      }
      return output;
    }

    // Calculate fairness statistics for display
    calculateFairnessStats() {
      // Ensure all required maps are initialized
      if (!this.partnerships) this.partnerships = new Map();
      if (!this.oppositions) this.oppositions = new Map();
      if (!this.courtAssignments) this.courtAssignments = new Map();

      const stats = {
        partnerships: {
          total: this.partnerships.size || 0,
          repeated: 0,
          maxRepeats: 0,
          distribution: new Map(),
          repeatedPairs: [] // Array of {players, count}
        },
        oppositions: {
          total: this.oppositions.size || 0,
          repeated: 0,
          maxRepeats: 0,
          distribution: new Map(),
          repeatedPairs: [] // Array of {players, count}
        },
        courtAssignments: {
          players: this.courtAssignments.size || 0,
          distribution: new Map(),
          mostUsedCourt: { court: 1, count: 0 },
          leastUsedCourt: { court: 1, count: Infinity }
        }
      };

      try {
        // Analyse partnerships
        for (const [pair, count] of this.partnerships.entries()) {
          if (count > 1) {
            stats.partnerships.repeated++;
            stats.partnerships.repeatedPairs.push({ players: pair, count });
          }
          stats.partnerships.maxRepeats = Math.max(stats.partnerships.maxRepeats, count);
          
          if (!stats.partnerships.distribution.has(count)) {
            stats.partnerships.distribution.set(count, 0);
          }
          stats.partnerships.distribution.set(count, stats.partnerships.distribution.get(count) + 1);
        }

        // Analyse oppositions
        for (const [pair, count] of this.oppositions.entries()) {
          if (count > 1) {
            stats.oppositions.repeated++;
            stats.oppositions.repeatedPairs.push({ players: pair, count });
          }
          stats.oppositions.maxRepeats = Math.max(stats.oppositions.maxRepeats, count);
          
          if (!stats.oppositions.distribution.has(count)) {
            stats.oppositions.distribution.set(count, 0);
          }
          stats.oppositions.distribution.set(count, stats.oppositions.distribution.get(count) + 1);
        }

        // Sort repeated pairs by count (highest first)
        stats.partnerships.repeatedPairs.sort((a, b) => b.count - a.count);
        stats.oppositions.repeatedPairs.sort((a, b) => b.count - a.count);

        // Analyse court assignments - count total games per court
        const courtTotals = new Map();
        const courtGameCounts = new Map(); // Track actual games (not player assignments)
        
        // Count total player assignments per court
        for (const [player, courts] of this.courtAssignments.entries()) {
          if (courts && typeof courts.entries === 'function') {
            for (const [court, count] of courts.entries()) {
              courtTotals.set(court, (courtTotals.get(court) || 0) + count);
            }
          }
        }
        
        // Calculate actual game counts per court (player assignments / 4)
        for (const [court, playerAssignments] of courtTotals.entries()) {
          courtGameCounts.set(court, Math.round(playerAssignments / 4));
        }

        // Only update court stats if we have data
        if (courtGameCounts.size > 0) {
          // Store all courts with their game counts for detailed display
          stats.courtAssignments.allCourts = Array.from(courtGameCounts.entries())
            .map(([court, count]) => ({ court, count }))
            .sort((a, b) => a.court - b.court);
            
          for (const [court, gameCount] of courtGameCounts.entries()) {
            if (gameCount > stats.courtAssignments.mostUsedCourt.count) {
              stats.courtAssignments.mostUsedCourt = { court, count: gameCount };
            }
            if (gameCount < stats.courtAssignments.leastUsedCourt.count) {
              stats.courtAssignments.leastUsedCourt = { court, count: gameCount };
            }
          }
        } else {
          // Reset to safe defaults if no court data
          stats.courtAssignments.leastUsedCourt = { court: 1, count: 0 };
          stats.courtAssignments.allCourts = [];
        }
      } catch (error) {
        console.error('Error calculating fairness stats:', error);
        // Return safe defaults on error
        return {
          partnerships: { total: 0, repeated: 0, maxRepeats: 0, distribution: new Map(), repeatedPairs: [] },
          oppositions: { total: 0, repeated: 0, maxRepeats: 0, distribution: new Map(), repeatedPairs: [] },
          courtAssignments: { players: 0, distribution: new Map(), mostUsedCourt: { court: 1, count: 0 }, leastUsedCourt: { court: 1, count: 0 }, allCourts: [] }
        };
      }

      return stats;
    }
  }

  // Enhanced player validation with better error messages
  const validatePlayers = useCallback(playersText => {
    const playerList = playersText
      .split('\n')
      .map(p => p.trim())
      .filter(p => p);
    const errors = [];

    if (playerList.length < 4) {
      errors.push(
        `⚠️ Need at least 4 players (currently ${playerList.length})`
      );
    }

    if (playerList.length > 50) {
      errors.push(
        `⚠️ Maximum 50 players supported (currently ${playerList.length})`
      );
    }

    const duplicates = findDuplicates(playersText);
    if (duplicates.length > 0) {
      const duplicateDetails = duplicates
        .map(([_, names]) => names.join(', '))
        .join(', ');
      errors.push(`🔄 Duplicate names: ${duplicateDetails}`);
    }

    return errors;
  }, []);

  // Enhanced generate schedule with loading state
  const generateSchedule = useCallback(async () => {
    setIsGenerating(true);
    setError('');
    setFairnessStats(null); // Reset fairness stats

    try {
      const validationErrors = validatePlayers(players);
      if (validationErrors.length > 0) {
        setError(validationErrors.join('\n'));
        return;
      }

      // Simulate processing delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));

      const manager = new BadmintonManager(
        maxCourts,
        maxRounds,
        false, // printStats - always false since we show stats in separate tab
        defaultConfig.weights
      );
      manager.loadPlayers(players);
      const output = manager.generateSchedule();
      const fairnessData = manager.calculateFairnessStats();
      
      setSchedule(output);
      setGamesOnly(manager.gamesOnlySchedule);
      setFairnessStats(fairnessData);
      setActiveTab('games');
    } catch (error) {
      setError(`❌ ${error.message}`);
      setSchedule('');
      setGamesOnly('');
    } finally {
      setIsGenerating(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, maxCourts, maxRounds, validatePlayers]);

  // Clear players functionality
  const clearPlayers = useCallback(() => {
    if (confirm('Are you sure you want to clear all players? This action cannot be undone.')) {
      setPlayers('');
      setSchedule('');
      setGamesOnly('');
      setError('');
    }
  }, []);

  // Export players functionality - Mobile compatible
  const exportPlayers = useCallback(() => {
    if (!players.trim()) {
      alert('No players to export. Please add some players first.');
      return;
    }
    try {
      const text = players;
      const filename = 'badminton_players.txt';
      
      // Check if we're on mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile && navigator.share) {
        // Use Web Share API on mobile if available
        navigator.share({
          title: 'Badminton Players',
          text: text,
          files: [new File([text], filename, { type: 'text/plain' })]
        }).catch(() => {
          // Fallback to clipboard if sharing fails
          fallbackToClipboard(text);
        });
      } else if (navigator.clipboard && window.isSecureContext) {
        // Fallback to clipboard for mobile browsers without share API
        navigator.clipboard.writeText(text).then(() => {
          alert('Players copied to clipboard! You can paste this into a text file.');
        }).catch(() => {
          downloadFile(text, filename);
        });
      } else {
        // Traditional download for desktop or older browsers
        downloadFile(text, filename);
      }
    } catch (error) {
      alert('Error exporting players: ' + error.message);
    }
  }, [players]);

  // Helper function for file download
  const downloadFile = (text, filename) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Helper function for clipboard fallback
  const fallbackToClipboard = (text) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      alert('Players copied to clipboard! You can paste this into a text file.');
    } catch (err) {
      alert('Unable to export. Please manually copy the player names from the text box.');
    }
    document.body.removeChild(textArea);
  };

  // Import players functionality - Mobile compatible
  const importPlayers = useCallback(event => {
    const file = event.target.files[0];
    if (file) {
      // More lenient file type checking for mobile
      const isTextFile = file.type === 'text/plain' || 
                        file.name.endsWith('.txt') || 
                        file.type === '' || // Some mobile browsers don't set type
                        file.type === 'application/octet-stream'; // Some mobile browsers use this for .txt
      
      if (!isTextFile) {
        alert('Please select a text file (.txt)');
        event.target.value = '';
        return;
      }
      
      try {
        const reader = new FileReader();
        reader.onload = e => {
          const content = e.target.result;
          if (typeof content === 'string') {
            setPlayers(content);
            
            // Trigger validation after importing
            const errors = validatePlayers(content);
            setError(errors.join('\n'));
            
            alert('Players imported successfully!');
          } else {
            alert('Error: Invalid file content');
          }
          event.target.value = ''; // Reset file input
        };
        reader.onerror = () => {
          alert('Error reading file. Please try again.');
          event.target.value = '';
        };
        reader.readAsText(file);
      } catch (error) {
        alert('Error importing players: ' + error.message);
        event.target.value = '';
      }
    }
  }, [validatePlayers]);

  const handlePlayersChange = useCallback(
    e => {
      const newValue = e.target.value;
      setPlayers(newValue);

      const errors = validatePlayers(newValue);
      setError(errors.join('\n'));
    },
    [validatePlayers]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-1 sm:p-4">
      {/* Maximized Player Input Area */}
      <div className="rounded bg-white p-2 shadow-sm sm:p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 sm:text-base sm:font-semibold">
            👥 Players ({playerStats.playerCount})
          </h3>
          <div className="flex space-x-3">
            <button
              onClick={clearPlayers}
              className="rounded-lg border-2 border-red-200 bg-red-50 px-4 py-3 text-lg font-bold text-red-700 shadow-sm hover:bg-red-100 hover:border-red-300 sm:px-3 sm:py-2 sm:text-base"
            >
              Clear
            </button>
            <button
              onClick={exportPlayers}
              className="rounded-lg border-2 border-blue-200 bg-blue-50 px-4 py-3 text-lg font-bold text-blue-700 shadow-sm hover:bg-blue-100 hover:border-blue-300 sm:px-3 sm:py-2 sm:text-base"
            >
              Export
            </button>
            <label className="cursor-pointer rounded-lg border-2 border-green-200 bg-green-50 px-4 py-3 text-lg font-bold text-green-700 shadow-sm hover:bg-green-100 hover:border-green-300 sm:px-3 sm:py-2 sm:text-base">
              Import
              <input
                id="file-import"
                type="file"
                accept=".txt,text/plain,*"
                onChange={importPlayers}
                className="hidden"
                multiple={false}
              />
            </label>
          </div>
        </div>
        
        {/* Maximized textarea for mobile - much taller with bigger font */}
        <textarea
          rows={18}
          className="w-full resize-none rounded border border-gray-300 px-4 py-4 text-xl leading-snug sm:px-3 sm:py-3 sm:text-sm"
          value={players}
          onChange={handlePlayersChange}
          placeholder="Enter player names, one per line..."
          style={{ minHeight: '380px', fontSize: '24px', lineHeight: '1.3' }}
        />
        
        {playerStats.playerCount > 0 && (
          <div className="mt-1 flex justify-between text-lg font-bold text-gray-700 sm:text-base sm:font-semibold sm:text-gray-500">
            <span>{playerStats.playerCount} players</span>
            <span>{playerStats.restingPerRound} resting per round</span>
          </div>
        )}
      </div>

      {/* Ultra-Compact Settings */}
      <div className="mt-4 rounded-lg bg-white border-2 border-gray-200 p-3 shadow-lg sm:mt-5 sm:p-4">
        <div className="flex items-center justify-between">
          <div className="flex space-x-4">
            <div>
              <label className="block mb-2 text-lg font-bold text-gray-800 sm:text-base sm:font-medium sm:text-gray-700">Courts</label>
              <select
                className="w-24 rounded-lg border-2 border-gray-300 px-4 py-3 text-lg font-semibold shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 sm:w-16 sm:px-2 sm:py-2 sm:text-base sm:font-normal"
                value={maxCourts}
                onChange={e => setMaxCourts(parseInt(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-2 text-lg font-bold text-gray-800 sm:text-base sm:font-medium sm:text-gray-700">Rounds</label>
              <select
                className="w-24 rounded-lg border-2 border-gray-300 px-4 py-3 text-lg font-semibold shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 sm:w-16 sm:px-2 sm:py-2 sm:text-base sm:font-normal"
                value={maxRounds}
                onChange={e => setMaxRounds(parseInt(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="ml-4 rounded-lg bg-blue-50 border border-blue-200 p-3 max-w-xs sm:max-w-sm">
            <div className="flex items-start space-x-2">
              <span className="text-lg sm:text-base">💡</span>
              <div className="text-lg sm:text-sm text-blue-800">
                <p className="font-semibold mb-1">Pro Tip:</p>
                <p>Add players once, then use <strong>Export</strong> to save your list. Next time, just <strong>Import</strong> your saved file!</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-2 rounded border border-red-200 bg-red-50 p-2">
          <div className="text-lg text-red-700 sm:text-base">
            <pre className="whitespace-pre-wrap">{error}</pre>
          </div>
        </div>
      )}

      {/* Large Generate Button */}
      <button
        type="button"
        onClick={generateSchedule}
        disabled={isGenerating || error.length > 0}
        className="mt-6 flex w-full items-center justify-center space-x-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-lg font-bold text-white shadow-lg disabled:from-gray-400 disabled:to-gray-500 sm:py-4 sm:text-base"
      >
        {isGenerating ? (
          <>
            <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
            <span className="text-lg sm:text-base">Generating...</span>
          </>
        ) : (
          <span className="text-lg">⚡ Generate Schedule</span>
        )}
      </button>

      {/* Compact Schedule Display */}
      {(schedule || gamesOnly) && (
        <div className="mt-2 rounded bg-white shadow-sm">
          {/* Minimal Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('games')}
                className={`flex-1 px-2 py-2 text-lg font-medium sm:text-base ${
                  activeTab === 'games'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500'
                }`}
              >
                🏸 Games
              </button>
              <button
                onClick={() => setActiveTab('statistics')}
                className={`flex-1 px-2 py-2 text-lg font-medium sm:text-base ${
                  activeTab === 'statistics'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500'
                }`}
              >
                � Statistics
              </button>
            </div>
          </div>

          <div className="p-2 sm:p-3">
            {activeTab === 'games' && gamesOnly && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900 sm:text-lg sm:font-semibold">
                    Tournament Schedule
                  </h3>
                  <div className="flex space-x-4 mb-4">
                    <div className="relative">
                      <button
                        onClick={handleCopyToClipboard}
                        className="flex items-center space-x-2 rounded-lg border-2 border-gray-300 bg-gray-50 px-5 py-3 text-lg font-bold text-gray-700 shadow-sm hover:bg-gray-100 hover:border-gray-400 sm:px-3 sm:py-2 sm:text-base sm:font-medium"
                      >
                        <span>📋</span>
                        <span>Copy</span>
                      </button>
                      {copyMessage && (
                        <div className="absolute top-12 left-0 z-10 rounded-lg bg-green-600 px-3 py-2 text-lg text-white shadow-lg sm:text-base">
                          {copyMessage}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={printGamesOnly}
                      className="flex items-center space-x-2 rounded-lg border-2 border-blue-300 bg-blue-600 px-5 py-3 text-lg font-bold text-white shadow-sm hover:bg-blue-700 hover:border-blue-400 sm:px-3 sm:py-2 sm:text-base sm:font-medium"
                    >
                      <span>🖨️</span>
                      <span>Print</span>
                    </button>
                  </div>
                </div>
                <div className="rounded border bg-gray-50 p-3">
                  <pre className="overflow-auto text-lg leading-snug sm:max-h-60 sm:text-xs sm:leading-normal" style={{ minHeight: '380px', fontSize: '18px', lineHeight: '1.3' }}>
                    {gamesOnly}
                  </pre>
                </div>
              </div>
            )}

            {activeTab === 'statistics' && (
              <div>
                <h3 className="mb-3 text-lg font-bold text-gray-900 sm:text-base sm:font-semibold">
                  Tournament Statistics
                </h3>

                {fairnessStats && fairnessStats.partnerships && fairnessStats.oppositions && fairnessStats.courtAssignments && (
                  <div>
                    <h4 className="mb-3 text-lg font-bold text-gray-900 sm:text-base sm:font-semibold">
                      🎯 Fairness Analysis
                    </h4>
                    
                    {/* Partnership Fairness */}
                    <div className="mb-4 rounded bg-emerald-50 p-3 border border-emerald-200">
                      <h5 className="mb-2 text-lg font-bold text-emerald-900 sm:text-xs sm:font-semibold">👥 Partnership Distribution</h5>
                      <div className="grid grid-cols-1 gap-3 text-lg sm:grid-cols-2 sm:gap-2 sm:text-xs" style={{ fontSize: '18px' }}>
                        <div>
                          <span className="font-semibold">Total partnerships:</span> {fairnessStats.partnerships.total}
                        </div>
                        <div>
                          <span className="font-semibold">Repeated partnerships:</span> {fairnessStats.partnerships.repeated}
                        </div>
                        <div>
                          <span className="font-semibold">Max repeats:</span> {fairnessStats.partnerships.maxRepeats} times
                        </div>
                        <div>
                          <span className="font-semibold">Fairness rating:</span> 
                          <span className={`ml-1 font-bold ${fairnessStats.partnerships.maxRepeats <= 2 ? 'text-green-600' : fairnessStats.partnerships.maxRepeats <= 3 ? 'text-orange-600' : 'text-red-600'}`}>
                            {fairnessStats.partnerships.maxRepeats <= 2 ? 'Excellent' : fairnessStats.partnerships.maxRepeats <= 3 ? 'Good' : 'Needs attention'}
                          </span>
                        </div>
                      </div>
                      {fairnessStats.partnerships.repeatedPairs && fairnessStats.partnerships.repeatedPairs.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-emerald-200">
                          <div className="text-lg sm:text-base font-bold text-emerald-800 mb-1">Repeated partnerships:</div>
                          <div className="space-y-1">
                            {fairnessStats.partnerships.repeatedPairs.slice(0, 5).map((pair, index) => (
                              <div key={index} className="text-lg sm:text-sm text-emerald-700">
                                • <span className="font-medium">{pair.players}</span> - {pair.count} times
                              </div>
                            ))}
                            {fairnessStats.partnerships.repeatedPairs.length > 5 && (
                              <div className="text-lg sm:text-sm text-emerald-600 italic">
                                ... and {fairnessStats.partnerships.repeatedPairs.length - 5} more
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Opposition Fairness */}
                    <div className="mb-4 rounded bg-amber-50 p-3 border border-amber-200">
                      <h5 className="mb-2 text-lg sm:text-base font-bold text-amber-900">⚔️ Opposition Distribution</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-lg sm:text-sm">
                        <div>
                          <span className="font-medium">Total oppositions:</span> {fairnessStats.oppositions.total}
                        </div>
                        <div>
                          <span className="font-medium">Repeated oppositions:</span> {fairnessStats.oppositions.repeated}
                        </div>
                        <div>
                          <span className="font-medium">Max repeats:</span> {fairnessStats.oppositions.maxRepeats} times
                        </div>
                        <div>
                          <span className="font-medium">Fairness rating:</span> 
                          <span className={`ml-1 font-bold ${fairnessStats.oppositions.maxRepeats <= 2 ? 'text-green-600' : fairnessStats.oppositions.maxRepeats <= 3 ? 'text-orange-600' : 'text-red-600'}`}>
                            {fairnessStats.oppositions.maxRepeats <= 2 ? 'Excellent' : fairnessStats.oppositions.maxRepeats <= 3 ? 'Good' : 'Needs attention'}
                          </span>
                        </div>
                      </div>
                      {fairnessStats.oppositions.repeatedPairs && fairnessStats.oppositions.repeatedPairs.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-amber-200">
                          <div className="text-lg sm:text-base font-bold text-amber-800 mb-1">Repeated oppositions:</div>
                          <div className="space-y-1">
                            {fairnessStats.oppositions.repeatedPairs.slice(0, 5).map((pair, index) => (
                              <div key={index} className="text-lg sm:text-sm text-amber-700">
                                • <span className="font-medium">{pair.players}</span> - {pair.count} times
                              </div>
                            ))}
                            {fairnessStats.oppositions.repeatedPairs.length > 5 && (
                              <div className="text-lg sm:text-sm text-amber-600 italic">
                                ... and {fairnessStats.oppositions.repeatedPairs.length - 5} more
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 text-lg sm:text-sm text-gray-500 italic">
                      💡 This analysis shows how fairly the algorithm distributed partnerships and oppositions. Green indicates optimal fairness.
                    </div>
                  </div>
                )}
              </div>
            )}

            {!schedule && !gamesOnly && activeTab !== 'statistics' && (
              <div className="py-6 text-center">
                <div className="text-2xl mb-1">🏸</div>
                <h3 className="mb-1 text-lg font-bold text-gray-900 sm:text-base sm:font-medium">
                  No Schedule Yet
                </h3>
                <p className="text-lg text-gray-500 sm:text-base">
                  Add players and generate your tournament.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BadmintonScheduler;
