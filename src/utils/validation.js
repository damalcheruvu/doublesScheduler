// Player validation utilities
import { findDuplicates } from '../lib/players';

/**
 * Validate player list for various constraints
 * @param {string} playersText - Newline-separated player names
 * @param {number} minPlayers - Minimum number of players required
 * @param {number} maxPlayers - Maximum number of players allowed
 * @param {number} maxNameLength - Maximum length for player names
 * @returns {Array<string>} Array of validation error messages
 */
export const validatePlayers = (
  playersText,
  minPlayers = 4,
  maxPlayers = 50,
  maxNameLength = 20
) => {
  const errors = [];
  const players = playersText
    .split('\n')
    .map(p => p.trim())
    .filter(p => p);

  // Check minimum players
  if (players.length < minPlayers) {
    errors.push(
      `At least ${minPlayers} players are required. Currently have ${players.length}.`
    );
  }

  // Check maximum players
  if (players.length > maxPlayers) {
    errors.push(
      `Maximum ${maxPlayers} players supported. Currently have ${players.length}.`
    );
  }

  // Check for empty names
  const emptyLines = playersText
    .split('\n')
    .findIndex(
      (line, index) =>
        line.trim() === '' &&
        index > 0 &&
        index < playersText.split('\n').length - 1
    );
  if (emptyLines !== -1) {
    errors.push(
      'Empty lines detected between player names. Please remove them.'
    );
  }

  // Check name length
  const longNames = players.filter(p => p.length > maxNameLength);
  if (longNames.length > 0) {
    errors.push(
      `Player names too long (max ${maxNameLength} characters): ${longNames.join(', ')}`
    );
  }

  // Check for special characters
  const invalidNames = players.filter(p => !/^[a-zA-Z\s.-]+$/.test(p));
  if (invalidNames.length > 0) {
    errors.push(
      `Invalid characters in names (only letters, spaces, dots, and hyphens allowed): ${invalidNames.join(', ')}`
    );
  }

  // Check duplicates
  const duplicates = findDuplicates(playersText);
  if (duplicates.length > 0) {
    const duplicateDetails = duplicates
      .map(([_, names]) => names.join(', '))
      .join('\n');
    errors.push(
      `Duplicate names detected!\nPlease add surnames to make these names unique:\n${duplicateDetails}`
    );
  }

  return errors;
};

/**
 * Clean and format player names
 * @param {string} playersText - Raw player input
 * @returns {string} Cleaned player names
 */
export const cleanPlayerNames = playersText => {
  return playersText
    .split('\n')
    .map(name => name.trim())
    .filter(name => name.length > 0)
    .map(name => {
      // Capitalize first letter of each word
      return name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    })
    .join('\n');
};
