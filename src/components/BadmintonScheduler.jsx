import React, { useState, useRef } from 'react';

const defaultPlayers = `
Madhu & Kala
Usman & Simin
Murali & Rama
Phani & Jyothi
Veeru & Sridevi
`.trim();

const defaultConfig = {
  maxCourts: 4,
  maxRounds: 10,
  printStats: false,
  weights: {
    PAIR_OPPOSITION: 800,
    GAME_BALANCE: 200,
    NEW_INTERACTION: 400
  }
};

const BadmintonScheduler = () => {
  const [players, setPlayers] = useState(defaultPlayers);
  const [maxCourts, setMaxCourts] = useState(defaultConfig.maxCourts);
  const [maxRounds, setMaxRounds] = useState(defaultConfig.maxRounds);
  const [printStats, setPrintStats] = useState(defaultConfig.printStats);
  const [schedule, setSchedule] = useState('');
  const [error, setError] = useState('');
  const [gamesOnly, setGamesOnly] = useState('');
  const scheduleRef = useRef(null);

  const validatePairs = (playersText) => {
    const lines = playersText.split('\n').map(line => line.trim()).filter(line => line);
    const invalidLines = [];
    const pairs = [];

    lines.forEach(line => {
      const parts = line.split('&').map(part => part.trim());
      if (parts.length !== 2 || parts.some(part => !part)) {
        invalidLines.push(line);
      } else {
        pairs.push(parts);
      }
    });

    if (invalidLines.length > 0) {
      throw new Error(
        `Invalid pair format in lines:\n${invalidLines.join('\n')}\n\n` +
        `Each line must contain exactly two names separated by '&' symbol.\n` +
        `Example: Player1 & Player2`
      );
    }

    return pairs;
  };

  const findDuplicates = (playersText) => {
    try {
      const pairs = validatePairs(playersText);
      const allPlayers = pairs.flat();
      const duplicatesMap = new Map();
      
      allPlayers.forEach(name => {
        const lowercaseName = name.toLowerCase();
        if (!duplicatesMap.has(lowercaseName)) {
          duplicatesMap.set(lowercaseName, []);
        }
        duplicatesMap.get(lowercaseName).push(name);
      });

      return Array.from(duplicatesMap.entries())
        .filter(([_, names]) => names.length > 1);
    } catch (error) {
      return [];
    }
  };

  const printGamesOnly = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Badminton Games Schedule</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
              padding: 20px;
              max-width: 800px;
              margin: 0 auto;
              line-height: 1.4;
              font-size: 12px;
            }
            .round {
              margin-bottom: 15px;
              page-break-inside: avoid;
            }
            .round-header {
              font-weight: 700;
              font-size: 14px;
              margin-bottom: 4px;
              color: #000;
            }
            .resting-players {
              font-weight: 700;
              margin-bottom: 6px;
              color: #333;
            }
            .resting-players span {
              font-weight: 400;
            }
            .court-game {
              margin-bottom: 3px;
              color: #000;
            }
            .court-number {
              font-weight: 700;
            }
            .player-names {
              font-weight: 400;
            }
            .divider {
              margin: 12px 0;
              border-bottom: 1px solid #ccc;
            }
            @media print {
              body { padding: 0.5cm; }
              .round { margin-bottom: 12px; }
              @page {
                margin: 1cm;
                size: A4;
              }
              .round:nth-child(5n) {
                margin-bottom: 0;
                page-break-after: always;
              }
            }
          </style>
        </head>
        <body>
          ${gamesOnly.split(/Round \d+/)
            .filter(section => section.trim())
            .map((section, index) => `
              <div class="round">
                <div class="round-header">Round ${index + 1}</div>
                ${section
                  .replace(/Resting Pairs: (.*)\n/, 
                    '<div class="resting-players">Resting Pairs: <span>$1</span></div>')
                  .replace(/Court (\d+): (.*?) vs (.*?)(?=\n|$)/g, 
                    '<div class="court-game"><span class="court-number">Court $1:</span> <span class="player-names">$2 vs $3</span></div>')
                }
              </div>
            `).join('')}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  class BadmintonManager {
    constructor(maxCourts, maxRounds, printStats, weights) {
      this.maxCourts = maxCourts;
      this.maxRounds = maxRounds;
      this.printStats = printStats;
      this.pairs = [];
      this.pairOpponentHistory = new Map();
      this.courtHistory = new Map();
      this.restHistory = new Map();
      this.gamesPlayed = new Map();
      this.weights = weights;
      this.gamesOnlySchedule = '';
    }

    loadPlayers(playersText) {
      const pairs = validatePairs(playersText);
      if (pairs.length < 2) {
        throw new Error("Need at least 2 pairs (4 players) to create games");
      }
      this.pairs = pairs;
    }

    shuffle(array) {
      const newArray = [...array];
      for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
      }
      return newArray;
    }

    updateHistory(pair1, pair2, court) {
      const pairKey1 = `${pair1[0]} & ${pair1[1]}`;
      const pairKey2 = `${pair2[0]} & ${pair2[1]}`;
      
      if (!this.pairOpponentHistory.has(pairKey1)) {
        this.pairOpponentHistory.set(pairKey1, new Map());
      }
      if (!this.pairOpponentHistory.has(pairKey2)) {
        this.pairOpponentHistory.set(pairKey2, new Map());
      }

      this.pairOpponentHistory.get(pairKey1).set(pairKey2, 
        (this.pairOpponentHistory.get(pairKey1).get(pairKey2) || 0) + 1);
      this.pairOpponentHistory.get(pairKey2).set(pairKey1, 
        (this.pairOpponentHistory.get(pairKey2).get(pairKey1) || 0) + 1);

      [...pair1, ...pair2].forEach(player => {
        if (!this.courtHistory.has(player)) {
          this.courtHistory.set(player, new Map());
        }
        this.courtHistory.get(player).set(court, 
          (this.courtHistory.get(player).get(court) || 0) + 1);
        this.gamesPlayed.set(player, (this.gamesPlayed.get(player) || 0) + 1);
      });
    }

    calculateMatchScore(pair1, pair2) {
      let score = 0;
      const pairKey1 = `${pair1[0]} & ${pair1[1]}`;
      const pairKey2 = `${pair2[0]} & ${pair2[1]}`;

      const oppCount = (this.pairOpponentHistory.get(pairKey1)?.get(pairKey2) || 0);
      score -= this.weights.PAIR_OPPOSITION * oppCount;
      if (oppCount === 0) score += this.weights.NEW_INTERACTION;

      const team1Games = pair1.reduce((sum, p) => sum + (this.gamesPlayed.get(p) || 0), 0);
      const team2Games = pair2.reduce((sum, p) => sum + (this.gamesPlayed.get(p) || 0), 0);
      score -= this.weights.GAME_BALANCE * Math.abs(team1Games - team2Games);

      return score;
    }

    generateRound(roundNum) {
      let availablePairs = [...this.pairs];
      const numCourts = Math.min(Math.floor(availablePairs.length / 2), this.maxCourts);
      const pairsNeeded = numCourts * 2;
      let restingPairs = [];

      if (availablePairs.length > pairsNeeded) {
        availablePairs.sort((a, b) => {
          const restA = (this.restHistory.get(`${a[0]} & ${a[1]}`) || 0);
          const restB = (this.restHistory.get(`${b[0]} & ${b[1]}`) || 0);
          return restA - restB || Math.random() - 0.5;
        });
        restingPairs = availablePairs.slice(0, availablePairs.length - pairsNeeded);
        restingPairs.forEach(pair => {
          const pairKey = `${pair[0]} & ${pair[1]}`;
          this.restHistory.set(pairKey, (this.restHistory.get(pairKey) || 0) + 1);
        });
        availablePairs = availablePairs.slice(availablePairs.length - pairsNeeded);
      }

      const matches = [];
      while (availablePairs.length >= 2) {
        let bestScore = Number.NEGATIVE_INFINITY;
        let bestMatch = null;

        for (let i = 0; i < availablePairs.length - 1; i++) {
          for (let j = i + 1; j < availablePairs.length; j++) {
            const score = this.calculateMatchScore(availablePairs[i], availablePairs[j]);
            if (score > bestScore) {
              bestScore = score;
              bestMatch = [availablePairs[i], availablePairs[j]];
            }
          }
        }

        if (bestMatch) {
          matches.push(bestMatch);
          availablePairs = availablePairs.filter(pair => 
            pair !== bestMatch[0] && pair !== bestMatch[1]);
        }
      }

      return [restingPairs, matches];
    }

    generateSchedule() {
      let output = '';
      let gamesOutput = '';
      
      for (let roundNum = 1; roundNum <= this.maxRounds; roundNum++) {
        const [restingPairs, matches] = this.generateRound(roundNum);
        
        const roundHeader = `Round ${roundNum}`;
        output += `${roundHeader}\n`;
        gamesOutput += `${roundHeader}\n`;
        
        const restingPairsStr = `Resting Pairs: ${restingPairs.map(pair => 
          `${pair[0]} & ${pair[1]}`).join(', ')}`;
        output += `${restingPairsStr}\n`;
        gamesOutput += `${restingPairsStr}\n`;
        
        matches.forEach(([pair1, pair2], idx) => {
          const gameStr = `Court ${idx + 1}: ${pair1[0]} & ${pair1[1]} vs ${pair2[0]} & ${pair2[1]}\n`;
          output += gameStr;
          gamesOutput += gameStr;
          this.updateHistory(pair1, pair2, idx + 1);
        });
        
        output += '-'.repeat(50) + '\n';
        gamesOutput += '-'.repeat(50) + '\n';
      }

      if (this.printStats) {
        output += this.generatePairStats();
      }

      this.gamesOnlySchedule = gamesOutput.trim();
      return output;
    }

    generatePairStats() {
      let output = '\nPair Statistics:\n' + '='.repeat(50) + '\n';
      
      for (const pair of this.pairs) {
        const pairKey = `${pair[0]} & ${pair[1]}`;
        output += `\nPair: ${pairKey}\n${'-'.repeat(20)}\n`;
        output += `Games Played: ${pair.reduce((sum, p) => sum + (this.gamesPlayed.get(p) || 0), 0) / 2}\n`;
        output += `Times Rested: ${this.restHistory.get(pairKey) || 0}\n\n`;
        
        output += 'Opposition History:\n';
        const oppositions = Array.from(this.pairOpponentHistory.get(pairKey)?.entries() || [])
          .sort(([a1, c1], [a2, c2]) => c2 - c1 || a1.localeCompare(a2));
        oppositions.forEach(([opponent, count]) => {
          output += `  - against ${opponent}: ${count} times\n`;
        });

        output += '\nCourt Distribution:\n';
        const courtStats = new Map();
        pair.forEach(player => {
          const playerCourts = this.courtHistory.get(player) || new Map();
          playerCourts.forEach((count, court) => {
            courtStats.set(court, (courtStats.get(court) || 0) + count);
          });
        });
        
        Array.from(courtStats.entries())
          .sort(([a, _], [b, __]) => a - b)
          .forEach(([court, count]) => {
            output += `  - Court ${court}: ${count / 2} times\n`;
          });

        output += '\n' + '='.repeat(50) + '\n';
      }
      return output;
    }
  }

  const handlePlayersChange = (e) => {
    const newValue = e.target.value;
    try {
      validatePairs(newValue);
      const duplicates = findDuplicates(newValue);
      
      if (duplicates.length > 0) {
        const duplicateDetails = duplicates
          .map(([_, names]) => names.join(', '))
          .join('\n');
        setError(`Duplicate players detected:\n${duplicateDetails}`);
      } else {
        setError('');
      }
    } catch (err) {
      setError(err.message);
    }
    
    setPlayers(newValue);
  };

  const generateSchedule = () => {
    try {
      if (error) {
        setSchedule(`Error: ${error}`);
        return;
      }
      const manager = new BadmintonManager(maxCourts, maxRounds, printStats, defaultConfig.weights);
      manager.loadPlayers(players);
      const output = manager.generateSchedule();
      setSchedule(output);
      setGamesOnly(manager.gamesOnlySchedule);
    } catch (error) {
      setSchedule(`Error: ${error.message}`);
      setGamesOnly('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="space-y-6">
            <div>
              <label htmlFor="players" className="block text-sm font-medium text-gray-700">
                Players (enter pairs, one pair per line, separated by &)
              </label>
              <div className="mt-1">
                <textarea
                  id="players"
                  rows={20}
                  placeholder="Example:
Player1 & Player2
Player3 & Player4"
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-2 border-gray-300 rounded-md hover:border-gray-400 min-h-[400px]"
                  value={players}
                  onChange={handlePlayersChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label htmlFor="maxCourts" className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Courts
                </label>
                <div className="relative">
                  <select
                    id="maxCourts"
                    className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border-2 border-gray-300 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white cursor-pointer appearance-none"
                    value={maxCourts}
                    onChange={(e) => setMaxCourts(parseInt(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="maxRounds" className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Rounds
                </label>
                <div className="relative">
                  <select
                    id="maxRounds"
                    className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border-2 border-gray-300 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white cursor-pointer appearance-none"
                    value={maxRounds}
                    onChange={(e) => setMaxRounds(parseInt(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="flex items-center h-full mt-6">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    checked={printStats}
                    onChange={(e) => setPrintStats(e.target.checked)}
                  />
                  <span className="ml-2 text-sm text-gray-700">Include Statistics</span>
                </label>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Error
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <pre>{error}</pre>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={generateSchedule}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Generate Schedule
              </button>
              
              {gamesOnly && (
                <button
                  type="button"
                  onClick={printGamesOnly}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Print Games Only
                </button>
              )}
            </div>

            {schedule && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Generated Schedule
                </label>
                <div className="mt-1">
                  <pre
                    ref={scheduleRef}
                    className="block w-full rounded-md border border-gray-300 shadow-sm bg-gray-50 p-4 font-mono text-sm overflow-auto"
                  >
                    {schedule}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BadmintonScheduler;

