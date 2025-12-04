// Scoring configuration optimized for 18-21 players, 4 courts, 10 rounds
const SCORING_CONFIG = {
  // Partnership blocking uses NEGATIVE_INFINITY for absolute prevention
  OPPOSITION_PENALTY: 3000,
  NEW_PARTNERSHIP_BONUS: 15000,
  NEW_OPPOSITION_BONUS: 5000,
  GAME_BALANCE: 40,
  GAME_BALANCE_THRESHOLD: 2,
  COURT_BALANCE: 50,
  SHUFFLE_BIAS: {
    RANDOM_FACTOR: 0.25,
    GAME_WEIGHT: 0.6,
    CONSECUTIVE_WEIGHT: 1.2,
    OPPONENT_DIVERSITY_WEIGHT: 0.4,
  },
  CONSECUTIVE_PENALTY: 300,
};

export class BadmintonManager {
  constructor(maxCourts, maxRounds, scoringConfig = SCORING_CONFIG) {
    this.maxCourts = maxCourts;
    this.maxRounds = maxRounds;
    this.scoringConfig = scoringConfig;

    this.players = new Set();
    this.gameHistory = [];
    this.playerStats = new Map();
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

    this._initializePlayerStats();
  }

  _initializePlayerStats() {
    for (const player of this.players) {
      this.playerStats.set(player, {
        gamesPlayed: 0,
        restCount: 0,
        partnershipsCount: new Map(),
        oppositionsCount: new Map(),
        courtAssignments: new Map(),
        lastRoundPlayed: null, // boolean semantics: true = played last round, false = rested last round
      });
    }
  }

  recordRelationship(player1, player2, statsKey) {
    const stats1 = this.playerStats.get(player1);
    const stats2 = this.playerStats.get(player2);

    if (!stats1 || !stats2) return;

    const currentCount1 = stats1[statsKey].get(player2) || 0;
    const currentCount2 = stats2[statsKey].get(player1) || 0;

    stats1[statsKey].set(player2, currentCount1 + 1);
    stats2[statsKey].set(player1, currentCount2 + 1);
  }

  recordCourtAssignment(player, court) {
    const stats = this.playerStats.get(player);
    if (stats) {
      const currentCount = stats.courtAssignments.get(court) || 0;
      stats.courtAssignments.set(court, currentCount + 1);
    }
  }

  recordGame(team1, team2, court, round) {
    this.gameHistory.push({
      team1: new Set(team1),
      team2: new Set(team2),
      court,
      round,
    });

    const allPlayers = [...team1, ...team2];
    for (const player of allPlayers) {
      const stats = this.playerStats.get(player);
      if (stats) {
        stats.gamesPlayed++;
        stats.lastRoundPlayed = true;
        this.recordCourtAssignment(player, court);
      }
    }

    const recordPairings = team => {
      const teamArr = Array.from(team);
      for (let i = 0; i < teamArr.length; i++) {
        for (let j = i + 1; j < teamArr.length; j++) {
          this.recordRelationship(teamArr[i], teamArr[j], 'partnershipsCount');
        }
      }
    };

    recordPairings(team1);
    recordPairings(team2);

    for (const p1 of team1) {
      for (const p2 of team2) {
        this.recordRelationship(p1, p2, 'oppositionsCount');
      }
    }
  }

  recordRest(player) {
    const stats = this.playerStats.get(player);
    if (stats) {
      stats.restCount++;
      stats.lastRoundPlayed = false;
    }
  }

  // Uses gameHistory but is safe because a player appears in at most one game per round
  getConsecutiveGames(player, currentRound) {
    let consecutive = 0;
    const history = this.gameHistory;

    for (let round = currentRound - 1; round >= 1; round--) {
      let playedThisRound = false;

      for (let i = history.length - 1; i >= 0; i--) {
        const game = history[i];
        if (game.round !== round) continue;
        const playerInGame = game.team1.has(player) || game.team2.has(player);
        if (playerInGame) {
          playedThisRound = true;
          break;
        }
      }

      if (playedThisRound) {
        consecutive++;
      } else {
        break;
      }
    }

    return consecutive;
  }

  // FIXED: count rests per round instead of scanning raw games incorrectly
  getConsecutiveRests(player, currentRound) {
    let consecutive = 0;
    const history = this.gameHistory;

    for (let round = currentRound - 1; round >= 1; round--) {
      let playedThisRound = false;

      for (let i = history.length - 1; i >= 0; i--) {
        const game = history[i];
        if (game.round !== round) continue;
        const playerInGame = game.team1.has(player) || game.team2.has(player);
        if (playerInGame) {
          playedThisRound = true;
          break;
        }
      }

      if (!playedThisRound) {
        consecutive++;
      } else {
        break;
      }
    }

    return consecutive;
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  shuffleWithBias(array, roundNum) {
    const newArray = [...array];
    newArray.sort((a, b) => {
      const statsA = this.playerStats.get(a);
      const statsB = this.playerStats.get(b);

      const aGames = statsA?.gamesPlayed || 0;
      const bGames = statsB?.gamesPlayed || 0;
      const aConsecutive = this.getConsecutiveGames(a, roundNum);
      const bConsecutive = this.getConsecutiveGames(b, roundNum);

      const aUniqueOpponents = statsA?.oppositionsCount.size || 0;
      const bUniqueOpponents = statsB?.oppositionsCount.size || 0;

      const aWeight =
        Math.random() * this.scoringConfig.SHUFFLE_BIAS.RANDOM_FACTOR +
        aGames * this.scoringConfig.SHUFFLE_BIAS.GAME_WEIGHT +
        aConsecutive * this.scoringConfig.SHUFFLE_BIAS.CONSECUTIVE_WEIGHT -
        aUniqueOpponents *
          this.scoringConfig.SHUFFLE_BIAS.OPPONENT_DIVERSITY_WEIGHT;

      const bWeight =
        Math.random() * this.scoringConfig.SHUFFLE_BIAS.RANDOM_FACTOR +
        bGames * this.scoringConfig.SHUFFLE_BIAS.GAME_WEIGHT +
        bConsecutive * this.scoringConfig.SHUFFLE_BIAS.CONSECUTIVE_WEIGHT -
        bUniqueOpponents *
          this.scoringConfig.SHUFFLE_BIAS.OPPONENT_DIVERSITY_WEIGHT;

      return aWeight - bWeight;
    });
    return newArray;
  }

  selectOptimalPlayers(availablePlayers, numPlayersNeeded, roundNum) {
    // CRITICAL FIX: Use deterministic selection based on need to play
    // Priority: Fewer games played > More rests > Consecutive rests > Last round rested
    const playerPriorities = availablePlayers.map(player => {
      const stats = this.playerStats.get(player);
      const restCount = stats?.restCount || 0;
      const gameCount = stats?.gamesPlayed || 0;
      const consecutiveRests = this.getConsecutiveRests(player, roundNum);
      const lastRoundRested = stats?.lastRoundPlayed === false;

      // Higher priority = more need to play (should be selected)
      let priority = 0;

      // Primary: Players with fewer games should play
      priority -= gameCount * 10000; // Most important factor

      // Secondary: Players who have rested more should play
      priority += restCount * 5000;

      // Tertiary: Avoid consecutive rests
      priority += consecutiveRests * 3000;

      // Bonus: If rested last round, prioritize playing
      if (lastRoundRested) {
        priority += 2000;
      }

      return { player, priority, gameCount, restCount };
    });

    // Sort by priority (highest first = most need to play)
    playerPriorities.sort((a, b) => {
      // First by priority
      if (b.priority !== a.priority) return b.priority - a.priority;
      // Tiebreaker: fewer games
      if (a.gameCount !== b.gameCount) return a.gameCount - b.gameCount;
      // Final tiebreaker: more rests
      return b.restCount - a.restCount;
    });

    // Take top N players deterministically (no randomness)
    const selected = playerPriorities
      .slice(0, numPlayersNeeded)
      .map(p => p.player);

    return selected;
  }

  // Check if team has repeated partnerships (BLOCKING condition)
  hasRepeatedPartnerships(team) {
    const teamArr = Array.from(team);
    for (let i = 0; i < teamArr.length; i++) {
      for (let j = i + 1; j < teamArr.length; j++) {
        const stats = this.playerStats.get(teamArr[i]);
        const partnerCount = stats?.partnershipsCount.get(teamArr[j]) || 0;
        if (partnerCount > 0) return true;
      }
    }
    return false;
  }

  calculateTeamScore(team1, team2, roundNum) {
    let score = 0;
    const team1Arr = Array.from(team1);
    const team2Arr = Array.from(team2);

    // Absolute blocking for repeated partnerships
    if (this.hasRepeatedPartnerships(team1)) {
      return Number.NEGATIVE_INFINITY;
    }
    if (this.hasRepeatedPartnerships(team2)) {
      return Number.NEGATIVE_INFINITY;
    }

    // Partnership scoring: reward new partnerships only
    for (const team of [team1Arr, team2Arr]) {
      for (let i = 0; i < team.length; i++) {
        for (let j = i + 1; j < team.length; j++) {
          const p1 = team[i];
          const p2 = team[j];
          const stats1 = this.playerStats.get(p1);
          const partnerCount = stats1?.partnershipsCount.get(p2) || 0;

          if (partnerCount === 0) {
            score += this.scoringConfig.NEW_PARTNERSHIP_BONUS;
          }
        }
      }
    }

    // Opposition scoring: allow repeats but prefer new opponents
    for (const p1 of team1) {
      for (const p2 of team2) {
        const stats1 = this.playerStats.get(p1);
        const oppCount = stats1?.oppositionsCount.get(p2) || 0;

        if (oppCount === 0) {
          score += this.scoringConfig.NEW_OPPOSITION_BONUS;
        } else {
          score -=
            this.scoringConfig.OPPOSITION_PENALTY * Math.pow(oppCount, 2.0);
        }
      }
    }

    const team1Games = team1Arr.reduce(
      (sum, p) => sum + (this.playerStats.get(p)?.gamesPlayed || 0),
      0
    );
    const team2Games = team2Arr.reduce(
      (sum, p) => sum + (this.playerStats.get(p)?.gamesPlayed || 0),
      0
    );
    const gameImbalance = Math.abs(team1Games - team2Games);

    if (gameImbalance > this.scoringConfig.GAME_BALANCE_THRESHOLD) {
      score -=
        this.scoringConfig.GAME_BALANCE *
        Math.pow(
          gameImbalance - this.scoringConfig.GAME_BALANCE_THRESHOLD,
          1.5
        );
    }

    const lastRoundBonus = [...team1, ...team2].reduce((bonus, player) => {
      const stats = this.playerStats.get(player);
      if (stats?.lastRoundPlayed === false) {
        return bonus + 500;
      }
      return bonus;
    }, 0);
    score += lastRoundBonus;

    const consecutiveGamePenalty = [...team1, ...team2].reduce(
      (penalty, player) => {
        const consecutiveGames = this.getConsecutiveGames(player, roundNum);
        if (consecutiveGames >= 2) {
          return (
            penalty + consecutiveGames * this.scoringConfig.CONSECUTIVE_PENALTY
          );
        }
        return penalty;
      },
      0
    );
    score -= consecutiveGamePenalty;

    return score;
  }

  calculateCourtScore(players, courtNum) {
    let score = 0;

    for (const player of players) {
      const stats = this.playerStats.get(player);
      const timesOnThisCourt = stats?.courtAssignments.get(courtNum) || 0;

      // Cap the penalty to prevent overflow in long tournaments
      // Use logarithmic scaling after 5 times on same court
      const penalty =
        timesOnThisCourt <= 5
          ? this.scoringConfig.COURT_BALANCE * Math.pow(timesOnThisCourt, 2)
          : this.scoringConfig.COURT_BALANCE *
            (25 + 10 * Math.log(timesOnThisCourt - 4));

      score -= penalty;

      if (timesOnThisCourt === 0) {
        score += this.scoringConfig.COURT_BALANCE * 0.5;
      }
    }

    return score;
  }

  generateTeamCombinations(players) {
    const combinations = [];
    const [p1, p2, p3, p4] = players;
    combinations.push([new Set([p1, p2]), new Set([p3, p4])]);
    combinations.push([new Set([p1, p3]), new Set([p2, p4])]);
    combinations.push([new Set([p1, p4]), new Set([p2, p3])]);
    return combinations;
  }

  generateRound(roundNum, iterationCap = 500) {
    if (roundNum < 1 || roundNum > this.maxRounds) {
      throw new Error(
        `Round ${roundNum} outside valid range [1, ${this.maxRounds}]`
      );
    }
    if (this.players.size === 0) {
      throw new Error('No players loaded');
    }

    let availablePlayers = this.shuffleArray(Array.from(this.players));
    const numCourts = Math.min(
      Math.floor(availablePlayers.length / 4),
      this.maxCourts
    );
    const actualPlayersNeeded = numCourts * 4;

    const restingPlayers = new Set();

    if (availablePlayers.length > actualPlayersNeeded) {
      const selectedPlayers = this.selectOptimalPlayers(
        availablePlayers,
        actualPlayersNeeded,
        roundNum
      );

      for (const player of availablePlayers) {
        if (!selectedPlayers.includes(player)) {
          restingPlayers.add(player);
          this.recordRest(player);
        }
      }

      availablePlayers = selectedPlayers;
    }

    for (const player of availablePlayers) {
      const stats = this.playerStats.get(player);
      if (stats) {
        stats.lastRoundPlayed = true;
      }
    }

    // NEW APPROACH: Global optimization instead of greedy court-by-court
    // Try to find the best assignment for ALL courts simultaneously
    const bestAssignments = this.findBestRoundAssignment(
      availablePlayers,
      numCourts,
      roundNum,
      iterationCap
    );

    // Record all games
    for (const [court, team1, team2] of bestAssignments) {
      this.recordGame(team1, team2, court, roundNum);
    }

    return [restingPlayers, bestAssignments];
  }

  // NEW: Find best assignment for entire round (not court-by-court)
  findBestRoundAssignment(availablePlayers, numCourts, roundNum, iterationCap) {
    const playersPerCourt = 4;
    let bestGlobalScore = Number.NEGATIVE_INFINITY;
    let bestGlobalAssignments = [];

    // Iterations: balance exploration vs performance
    const iterations = Math.min(
      iterationCap,
      Math.max(300, availablePlayers.length * 30)
    );

    for (let iter = 0; iter < iterations; iter++) {
      // Shuffle players differently each iteration
      const shuffled =
        iter % 3 === 0
          ? this.shuffleArray(availablePlayers)
          : this.shuffleWithBias(availablePlayers, roundNum);

      const assignments = [];
      const usedPlayers = new Set();
      let roundScore = 0;
      let validRound = true;

      // Try to fill all courts
      for (let court = 0; court < numCourts; court++) {
        const remainingPlayers = shuffled.filter(p => !usedPlayers.has(p));

        if (remainingPlayers.length < playersPerCourt) {
          validRound = false;
          break;
        }

        // Try a small number of combinations for this court
        let bestCourtScore = Number.NEGATIVE_INFINITY;
        let bestCourtTeams = null;

        const courtAttempts = Math.min(20, remainingPlayers.length * 2);

        for (let attempt = 0; attempt < courtAttempts; attempt++) {
          // Select 4 players with some randomness
          const courtPlayers = this.shuffleArray(remainingPlayers).slice(
            0,
            playersPerCourt
          );
          const combinations = this.generateTeamCombinations(courtPlayers);

          for (const [team1, team2] of combinations) {
            const teamScore = this.calculateTeamScore(team1, team2, roundNum);

            // Skip if partnership repeats (NEGATIVE_INFINITY)
            if (teamScore === Number.NEGATIVE_INFINITY) continue;

            const courtScore = this.calculateCourtScore(
              [...team1, ...team2],
              court + 1
            );
            const totalScore = teamScore + courtScore;

            if (totalScore > bestCourtScore) {
              bestCourtScore = totalScore;
              bestCourtTeams = [team1, team2, courtPlayers];
            }
          }
        }

        if (bestCourtTeams && bestCourtScore > Number.NEGATIVE_INFINITY) {
          const [team1, team2, courtPlayers] = bestCourtTeams;
          assignments.push([court + 1, team1, team2]);
          for (const p of courtPlayers) usedPlayers.add(p);
          roundScore += bestCourtScore;
        } else {
          validRound = false;
          break;
        }
      }

      // If we successfully assigned all courts, check if it's the best so far
      if (validRound && assignments.length === numCourts) {
        if (roundScore > bestGlobalScore) {
          bestGlobalScore = roundScore;
          bestGlobalAssignments = assignments;
        }
      }
    }

    // Emergency fallback: if no valid assignment found, use greedy approach
    if (bestGlobalAssignments.length === 0) {
      return this.fallbackGreedyAssignment(availablePlayers, numCourts);
    }

    return bestGlobalAssignments;
  }

  // Fallback: greedy court-by-court (only if global optimization fails)
  fallbackGreedyAssignment(availablePlayers, numCourts) {
    const assignments = [];
    const playersPerCourt = 4;
    const shuffled = this.shuffleArray(availablePlayers);

    for (let court = 0; court < numCourts; court++) {
      const remainingPlayers = shuffled.filter(
        p => !assignments.some(a => a[1].has(p) || a[2].has(p))
      );

      if (remainingPlayers.length < playersPerCourt) break;

      // Use first available combination that doesn't have repeated partnerships
      let foundValid = false;
      for (let attempt = 0; attempt < 100 && !foundValid; attempt++) {
        const courtPlayers = this.shuffleArray(remainingPlayers).slice(
          0,
          playersPerCourt
        );
        const combinations = this.generateTeamCombinations(courtPlayers);

        for (const [team1, team2] of combinations) {
          if (
            !this.hasRepeatedPartnerships(team1) &&
            !this.hasRepeatedPartnerships(team2)
          ) {
            assignments.push([court + 1, team1, team2]);
            foundValid = true;
            break;
          }
        }
      }

      if (!foundValid) {
        // Last resort: allow repeated partnerships
        const courtPlayers = remainingPlayers.slice(0, playersPerCourt);
        const [team1, team2] = this.generateTeamCombinations(courtPlayers)[0];
        assignments.push([court + 1, team1, team2]);
      }
    }

    return assignments;
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
    const stats = {
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
        players: this.playerStats.size,
        distribution: new Map(),
        mostUsedCourt: { court: 1, count: 0 },
        leastUsedCourt: { court: 1, count: Infinity },
        allCourts: [],
      },
      playerStats: [],
    };

    try {
      // PARTNERSHIPS: count each pair once using a canonical key
      const partnershipPairs = new Map(); // key -> count

      for (const player of this.players) {
        const partnerships =
          this.playerStats.get(player)?.partnershipsCount || new Map();
        for (const [partner, count] of partnerships.entries()) {
          const a = player < partner ? player : partner;
          const b = player < partner ? partner : player;
          const key = `${a}|${b}`;

          const existing = partnershipPairs.get(key) || 0;
          // counts on both players should be identical; but we guard with max
          partnershipPairs.set(key, Math.max(existing, count));
        }
      }

      for (const [key, count] of partnershipPairs.entries()) {
        const [a, b] = key.split('|');
        if (count > 1) {
          stats.partnerships.repeated++;
          stats.partnerships.repeatedPairs.push({
            players: `${a}-${b}`,
            count,
          });
        }
        stats.partnerships.maxRepeats = Math.max(
          stats.partnerships.maxRepeats,
          count
        );

        if (!stats.partnerships.distribution.has(count)) {
          stats.partnerships.distribution.set(count, 0);
        }
        stats.partnerships.distribution.set(
          count,
          stats.partnerships.distribution.get(count) + 1
        );
      }

      stats.partnerships.total = partnershipPairs.size;

      // OPPOSITIONS: same idea, unique pairs via canonical key
      const oppositionPairs = new Map();

      for (const player of this.players) {
        const oppositions =
          this.playerStats.get(player)?.oppositionsCount || new Map();
        for (const [opponent, count] of oppositions.entries()) {
          const a = player < opponent ? player : opponent;
          const b = player < opponent ? opponent : player;
          const key = `${a}|${b}`;

          const existing = oppositionPairs.get(key) || 0;
          oppositionPairs.set(key, Math.max(existing, count));
        }
      }

      for (const [key, count] of oppositionPairs.entries()) {
        const [a, b] = key.split('|');
        if (count > 1) {
          stats.oppositions.repeated++;
          stats.oppositions.repeatedPairs.push({
            players: `${a}-${b}`,
            count,
          });
        }
        stats.oppositions.maxRepeats = Math.max(
          stats.oppositions.maxRepeats,
          count
        );

        if (!stats.oppositions.distribution.has(count)) {
          stats.oppositions.distribution.set(count, 0);
        }
        stats.oppositions.distribution.set(
          count,
          stats.oppositions.distribution.get(count) + 1
        );
      }

      stats.oppositions.total = oppositionPairs.size;

      const courtTotals = new Map();
      for (const player of this.players) {
        const courts =
          this.playerStats.get(player)?.courtAssignments || new Map();
        for (const [court, count] of courts.entries()) {
          courtTotals.set(court, (courtTotals.get(court) || 0) + count);
        }
      }

      const courtGameCounts = new Map();
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

      for (const player of this.players) {
        const playerStats = this.playerStats.get(player);
        stats.playerStats.push({
          player,
          gamesPlayed: playerStats?.gamesPlayed || 0,
          restCount: playerStats?.restCount || 0,
          uniquePartners: playerStats?.partnershipsCount.size || 0,
          uniqueOpponents: playerStats?.oppositionsCount.size || 0,
          uniqueCourts: playerStats?.courtAssignments.size || 0,
        });
      }
    } catch (error) {
      console.error('Error calculating fairness stats:', error);
      return stats;
    }

    return stats;
  }
}
