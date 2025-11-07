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
console.log('TESTING MULTIPLE SCHEDULE GENERATIONS');
console.log('========================================\n');

const maxCourts = 4;
const maxRounds = 6;
const numRuns = 10;

console.log(`Running ${numRuns} schedule generations with:`);
console.log(`  - 20 players`);
console.log(`  - ${maxCourts} courts`);
console.log(`  - ${maxRounds} rounds\n`);

const results = [];

for (let run = 1; run <= numRuns; run++) {
  const manager = new BadmintonManager(maxCourts, maxRounds, weights);
  manager.loadPlayers(players, findDuplicates);
  manager.generateSchedule();
  const stats = manager.calculateFairnessStats();
  
  results.push({
    run,
    partnerships: {
      total: stats.partnerships.total,
      repeated: stats.partnerships.repeated,
      maxRepeats: stats.partnerships.maxRepeats,
      repeatRate: (stats.partnerships.repeated / stats.partnerships.total * 100).toFixed(1)
    },
    oppositions: {
      total: stats.oppositions.total,
      repeated: stats.oppositions.repeated,
      maxRepeats: stats.oppositions.maxRepeats,
      repeatRate: (stats.oppositions.repeated / stats.oppositions.total * 100).toFixed(1)
    },
    courts: {
      imbalance: stats.courtAssignments.mostUsedCourt.count - stats.courtAssignments.leastUsedCourt.count,
      mostUsed: stats.courtAssignments.mostUsedCourt.count,
      leastUsed: stats.courtAssignments.leastUsedCourt.count
    }
  });
  
  console.log(`Run ${run}/${numRuns} complete...`);
}

console.log('\n========================================');
console.log('AGGREGATED RESULTS (10 RUNS)');
console.log('========================================\n');

console.log('📊 PARTNERSHIP FAIRNESS:');
console.log('----------------------------------------');
results.forEach(r => {
  const rating = r.partnerships.maxRepeats <= 2 ? '✅' : r.partnerships.maxRepeats <= 3 ? '⚠️ ' : '❌';
  console.log(`Run ${String(r.run).padStart(2)}: Max ${r.partnerships.maxRepeats}x repeats, ${r.partnerships.repeatRate}% repeated (${r.partnerships.repeated}/${r.partnerships.total}) ${rating}`);
});

const avgPartnershipRepeats = (results.reduce((sum, r) => sum + r.partnerships.maxRepeats, 0) / numRuns).toFixed(2);
const avgPartnershipRepeatRate = (results.reduce((sum, r) => sum + parseFloat(r.partnerships.repeatRate), 0) / numRuns).toFixed(1);
console.log(`\nAverage: ${avgPartnershipRepeats}x max repeats, ${avgPartnershipRepeatRate}% repeat rate`);
const partnershipExcellent = results.filter(r => r.partnerships.maxRepeats <= 2).length;
console.log(`Quality: ${partnershipExcellent}/${numRuns} runs achieved Excellent (≤2 repeats)\n`);

console.log('⚔️  OPPOSITION FAIRNESS:');
console.log('----------------------------------------');
results.forEach(r => {
  const rating = r.oppositions.maxRepeats <= 2 ? '✅' : r.oppositions.maxRepeats <= 3 ? '⚠️ ' : '❌';
  console.log(`Run ${String(r.run).padStart(2)}: Max ${r.oppositions.maxRepeats}x repeats, ${r.oppositions.repeatRate}% repeated (${r.oppositions.repeated}/${r.oppositions.total}) ${rating}`);
});

const avgOppositionRepeats = (results.reduce((sum, r) => sum + r.oppositions.maxRepeats, 0) / numRuns).toFixed(2);
const avgOppositionRepeatRate = (results.reduce((sum, r) => sum + parseFloat(r.oppositions.repeatRate), 0) / numRuns).toFixed(1);
console.log(`\nAverage: ${avgOppositionRepeats}x max repeats, ${avgOppositionRepeatRate}% repeat rate`);
const oppositionExcellent = results.filter(r => r.oppositions.maxRepeats <= 2).length;
console.log(`Quality: ${oppositionExcellent}/${numRuns} runs achieved Excellent (≤2 repeats)\n`);

console.log('🏟️  COURT BALANCE:');
console.log('----------------------------------------');
results.forEach(r => {
  const rating = r.courts.imbalance === 0 ? '✅ Perfect' : r.courts.imbalance <= 1 ? '✅ Excellent' : r.courts.imbalance <= 2 ? '⚠️  Good' : '❌ Poor';
  console.log(`Run ${String(r.run).padStart(2)}: Imbalance ${r.courts.imbalance} games (${r.courts.leastUsed}-${r.courts.mostUsed}) ${rating}`);
});

const avgCourtImbalance = (results.reduce((sum, r) => sum + r.courts.imbalance, 0) / numRuns).toFixed(2);
console.log(`\nAverage imbalance: ${avgCourtImbalance} games`);
const courtPerfect = results.filter(r => r.courts.imbalance === 0).length;
const courtExcellent = results.filter(r => r.courts.imbalance <= 1).length;
console.log(`Quality: ${courtPerfect}/${numRuns} Perfect, ${courtExcellent}/${numRuns} Excellent (≤1 imbalance)\n`);

console.log('========================================');
console.log('OVERALL ASSESSMENT');
console.log('========================================\n');

const overallExcellent = results.filter(r => 
  r.partnerships.maxRepeats <= 2 && 
  r.oppositions.maxRepeats <= 2 && 
  r.courts.imbalance <= 1
).length;

console.log(`Perfect runs (all metrics excellent): ${overallExcellent}/${numRuns}`);
console.log(`Success rate: ${(overallExcellent / numRuns * 100).toFixed(1)}%`);

if (overallExcellent === numRuns) {
  console.log('\n🎉 PERFECT! All 10 runs achieved excellent fairness across all metrics!');
} else if (overallExcellent >= 8) {
  console.log('\n✅ EXCELLENT! Algorithm is highly consistent.');
} else if (overallExcellent >= 6) {
  console.log('\n👍 GOOD! Algorithm generally produces fair schedules.');
} else {
  console.log('\n⚠️  NEEDS IMPROVEMENT. Consider adjusting weights or iteration counts.');
}

console.log('\n');
