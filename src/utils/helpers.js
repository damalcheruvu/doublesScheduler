// Loading component for better UX
export const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div
      className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]} ${className}`}
    ></div>
  );
};

// Success toast notification
export const showSuccessToast = message => {
  // Simple toast implementation - in a real app you'd use a proper toast library
  const toast = document.createElement('div');
  toast.className =
    'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-all duration-300';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 3000);
};

// Error toast notification
export const showErrorToast = message => {
  const toast = document.createElement('div');
  toast.className =
    'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-all duration-300';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 3000);
};

// Format player count for display
export const formatPlayerCount = count => {
  if (count === 0) return 'No players';
  if (count === 1) return '1 player';
  return `${count} players`;
};

// Calculate tournament duration estimate
export const estimateTournamentDuration = (rounds, avgGameDuration = 15) => {
  const totalMinutes = rounds * avgGameDuration;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} minutes`;
  if (minutes === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  return `${hours}h ${minutes}m`;
};

// Validate tournament configuration
export const validateTournamentConfig = (players, courts, rounds) => {
  const playerCount = players.split('\n').filter(p => p.trim()).length;
  const warnings = [];

  if (playerCount > courts * 4 * 2) {
    warnings.push('⚠️ Many players will rest each round');
  }

  if (rounds > playerCount) {
    warnings.push(
      '⚠️ More rounds than players - some may play very frequently'
    );
  }

  if (courts > Math.floor(playerCount / 4)) {
    warnings.push('⚠️ Not enough players to fill all courts');
  }

  return warnings;
};
