// Default configuration constants
export const DEFAULT_PLAYERS = `
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

export const DEFAULT_CONFIG = {
  maxCourts: 4,
  maxRounds: 10,
  printStats: false,
  weights: {
    PARTNERSHIP: 2000,
    OPPOSITION: 800,
    GAME_BALANCE: 200,
    NEW_INTERACTION: 400,
  },
};

export const CONSTRAINTS = {
  MIN_PLAYERS: 4,
  MAX_PLAYERS: 25,
  MIN_COURTS: 1,
  MAX_COURTS: 6,
  MIN_ROUNDS: 1,
  MAX_ROUNDS: 10,
  MAX_NAME_LENGTH: 20,
};
