import { BadmintonManager } from './src/lib/scheduler.js';
import { findDuplicates } from './src/lib/players.js';
import fs from 'fs';

const weights = {
  PARTNERSHIP: 1500,
  OPPOSITION: 1200,
  GAME_BALANCE: 300,
  NEW_INTERACTION: 400,
  COURT_BALANCE: 500,
};

// Read the 20 test players
const players = fs.readFileSync('./test_20_players.txt', 'utf-8');

console.log('\n========================================');
console.log('TESTING BADMINTON SCHEDULER');
console.log('========================================\n');

console.log('Players (20 total):');
console.log(players.split('\n').map((p, i) => `${i + 1}. ${p}`).join('\n'));
console.log('\n');

// Test with 4 courts, 6 rounds (good for 20 players)
const maxCourts = 4;
const maxRounds = 6;

console.log(`Configuration: ${maxCourts} courts, ${maxRounds} rounds`);
console.log(`Expected: ${maxCourts * 4} players per round, ${20 - maxCourts * 4} resting\n`);

const manager = new BadmintonManager(maxCourts, maxRounds, weights);
manager.loadPlayers(players, findDuplicates);

console.log('Generating schedule...\n');
const schedule = manager.generateSchedule();

console.log('========================================');
console.log('GENERATED SCHEDULE');
console.log('========================================\n');
console.log(schedule);

// Analyze fairness
console.log('\n========================================');
console.log('FAIRNESS ANALYSIS');
console.log('========================================\n');

const stats = manager.calculateFairnessStats();

console.log('📊 PARTNERSHIP STATISTICS:');
console.log(`  Total partnerships: ${stats.partnerships.total}`);
console.log(`  Repeated partnerships: ${stats.partnerships.repeated}`);
console.log(`  Max repeats: ${stats.partnerships.maxRepeats} times`);
console.log(`  Rating: ${stats.partnerships.maxRepeats <= 2 ? '✅ Excellent' : stats.partnerships.maxRepeats <= 3 ? '⚠️  Good' : '❌ Needs attention'}`);

if (stats.partnerships.repeatedPairs && stats.partnerships.repeatedPairs.length > 0) {
  console.log('\n  Top repeated partnerships:');
  stats.partnerships.repeatedPairs
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .forEach((pair, i) => {
      console.log(`    ${i + 1}. ${pair.players} - ${pair.count} times`);
    });
}

  console.log('\n⚔️  OPPOSITION STATISTICS:');
console.log(`  Total oppositions: ${stats.oppositions.total}`);
console.log(`  Repeated oppositions: ${stats.oppositions.repeated}`);
console.log(`  Max repeats: ${stats.oppositions.maxRepeats} times`);
console.log(`  Rating: ${stats.oppositions.maxRepeats <= 2 ? '✅ Excellent' : stats.oppositions.maxRepeats <= 3 ? '⚠️  Good' : '❌ Needs attention'}`);

if (stats.oppositions.repeatedPairs && stats.oppositions.repeatedPairs.length > 0) {
  console.log('\n  Top repeated oppositions:');
  stats.oppositions.repeatedPairs
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .forEach((pair, i) => {
      console.log(`    ${i + 1}. ${pair.players} - ${pair.count} times`);
    });
}

console.log('\n🏟️  COURT DISTRIBUTION STATISTICS:');
console.log(`  Total players: ${stats.courtAssignments.players}`);
console.log(`  Courts used: ${stats.courtAssignments.allCourts?.length || 0}`);

if (stats.courtAssignments.allCourts && stats.courtAssignments.allCourts.length > 0) {
  console.log('\n  Games per court:');
  stats.courtAssignments.allCourts.forEach(courtInfo => {
    console.log(`    Court ${courtInfo.court}: ${courtInfo.count} games`);
  });
  console.log(`\n  Most used: Court ${stats.courtAssignments.mostUsedCourt.court} (${stats.courtAssignments.mostUsedCourt.count} games)`);
  console.log(`  Least used: Court ${stats.courtAssignments.leastUsedCourt.court} (${stats.courtAssignments.leastUsedCourt.count} games)`);
  const imbalance = stats.courtAssignments.mostUsedCourt.count - stats.courtAssignments.leastUsedCourt.count;
  console.log(`  Court imbalance: ${imbalance} games (${imbalance === 0 ? '✅ Perfect' : imbalance <= 1 ? '✅ Excellent' : imbalance <= 2 ? '⚠️  Good' : '❌ Needs attention'})`);
}

// Detailed player-by-player analysis
console.log('\n========================================');
console.log('PER-PLAYER ANALYSIS');
console.log('========================================\n');

const playerNames = Array.from(manager.players).sort();
playerNames.forEach(player => {
  const games = manager.gamesPlayed.get(player) || 0;
  const rests = manager.restHistory.get(player) || 0;
  const partners = manager.partnerHistory.get(player) || new Map();
  const opponents = manager.opponentHistory.get(player) || new Map();
  const courts = manager.courtHistory.get(player) || new Map();
  
  console.log(`${player}:`);
  console.log(`  Games: ${games}, Rests: ${rests}`);
  console.log(`  Unique partners: ${partners.size}, Unique opponents: ${opponents.size}`);
  console.log(`  Courts played: ${Array.from(courts.keys()).sort((a, b) => a - b).join(', ') || 'None'}`);
  
  // Most frequent partner
  if (partners.size > 0) {
    const maxPartner = Array.from(partners.entries()).reduce((a, b) => a[1] > b[1] ? a : b);
    console.log(`  Most frequent partner: ${maxPartner[0]} (${maxPartner[1]} times)`);
  }
  
  // Most frequent opponent
  if (opponents.size > 0) {
    const maxOpponent = Array.from(opponents.entries()).reduce((a, b) => a[1] > b[1] ? a : b);
    console.log(`  Most frequent opponent: ${maxOpponent[0]} (${maxOpponent[1]} times)`);
  }
  console.log('');
});

console.log('========================================');
console.log('TEST COMPLETE');
console.log('========================================\n');
