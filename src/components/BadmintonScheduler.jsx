import React, { useState, useRef } from 'react';

const defaultPlayers = `
Appa
Jeevan
Koti
Madhu
Murali
Phani
Prasad
Praveen
Raghu R
Rambabu
Rao Seema
Ravi G
Tarun
Sreeni
Subhani
Tripura
Srinivas
Vijay
Randeep
`.trim();

const defaultConfig = {
  maxCourts: 4,
  maxRounds: 10,
  printStats: false,
  weights: {
    PARTNERSHIP: 2000,
    OPPOSITION: 800,
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
              body {
                padding: 0.5cm;
              }
              .round {
                margin-bottom: 12px;
              }
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
                  .replace(/Resting Players: (.*)\n/, 
                    '<div class="resting-players">Resting Players: <span>$1</span></div>')
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

  // ... continuing from previous code ...

  const findDuplicates = (playersText) => {
    const names = playersText.split('\n').map(p => p.trim()).filter(p => p);
    const duplicatesMap = new Map();
    
    names.forEach(name => {
      const lowercaseName = name.toLowerCase();
      if (!duplicatesMap.has(lowercaseName)) {
        duplicatesMap.set(lowercaseName, []);
      }
      duplicatesMap.get(lowercaseName).push(name);
    });

    return Array.from(duplicatesMap.entries())
      .filter(([_, names]) => names.length > 1);
  };

  class BadmintonManager {
    constructor(maxCourts, maxRounds, printStats, weights) {
      this.maxCourts = maxCourts;
      this.maxRounds = maxRounds;
      this.printStats = printStats;
      this.players = new Set();
      this.partnerHistory = new Map();
      this.opponentHistory = new Map();
      this.courtHistory = new Map();
      this.restHistory = new Map();
      this.gamesPlayed = new Map();
      this.weights = weights;
      this.gamesOnlySchedule = '';
    }

    loadPlayers(playersText) {
      const duplicates = findDuplicates(playersText);
      if (duplicates.length > 0) {
        const duplicateDetails = duplicates
          .map(([_, names]) => names.join(', '))
          .join('\n');
        throw new Error(`Duplicate names detected!\nPlease add surnames to make these names unique:\n${duplicateDetails}`);
      }

      this.players = new Set(playersText.split('\n').map(p => p.trim()).filter(p => p));
      if (this.players.size < 4) {
        throw new Error("Need at least 4 players to create games");
      }
    }

    getOrDefault(map, key, defaultValue = new Map()) {
      if (!map.has(key)) {
        map.set(key, defaultValue);
      }
      return map.get(key);
    }

    updateHistory(team1, team2, court) {
      // Update partnership history
      for (const team of [team1, team2]) {
        const teamArr = Array.from(team);
        for (let i = 0; i < teamArr.length; i++) {
          for (let j = i + 1; j < teamArr.length; j++) {
            const p1 = teamArr[i], p2 = teamArr[j];
            const h1 = this.getOrDefault(this.partnerHistory, p1);
            const h2 = this.getOrDefault(this.partnerHistory, p2);
            h1.set(p2, (h1.get(p2) || 0) + 1);
            h2.set(p1, (h2.get(p1) || 0) + 1);
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
        }
      }

      // Update court and games history
      const allPlayers = new Set([...team1, ...team2]);
      for (const player of allPlayers) {
        const courtHist = this.getOrDefault(this.courtHistory, player);
        courtHist.set(court, (courtHist.get(court) || 0) + 1);
        this.gamesPlayed.set(player, (this.gamesPlayed.get(player) || 0) + 1);
      }
    }

    calculateTeamScore(team1, team2) {
      let score = 0;
      const team1Arr = Array.from(team1);
      const team2Arr = Array.from(team2);

      // Partnership penalties
      for (const team of [team1Arr, team2Arr]) {
        for (let i = 0; i < team.length; i++) {
          for (let j = i + 1; j < team.length; j++) {
            const p1 = team[i], p2 = team[j];
            score -= this.weights.PARTNERSHIP * 
              (this.getOrDefault(this.partnerHistory, p1).get(p2) || 0);
          }
        }
      }

      // Opposition and new interaction scoring
      for (const p1 of team1) {
        for (const p2 of team2) {
          const oppCount = this.getOrDefault(this.opponentHistory, p1).get(p2) || 0;
          score -= this.weights.OPPOSITION * oppCount;
          if (oppCount === 0) score += this.weights.NEW_INTERACTION;
        }
      }

      // Game balance scoring
      const team1Games = Array.from(team1)
        .reduce((sum, p) => sum + (this.gamesPlayed.get(p) || 0), 0);
      const team2Games = Array.from(team2)
        .reduce((sum, p) => sum + (this.gamesPlayed.get(p) || 0), 0);
      score -= this.weights.GAME_BALANCE * Math.abs(team1Games - team2Games);

      return score;
    }

    generateRound(roundNum) {
      let availablePlayers = Array.from(this.players);
      const numCourts = Math.min(Math.floor(availablePlayers.length / 4), this.maxCourts);
      const actualPlayersNeeded = numCourts * 4;
      let restingPlayers = new Set();

      if (availablePlayers.length > actualPlayersNeeded) {
        availablePlayers.sort((a, b) => {
          const restDiff = (this.restHistory.get(a) || 0) - (this.restHistory.get(b) || 0);
          return restDiff === 0 ? Math.random() - 0.5 : restDiff;
        });
        restingPlayers = new Set(availablePlayers.slice(0, availablePlayers.length - actualPlayersNeeded));
        restingPlayers.forEach(p => this.restHistory.set(p, (this.restHistory.get(p) || 0) + 1));
        availablePlayers = availablePlayers.filter(p => !restingPlayers.has(p));
      }

      const bestAssignments = [];
      const playersPerCourt = 4;

      for (let court = 0; court < numCourts; court++) {
        const remainingPlayers = availablePlayers.filter(p => 
          !bestAssignments.some(assignment => 
            assignment[1].has(p) || assignment[2].has(p)));

        let bestScore = Number.NEGATIVE_INFINITY;
        let bestTeams = null;

        for (let i = 0; i < 50; i++) {
          const courtPlayers = this.shuffle(remainingPlayers).slice(0, playersPerCourt);
          
          for (let j = 0; j < 20; j++) {
            this.shuffle(courtPlayers);
            const team1 = new Set(courtPlayers.slice(0, 2));
            const team2 = new Set(courtPlayers.slice(2));
            const score = this.calculateTeamScore(team1, team2);

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
  
        if (this.printStats) {
          output += this.generatePlayerStats();
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
          const partnerships = Array.from(this.getOrDefault(this.partnerHistory, player).entries())
            .filter(([_, count]) => count > 0)
            .sort(([a1, c1], [a2, c2]) => c2 - c1 || a1.localeCompare(a2));
          partnerships.forEach(([partner, count]) => {
            output += `  - with ${partner}: ${count} times\n`;
          });
  
          output += '\nOpposition History:\n';
          const oppositions = Array.from(this.getOrDefault(this.opponentHistory, player).entries())
            .filter(([_, count]) => count > 0)
            .sort(([a1, c1], [a2, c2]) => c2 - c1 || a1.localeCompare(a2));
          oppositions.forEach(([opponent, count]) => {
            output += `  - against ${opponent}: ${count} times\n`;
          });
  
          output += '\nCourt Distribution:\n';
          const courts = Array.from(this.getOrDefault(this.courtHistory, player).entries())
            .sort(([a, _], [b, __]) => a - b);
          courts.forEach(([court, count]) => {
            output += `  - Court ${court}: ${count} times\n`;
          });
  
          output += '\n' + '='.repeat(50) + '\n';
        }
        return output;
      }
    }
  
    const handlePlayersChange = (e) => {
      const newValue = e.target.value;
      const duplicates = findDuplicates(newValue);
      
      if (duplicates.length > 0) {
        const duplicateDetails = duplicates
          .map(([_, names]) => names.join(', '))
          .join('\n');
        setError(`Duplicate names detected!\nPlease add surnames to make these names unique:\n${duplicateDetails}`);
      } else {
        setError('');
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
                    Players (one per line)
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="players"
                      rows={20}
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
                        className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base 
                                border-2 border-gray-300 
                                hover:border-gray-400
                                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 
                                sm:text-sm rounded-md
                                bg-white
                                cursor-pointer
                                appearance-none"
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
                        className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base 
                                border-2 border-gray-300 
                                hover:border-gray-400
                                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 
                                sm:text-sm rounded-md
                                bg-white
                                cursor-pointer
                                appearance-none"
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