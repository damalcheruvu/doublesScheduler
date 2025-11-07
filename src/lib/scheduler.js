// Scheduler core logic extracted from component for testability and reuse

export class BadmintonManager {
  constructor(maxCourts, maxRounds, weights) {
    this.maxCourts = maxCourts;
    this.maxRounds = maxRounds;
    this.players = new Set();
    this.gameHistory = [];
    this.playerGameCounts = new Map();
    this.partnerships = new Map();
    this.oppositions = new Map();
    this.courtAssignments = new Map();
    this.playerRestCounts = new Map();
    this.partnerHistory = new Map();
    this.opponentHistory = new Map();
    this.courtHistory = new Map();
    this.restHistory = new Map();
    this.gamesPlayed = new Map();
    this.lastRoundPlayers = new Map();
    this.weights = weights;
    this.gamesOnlySchedule = '';
  }

  loadPlayers(playersText, findDuplicatesFn) {
    if (findDuplicatesFn) {
      const duplicates = findDuplicatesFn(playersText);
      if (duplicates.length > 0) {
        const duplicateDetails = duplicates
          .map(([, names]) => names.join(', '))
          .join('\n');
        throw new Error(
          `Duplicate names detected!\nPlease add surnames to make these names unique:\n${duplicateDetails}`
        );
      }
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

  selectOptimalPlayers(availablePlayers, numPlayersNeeded, roundNum) {
    const playerPriorities = availablePlayers.map(player => {
      const restCount = this.restHistory.get(player) || 0;
      const gameCount = this.gamesPlayed.get(player) || 0;
      const consecutiveRests = this.getConsecutiveRests(player, roundNum);
      const lastRoundRested = this.lastRoundPlayers.get(player) === false;

      let priority = 0;
      priority += restCount * 1000;
      priority -= gameCount * 500;
      priority += consecutiveRests * 800;
      priority += lastRoundRested ? 1200 : 0;

      return { player, priority };
    });

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
    for (const team of [team1, team2]) {
      const teamArr = Array.from(team);
      for (let i = 0; i < teamArr.length; i++) {
        for (let j = i + 1; j < teamArr.length; j++) {
          const p1 = teamArr[i], p2 = teamArr[j];
          const h1 = this.getOrDefault(this.partnerHistory, p1);
          const h2 = this.getOrDefault(this.partnerHistory, p2);
          h1.set(p2, (h1.get(p2) || 0) + 1);
          h2.set(p1, (h2.get(p1) || 0) + 1);

          const partnerKey = [p1, p2].sort().join('-');
          this.partnerships.set(
            partnerKey,
            (this.partnerships.get(partnerKey) || 0) + 1
          );
        }
      }
    }

    for (const p1 of team1) {
      for (const p2 of team2) {
        const h1 = this.getOrDefault(this.opponentHistory, p1);
        const h2 = this.getOrDefault(this.opponentHistory, p2);
        h1.set(p2, (h1.get(p2) || 0) + 1);
        h2.set(p1, (h2.get(p1) || 0) + 1);

        const opponentKey = [p1, p2].sort().join('-');
        this.oppositions.set(
          opponentKey,
          (this.oppositions.get(opponentKey) || 0) + 1
        );
      }
    }

    for (const player of [...team1, ...team2]) {
      if (!this.courtAssignments.has(player)) {
        this.courtAssignments.set(player, new Map());
      }
      const playerCourts = this.courtAssignments.get(player);
      playerCourts.set(court, (playerCourts.get(court) || 0) + 1);
    }

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

    for (const team of [team1Arr, team2Arr]) {
      for (let i = 0; i < team.length; i++) {
        for (let j = i + 1; j < team.length; j++) {
          const p1 = team[i], p2 = team[j];
          const partnerCount = this.getOrDefault(this.partnerHistory, p1).get(p2) || 0;
          score -= this.weights.PARTNERSHIP * Math.pow(partnerCount + 1, 2);
        }
      }
    }

    for (const p1 of team1) {
      for (const p2 of team2) {
        const oppCount = this.getOrDefault(this.opponentHistory, p1).get(p2) || 0;
        // Use exponential penalty (power of 2) to heavily penalize repeated oppositions
        score -= this.weights.OPPOSITION * Math.pow(oppCount + 1, 2);
        if (oppCount === 0) {
          // Triple bonus for new oppositions to encourage variety
          score += this.weights.NEW_INTERACTION * 3;
        }
      }
    }

    const team1Games = team1Arr.reduce((sum, p) => sum + (this.gamesPlayed.get(p) || 0), 0);
    const team2Games = team2Arr.reduce((sum, p) => sum + (this.gamesPlayed.get(p) || 0), 0);
    const gameImbalance = Math.abs(team1Games - team2Games);
    score -= this.weights.GAME_BALANCE * Math.pow(gameImbalance, 1.8);

    const lastRoundBonus = [...team1, ...team2].reduce((bonus, player) => {
      if (this.lastRoundPlayers.get(player) === false) {
        return bonus + 500;
      }
      return bonus;
    }, 0);
    score += lastRoundBonus;

    const consecutiveGamePenalty = [...team1, ...team2].reduce((penalty, player) => {
      const consecutiveGames = this.getConsecutiveGames(player, roundNum);
      if (consecutiveGames >= 2) {
        return penalty + consecutiveGames * 300;
      }
      return penalty;
    }, 0);
    score -= consecutiveGamePenalty;

    return score;
  }

  calculateCourtScore(players, courtNum) {
    let score = 0;
    
    for (const player of players) {
      const courtHist = this.getOrDefault(this.courtHistory, player);
      const timesOnThisCourt = courtHist.get(courtNum) || 0;
      
      // Penalize heavily if player has played on this court multiple times
      score -= this.weights.COURT_BALANCE * Math.pow(timesOnThisCourt, 2);
      
      // Bonus if this is a new court for the player
      if (timesOnThisCourt === 0) {
        score += this.weights.COURT_BALANCE * 0.5;
      }
    }
    
    return score;
  }

  generateRound(roundNum, iterationCap = 100) {
    let availablePlayers = Array.from(this.players);
    const numCourts = Math.min(Math.floor(availablePlayers.length / 4), this.maxCourts);
    const actualPlayersNeeded = numCourts * 4;
    let restingPlayers = new Set();

    if (availablePlayers.length > actualPlayersNeeded) {
      const selectedPlayers = this.selectOptimalPlayers(
        availablePlayers,
        actualPlayersNeeded,
        roundNum
      );

      restingPlayers = new Set(availablePlayers.filter(p => !selectedPlayers.includes(p)));
      restingPlayers.forEach(p => {
        this.restHistory.set(p, (this.restHistory.get(p) || 0) + 1);
        this.lastRoundPlayers.set(p, false);
        this.lastRoundPlayers.set(`${p}_${roundNum}`, false);
      });

      availablePlayers = selectedPlayers;
    }

    availablePlayers.forEach(p => {
      this.lastRoundPlayers.set(p, true);
      this.lastRoundPlayers.set(`${p}_${roundNum}`, true);
    });

    const bestAssignments = [];
    const playersPerCourt = 4;

    for (let court = 0; court < numCourts; court++) {
      const remainingPlayers = availablePlayers.filter(
        p => !bestAssignments.some(a => a[1].has(p) || a[2].has(p))
      );

      let bestScore = Number.NEGATIVE_INFINITY;
      let bestTeams = null;

      // Increased multiplier from 3 to 5 to explore more combinations for better opposition variety
      const iterations = Math.min(iterationCap, Math.max(15, remainingPlayers.length * 5));
      for (let i = 0; i < iterations; i++) {
        const courtPlayers = this.shuffleWithBias(remainingPlayers, roundNum).slice(0, playersPerCourt);
        const combinations = this.generateTeamCombinations(courtPlayers);
        for (const [team1, team2] of combinations) {
          const teamScore = this.calculateTeamScore(team1, team2, roundNum);
          const courtScore = this.calculateCourtScore([...team1, ...team2], court + 1);
          const totalScore = teamScore + courtScore;
          
          if (totalScore > bestScore) {
            bestScore = totalScore;
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

  shuffleWithBias(array, roundNum) {
    const newArray = [...array];
    newArray.sort((a, b) => {
      const aGames = this.gamesPlayed.get(a) || 0;
      const bGames = this.gamesPlayed.get(b) || 0;
      const aConsecutive = this.getConsecutiveGames(a, roundNum);
      const bConsecutive = this.getConsecutiveGames(b, roundNum);
      
      // Calculate opposition diversity score (how many unique opponents)
      const aOpponents = this.getOrDefault(this.opponentHistory, a);
      const bOpponents = this.getOrDefault(this.opponentHistory, b);
      const aUniqueOpponents = aOpponents.size;
      const bUniqueOpponents = bOpponents.size;
      
      // Favor players with fewer games, consecutive rests, and fewer unique opponents
      const aWeight = Math.random() + aGames * 0.1 + aConsecutive * 0.2 - aUniqueOpponents * 0.05;
      const bWeight = Math.random() + bGames * 0.1 + bConsecutive * 0.2 - bUniqueOpponents * 0.05;
      return aWeight - bWeight;
    });
    return newArray;
  }

  generateTeamCombinations(players) {
    const combinations = [];
    const [p1, p2, p3, p4] = players;
    combinations.push([new Set([p1, p2]), new Set([p3, p4])]);
    combinations.push([new Set([p1, p3]), new Set([p2, p4])]);
    combinations.push([new Set([p1, p4]), new Set([p2, p3])]);
    return combinations;
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

  calculateFairnessStats() {
    if (!this.partnerships) this.partnerships = new Map();
    if (!this.oppositions) this.oppositions = new Map();
    if (!this.courtAssignments) this.courtAssignments = new Map();

    const stats = {
      partnerships: {
        total: this.partnerships.size || 0,
        repeated: 0,
        maxRepeats: 0,
        distribution: new Map(),
        repeatedPairs: [],
      },
      oppositions: {
        total: this.oppositions.size || 0,
        repeated: 0,
        maxRepeats: 0,
        distribution: new Map(),
        repeatedPairs: [],
      },
      courtAssignments: {
        players: this.courtAssignments.size || 0,
        distribution: new Map(),
        mostUsedCourt: { court: 1, count: 0 },
        leastUsedCourt: { court: 1, count: Infinity },
      },
    };

    try {
      for (const [pair, count] of this.partnerships.entries()) {
        if (count > 1) {
          stats.partnerships.repeated++;
          stats.partnerships.repeatedPairs.push({ players: pair, count });
        }
        stats.partnerships.maxRepeats = Math.max(stats.partnerships.maxRepeats, count);
        if (!stats.partnerships.distribution.has(count)) {
          stats.partnerships.distribution.set(count, 0);
        }
        stats.partnerships.distribution.set(
          count,
          stats.partnerships.distribution.get(count) + 1
        );
      }

      for (const [pair, count] of this.oppositions.entries()) {
        if (count > 1) {
          stats.oppositions.repeated++;
          stats.oppositions.repeatedPairs.push({ players: pair, count });
        }
        stats.oppositions.maxRepeats = Math.max(stats.oppositions.maxRepeats, count);
        if (!stats.oppositions.distribution.has(count)) {
          stats.oppositions.distribution.set(count, 0);
        }
        stats.oppositions.distribution.set(
          count,
          stats.oppositions.distribution.get(count) + 1
        );
      }

      const courtTotals = new Map();
      const courtGameCounts = new Map();
      for (const [, courts] of this.courtAssignments.entries()) {
        if (courts && typeof courts.entries === 'function') {
          for (const [court, count] of courts.entries()) {
            courtTotals.set(court, (courtTotals.get(court) || 0) + count);
          }
        }
      }
      for (const [court, playerAssignments] of courtTotals.entries()) {
        courtGameCounts.set(court, Math.round(playerAssignments / 4));
      }
      if (courtGameCounts.size > 0) {
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
        stats.courtAssignments.leastUsedCourt = { court: 1, count: 0 };
        stats.courtAssignments.allCourts = [];
      }
    } catch (error) {
      console.error('Error calculating fairness stats:', error);
      return {
        partnerships: {
          total: 0,
          repeated: 0,
          maxRepeats: 0,
          distribution: new Map(),
          repeatedPairs: [],
        },
        oppositions: {
          total: 0,
          repeated: 0,
          maxRepeats: 0,
          distribution: new Map(),
          repeatedPairs: [],
        },
        courtAssignments: {
          players: 0,
          distribution: new Map(),
          mostUsedCourt: { court: 1, count: 0 },
          leastUsedCourt: { court: 1, count: 0 },
          allCourts: [],
        },
      };
    }

    return stats;
  }
}
