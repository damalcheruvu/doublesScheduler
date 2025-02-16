import React, { useState } from 'react';

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
    }

    loadPlayers(playersText) {
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
      const team1Arr = Array.from(team1);
      const team2Arr = Array.from(team2);

      for (let i = 0; i < team1Arr.length; i++) {
        for (let j = i + 1; j < team1Arr.length; j++) {
          const p1 = team1Arr[i];
          const p2 = team1Arr[j];
          const history1 = this.getOrDefault(this.partnerHistory, p1);
          const history2 = this.getOrDefault(this.partnerHistory, p2);
          history1.set(p2, (history1.get(p2) || 0) + 1);
          history2.set(p1, (history2.get(p1) || 0) + 1);
        }
      }

      for (let i = 0; i < team2Arr.length; i++) {
        for (let j = i + 1; j < team2Arr.length; j++) {
          const p1 = team2Arr[i];
          const p2 = team2Arr[j];
          const history1 = this.getOrDefault(this.partnerHistory, p1);
          const history2 = this.getOrDefault(this.partnerHistory, p2);
          history1.set(p2, (history1.get(p2) || 0) + 1);
          history2.set(p1, (history2.get(p1) || 0) + 1);
        }
      }

      for (const p1 of team1) {
        for (const p2 of team2) {
          const history1 = this.getOrDefault(this.opponentHistory, p1);
          const history2 = this.getOrDefault(this.opponentHistory, p2);
          history1.set(p2, (history1.get(p2) || 0) + 1);
          history2.set(p1, (history2.get(p1) || 0) + 1);
        }
      }

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

      for (let i = 0; i < team1Arr.length; i++) {
        for (let j = i + 1; j < team1Arr.length; j++) {
          const p1 = team1Arr[i];
          const p2 = team1Arr[j];
          score -= this.weights.PARTNERSHIP * (this.getOrDefault(this.partnerHistory, p1).get(p2) || 0);
        }
      }

      for (let i = 0; i < team2Arr.length; i++) {
        for (let j = i + 1; j < team2Arr.length; j++) {
          const p1 = team2Arr[i];
          const p2 = team2Arr[j];
          score -= this.weights.PARTNERSHIP * (this.getOrDefault(this.partnerHistory, p1).get(p2) || 0);
        }
      }

      for (const p1 of team1) {
        for (const p2 of team2) {
          const oppCount = this.getOrDefault(this.opponentHistory, p1).get(p2) || 0;
          score -= this.weights.OPPOSITION * oppCount;
          if (oppCount === 0) {
            score += this.weights.NEW_INTERACTION;
          }
        }
      }

      const team1Games = Array.from(team1).reduce((sum, p) => sum + (this.gamesPlayed.get(p) || 0), 0);
      const team2Games = Array.from(team2).reduce((sum, p) => sum + (this.gamesPlayed.get(p) || 0), 0);
      score -= this.weights.GAME_BALANCE * Math.abs(team1Games - team2Games);

      return score;
    }

    generateRound(roundNum) {
      let availablePlayers = Array.from(this.players);
      const numPlayersNeeded = this.maxCourts * 4;
      const numCourts = Math.min(Math.floor(availablePlayers.length / 4), this.maxCourts);
      const actualPlayersNeeded = numCourts * 4;
      let restingPlayers = new Set();

      if (availablePlayers.length > actualPlayersNeeded) {
        availablePlayers.sort((a, b) => {
          const diff = (this.restHistory.get(a) || 0) - (this.restHistory.get(b) || 0);
          return diff === 0 ? Math.random() - 0.5 : diff;
        });
        const numToRest = availablePlayers.length - actualPlayersNeeded;
        restingPlayers = new Set(availablePlayers.slice(0, numToRest));
        restingPlayers.forEach(p => this.restHistory.set(p, (this.restHistory.get(p) || 0) + 1));
        availablePlayers = availablePlayers.filter(p => !restingPlayers.has(p));
      }

      const bestAssignments = [];
      const playersPerCourt = availablePlayers.length / numCourts;

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
            const team1 = new Set(courtPlayers.slice(0, playersPerCourt / 2));
            const team2 = new Set(courtPlayers.slice(playersPerCourt / 2));
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
      for (let roundNum = 1; roundNum <= this.maxRounds; roundNum++) {
        const [restingPlayers, courtAssignments] = this.generateRound(roundNum);
        
        output += `𝐑𝐨𝐮𝐧𝐝 ${roundNum}\n`;
        output += `𝐑𝐞𝐬𝐭𝐢𝐧𝐠 𝐏𝐥𝐚𝐲𝐞𝐫𝐬: ${Array.from(restingPlayers).sort().join(', ')}\n`;
        
        for (const [court, team1, team2] of courtAssignments) {
          output += `Court ${court}: ${Array.from(team1).sort().join(', ')} vs ${Array.from(team2).sort().join(', ')}\n`;
        }
        output += '-'.repeat(50) + '\n';
      }

      if (this.printStats) {
        output += this.generatePlayerStats();
      }

      return output;
    }

    generatePlayerStats() {
      let output = '\n𝐏𝐥𝐚𝐲𝐞𝐫 𝐒𝐭𝐚𝐭𝐢𝐬𝐭𝐢𝐜𝐬:\n' + '='.repeat(50) + '\n';
      
      for (const player of Array.from(this.players).sort()) {
        output += `\n𝐏𝐥𝐚𝐲𝐞𝐫: ${player}\n${'-'.repeat(20)}\n`;
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

  const generateSchedule = () => {
    try {
      const manager = new BadmintonManager(maxCourts, maxRounds, printStats, defaultConfig.weights);
      manager.loadPlayers(players);
      const output = manager.generateSchedule();
      setSchedule(output);
    } catch (error) {
      setSchedule(`Error: ${error.message}`);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-4">
        <label className="block mb-2">Players (one per line):</label>
        <textarea
          className="w-full h-40 p-2 border rounded"
          value={players}
          onChange={(e) => setPlayers(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block mb-2">Max Courts:</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            value={maxCourts}
            onChange={(e) => setMaxCourts(parseInt(e.target.value))}
          />
        </div>
        <div>
          <label className="block mb-2">Max Rounds:</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            value={maxRounds}
            onChange={(e) => setMaxRounds(parseInt(e.target.value))}
          />
        </div>
        <div className="flex items-center">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="mr-2"
              checked={printStats}
              onChange={(e) => setPrintStats(e.target.checked)}
            />
            Print Statistics
          </label>
        </div>
      </div>
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-4"
        onClick={generateSchedule}
      >
        Generate Schedule
      </button>
      <pre className="whitespace-pre-wrap border p-4 rounded bg-gray-50">
        {schedule}
      </pre>
    </div>
  );
};

export default BadmintonScheduler;