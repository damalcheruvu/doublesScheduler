import { useState, useCallback, useMemo } from 'react';
import Toast from './ui/Toast';
import ConfirmDialog from './ui/ConfirmDialog';
import { BadmintonManager } from '../lib/scheduler';
import { findDuplicates } from '../lib/players';

const defaultConfig = {
  maxCourts: 4,
  maxRounds: 10,
  printStats: false,
  weights: {
    PARTNERSHIP: 1500,      // High weight with exponential penalty for repeated partnerships
    OPPOSITION: 1200,       // Increased to ensure opposition variety (was too low at 600)
    GAME_BALANCE: 300,      // Moderate importance of game balance
    NEW_INTERACTION: 400,   // Increased bonus for new oppositions to encourage variety
    COURT_BALANCE: 500,     // Penalty for uneven court distribution across players
  },
};

const BadmintonScheduler = () => {
  const [players, setPlayers] = useState('');
  const [maxCourts, setMaxCourts] = useState(defaultConfig.maxCourts);
  const [maxRounds, setMaxRounds] = useState(defaultConfig.maxRounds);
  const [schedule, setSchedule] = useState('');
  const [error, setError] = useState('');
  const [gamesOnly, setGamesOnly] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('games');
  
  const [fairnessStats, setFairnessStats] = useState(null);
  const [copyMessage, setCopyMessage] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);


  // Enhanced player statistics
  const playerStats = useMemo(() => {
    const playerList = players
      .split('\n')
      .map(p => p.trim())
      .filter(p => p);
    const playerCount = playerList.length;
    const playersPerCourt = 4;
    const totalCourtSlots = maxCourts * maxRounds;
    const totalPlayerSlots = totalCourtSlots * playersPerCourt;
    const avgGamesPerPlayer =
      playerCount > 0 ? Math.floor(totalPlayerSlots / playerCount) : 0;
    const restingPerRound = Math.max(
      0,
      playerCount - maxCourts * playersPerCourt
    );

    return {
      playerCount,
      avgGamesPerPlayer,
      restingPerRound,
      totalGames: maxCourts * maxRounds,
      courtUtilization:
        playerCount >= maxCourts * 4
          ? '100%'
          : `${Math.round((playerCount / (maxCourts * 4)) * 100)}%`,
    };
  }, [players, maxCourts, maxRounds]);

  const printGamesOnly = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setToast({ message: 'Popup blocked. Please allow popups or use Copy.', type: 'error' });
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>Badminton Games Schedule</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
              padding: 0;
              margin: 0;
              line-height: 1.3;
              font-size: 11px;
              background: white;
            }
            .page-container {
              padding: 0.8cm;
              max-width: 100%;
            }
            .tournament-header {
              text-align: center;
              margin-bottom: 15px;
              border-bottom: 2px solid #333;
              padding-bottom: 8px;
            }
            .tournament-title {
              font-size: 18px;
              font-weight: 700;
              color: #000;
              margin: 0;
            }
            .tournament-date {
              font-size: 12px;
              color: #666;
              margin: 4px 0 0 0;
            }
            .round {
              margin-bottom: 12px;
              page-break-inside: avoid;
              border: none;
              border-radius: 0;
              padding: 0;
              background: none;
            }
            .round-header {
              font-weight: 700;
              font-size: 14px;
              margin-bottom: 6px;
              color: #000;
              text-align: left;
              background: none;
              padding: 0;
              border-radius: 0;
              border-bottom: 1px solid #333;
              padding-bottom: 2px;
            }
            .resting-section {
              margin-bottom: 8px;
              padding: 0;
              background: none;
              border-left: none;
              border-radius: 0;
            }
            .resting-label {
              font-weight: 600;
              color: #333;
              font-size: 12px;
              text-transform: none;
              letter-spacing: 0;
              display: inline;
              margin-right: 8px;
            }
            .resting-players {
              font-weight: 600;
              color: #000;
              margin-top: 0;
              display: inline;
              font-size: 12px;
            }
            .courts-container {
              display: block;
            }
            .court-game {
              background: none;
              padding: 0;
              border-radius: 0;
              border: none;
              margin-bottom: 4px;
            }
            .court-number {
              font-weight: 600;
              color: #333;
              font-size: 12px;
              text-transform: none;
              letter-spacing: 0;
              margin-bottom: 0;
              display: inline;
              margin-right: 8px;
            }
            .player-names {
              font-weight: 700;
              color: #000;
              font-size: 12px;
              line-height: 1.3;
              display: inline;
            }
            .vs-separator {
              color: #666;
              font-weight: 400;
              margin: 0 4px;
            }
            .team {
              display: inline;
            }
            @media print {
              body {
                padding: 0;
                margin: 0;
                font-size: 14px;
              }
              .page-container {
                padding: 0.5cm;
              }
              @page {
                margin: 0.7cm;
                size: A4 portrait;
              }
              .tournament-header {
                margin-bottom: 12px;
              }
              .round {
                margin-bottom: 10px;
                break-inside: avoid;
              }
              .round-header {
                font-size: 15px;
                margin-bottom: 5px;
                border-bottom: 1px solid #333;
                padding-bottom: 2px;
              }
              .court-game {
                margin-bottom: 3px;
              }
              .player-names, .resting-players {
                font-weight: 700 !important;
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
                font-size: 13px !important;
              }
              .court-number {
                font-size: 13px !important;
              }
              .resting-label {
                font-size: 13px !important;
              }
              .resting-section {
                margin-bottom: 6px;
              }
            }
          </style>
        </head>
        <body>
          <div class="page-container">
            <div class="tournament-header">
              <h1 class="tournament-title">🏸 Badminton Tournament Schedule</h1>
              <p class="tournament-date">Generated on ${new Date().toLocaleDateString('en-GB', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
            </div>
            ${gamesOnly
              .split(/Round \d+/)
              .filter(section => section.trim())
              .map((section, index) => {
                const restingMatch = section.match(/Resting Players: (.*)\n/);
                const restingPlayers = restingMatch ? restingMatch[1] : '';
                
                const courtMatches = section.match(/Court (\d+): (.*?) vs (.*?)(?=\n|$)/g) || [];
                
                return `
                <div class="round">
                  <div class="round-header">Round ${index + 1}</div>
                  ${restingPlayers ? `
                    <div class="resting-section">
                      <div class="resting-label">Resting Players</div>
                      <div class="resting-players">${restingPlayers}</div>
                    </div>
                  ` : ''}
                  <div class="courts-container">
                    ${courtMatches.map(court => {
                      const courtMatch = court.match(/Court (\d+): (.*?) vs (.*?)$/);
                      if (courtMatch) {
                        const [, courtNum, team1, team2] = courtMatch;
                        return `
                          <div class="court-game">
                            <div class="court-number">Court ${courtNum}</div>
                            <div class="player-names">
                              <span class="team">${team1}</span>
                              <span class="vs-separator">vs</span>
                              <span class="team">${team2}</span>
                            </div>
                          </div>
                        `;
                      }
                      return '';
                    }).join('')}
                  </div>
                </div>
                `;
              })
              .join('')}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(gamesOnly);
      setCopyMessage('Games copied to clipboard!');
      setToast({ message: 'Copied to clipboard', type: 'success' });
      setTimeout(() => setCopyMessage(''), 2000); // Hide message after 2 seconds
    } catch {
      setCopyMessage('Failed to copy');
      setToast({ message: 'Failed to copy', type: 'error' });
      setTimeout(() => setCopyMessage(''), 2000);
    }
  };

  // findDuplicates moved to lib

  // Enhanced player validation with better error messages
  const validatePlayers = useCallback(playersText => {
    const playerList = playersText
      .split('\n')
      .map(p => p.trim())
      .filter(p => p);
    const errors = [];

    if (playerList.length < 4) {
      errors.push(
        `⚠️ Need at least 4 players (currently ${playerList.length})`
      );
    }

    if (playerList.length > 25) {
      errors.push(
        `⚠️ Maximum 25 players supported (currently ${playerList.length})`
      );
    }

    const duplicates = findDuplicates(playersText);
    if (duplicates.length > 0) {
      const duplicateDetails = duplicates
        .map(([_, names]) => names.join(', '))
        .join(', ');
      errors.push(`🔄 Duplicate names: ${duplicateDetails}`);
    }

    return errors;
  }, []);

  // Enhanced generate schedule with loading state
  const generateSchedule = useCallback(async () => {
    setIsGenerating(true);
    setError('');
    setFairnessStats(null); // Reset fairness stats

    try {
      const validationErrors = validatePlayers(players);
      if (validationErrors.length > 0) {
        setError(validationErrors.join('\n'));
        return;
      }

      // Simulate processing delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));

      const manager = new BadmintonManager(maxCourts, maxRounds, defaultConfig.weights);
      manager.loadPlayers(players, findDuplicates);
      const output = manager.generateSchedule();
      const fairnessData = manager.calculateFairnessStats();
      
      setSchedule(output);
      setGamesOnly(manager.gamesOnlySchedule);
      setFairnessStats(fairnessData);
      setActiveTab('games');
    } catch (error) {
      setError(`❌ ${error.message}`);
      setSchedule('');
      setGamesOnly('');
    } finally {
      setIsGenerating(false);
    }
  }, [players, maxCourts, maxRounds, validatePlayers]);

  // Clear players functionality
  const clearPlayers = useCallback(() => {
    setConfirmClearOpen(true);
  }, []);

  const onConfirmClear = useCallback(() => {
    setConfirmClearOpen(false);
    setPlayers('');
    setSchedule('');
    setGamesOnly('');
    setError('');
    setToast({ message: 'Players cleared', type: 'success' });
  }, []);

  // Save players, overwriting a chosen file when supported (File System Access API), otherwise download
  const [fileHandle, setFileHandle] = useState(null);
  const savePlayers = useCallback(async () => {
    const text = players.trim();
    if (!text) {
      setToast({ message: 'No players to save', type: 'error' });
      return;
    }
    // Progressive enhancement: try File System Access API (Chromium/Edge)
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        let handle = fileHandle;
        if (!handle) {
          handle = await window.showSaveFilePicker({
            suggestedName: 'player_list.txt',
            types: [
              {
                description: 'Text Files',
                accept: { 'text/plain': ['.txt'] },
              },
            ],
            excludeAcceptAllOption: false,
          });
          setFileHandle(handle);
        }

        // Ensure we have permission
        if (handle.queryPermission) {
          const status = await handle.queryPermission({ mode: 'readwrite' });
          if (status !== 'granted' && handle.requestPermission) {
            const req = await handle.requestPermission({ mode: 'readwrite' });
            if (req !== 'granted') {
              setToast({ message: 'Permission denied to write file', type: 'error' });
              return;
            }
          }
        }

        const writable = await handle.createWritable();
        await writable.write(text);
        await writable.close();
        setToast({ message: 'Saved to file', type: 'success' });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') {
          // user canceled save dialog
          return;
        }
        // Fallthrough to download if FS API fails
      }
    }

    // Fallback: download (will append (1) if file exists)
    try {
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'player_list.txt';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setToast({ message: 'Downloaded player_list.txt', type: 'success' });
    } catch (error) {
      setToast({ message: 'Failed to download: ' + error.message, type: 'error' });
    }
  }, [players, fileHandle]);

  // Import players functionality - Mobile compatible
  const importPlayers = useCallback(event => {
    const file = event.target.files[0];
    if (file) {
      // More lenient file type checking for mobile
      const isTextFile = file.type === 'text/plain' || 
                        file.name.endsWith('.txt') || 
                        file.type === '' || // Some mobile browsers don't set type
                        file.type === 'application/octet-stream'; // Some mobile browsers use this for .txt
      
      if (!isTextFile) {
        setToast({ message: 'Please select a .txt file', type: 'error' });
        event.target.value = '';
        return;
      }
      
      try {
        const reader = new FileReader();
        reader.onload = e => {
          const content = e.target.result;
          if (typeof content === 'string') {
            setPlayers(content);
            
            // Trigger validation after importing
            const errors = validatePlayers(content);
            setError(errors.join('\n'));
            setToast({ message: 'Players imported successfully', type: 'success' });
          } else {
            setToast({ message: 'Invalid file content', type: 'error' });
          }
          event.target.value = ''; // Reset file input
        };
        reader.onerror = () => {
          setToast({ message: 'Error reading file', type: 'error' });
          event.target.value = '';
        };
        reader.readAsText(file);
      } catch (error) {
        setToast({ message: 'Import failed: ' + error.message, type: 'error' });
        event.target.value = '';
      }
    }
  }, [validatePlayers]);
  const handlePlayersChange = useCallback(
    e => {
      const newValue = e.target.value;
      setPlayers(newValue);

      const errors = validatePlayers(newValue);
      setError(errors.join('\n'));
    },
    [validatePlayers]
  );
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-1 sm:p-4">
      {/* Maximized Player Input Area */}
      <div className="rounded bg-white p-2 shadow-sm sm:p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 sm:text-base sm:font-semibold">
            👥 Players ({playerStats.playerCount})
          </h3>
          <div className="flex space-x-3">
            <button
              onClick={clearPlayers}
              className="rounded-lg border-2 border-red-200 bg-red-50 px-4 py-3 text-lg font-bold text-red-700 shadow-sm hover:bg-red-100 hover:border-red-300 sm:px-3 sm:py-2 sm:text-base"
            >
              Clear
            </button>
            <button
              onClick={savePlayers}
              className="rounded-lg border-2 border-blue-200 bg-blue-50 px-4 py-3 text-lg font-bold text-blue-700 shadow-sm hover:bg-blue-100 hover:border-blue-300 sm:px-3 sm:py-2 sm:text-base"
            >
              Save
            </button>
            <label className="cursor-pointer rounded-lg border-2 border-green-200 bg-green-50 px-4 py-3 text-lg font-bold text-green-700 shadow-sm hover:bg-green-100 hover:border-green-300 sm:px-3 sm:py-2 sm:text-base">
              Import
              <input
                id="file-import"
                type="file"
                accept=".txt,text/plain,*"
                onChange={importPlayers}
                className="hidden"
                multiple={false}
              />
            </label>
          </div>
        </div>
        
        {/* Maximized textarea for mobile - much taller with bigger font */}
        <textarea
          rows={18}
          className="w-full resize-none rounded border border-gray-300 px-4 py-4 text-xl leading-snug sm:px-3 sm:py-3 sm:text-sm"
          value={players}
          onChange={handlePlayersChange}
          placeholder="Enter player names, one per line..."
          style={{ minHeight: '380px', fontSize: '24px', lineHeight: '1.3' }}
        />
        
        {playerStats.playerCount > 0 && (
          <div className="mt-1 flex justify-between text-lg font-bold text-gray-700 sm:text-base sm:font-semibold sm:text-gray-500">
            <span>{playerStats.playerCount} players</span>
            <span>{playerStats.restingPerRound} resting per round</span>
          </div>
        )}
      </div>

      {/* Ultra-Compact Settings */}
      <div className="mt-4 rounded-lg bg-white border-2 border-gray-200 p-3 shadow-lg sm:mt-5 sm:p-4">
        <div className="flex items-center justify-between">
          <div className="flex space-x-4">
            <div>
              <label className="block mb-2 text-lg font-bold text-gray-800 sm:text-base sm:font-medium sm:text-gray-700">Courts</label>
              <select
                className="w-24 rounded-lg border-2 border-gray-300 px-4 py-3 text-lg font-semibold shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 sm:w-16 sm:px-2 sm:py-2 sm:text-base sm:font-normal"
                value={maxCourts}
                onChange={e => setMaxCourts(parseInt(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-2 text-lg font-bold text-gray-800 sm:text-base sm:font-medium sm:text-gray-700">Rounds</label>
              <select
                className="w-24 rounded-lg border-2 border-gray-300 px-4 py-3 text-lg font-semibold shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 sm:w-16 sm:px-2 sm:py-2 sm:text-base sm:font-normal"
                value={maxRounds}
                onChange={e => setMaxRounds(parseInt(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="ml-4 rounded-lg bg-blue-50 border border-blue-200 p-3 max-w-xs sm:max-w-sm">
            <div className="flex items-start space-x-2">
              <span className="text-lg sm:text-base">💡</span>
              <div className="text-lg sm:text-sm text-blue-800">
                <p>Tap <strong>Save</strong> to download <code>player_list.txt</code>. Next time, use <strong>Import</strong> to load that file.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-2 rounded border border-red-200 bg-red-50 p-2">
          <div className="text-lg text-red-700 sm:text-base">
            <pre className="whitespace-pre-wrap">{error}</pre>
          </div>
        </div>
      )}

      {/* Large Generate Button */}
      <button
        type="button"
        onClick={generateSchedule}
        disabled={isGenerating || error.length > 0}
        className="mt-6 flex w-full items-center justify-center space-x-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-lg font-bold text-white shadow-lg disabled:from-gray-400 disabled:to-gray-500 sm:py-4 sm:text-base"
      >
        {isGenerating ? (
          <>
            <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
            <span className="text-lg sm:text-base">Generating...</span>
          </>
        ) : (
          <span className="text-lg">⚡ Generate Schedule</span>
        )}
      </button>

      {/* Compact Schedule Display */}
      {(schedule || gamesOnly) && (
        <div className="mt-2 rounded bg-white shadow-sm">
          {/* Minimal Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('games')}
                className={`flex-1 px-2 py-2 text-lg font-medium sm:text-base ${
                  activeTab === 'games'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500'
                }`}
              >
                🏸 Games
              </button>
              <button
                onClick={() => setActiveTab('statistics')}
                className={`flex-1 px-2 py-2 text-lg font-medium sm:text-base ${
                  activeTab === 'statistics'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500'
                }`}
              >
                📊 Statistics
              </button>
            </div>
          </div>

          <div className="p-2 sm:p-3">
            {activeTab === 'games' && gamesOnly && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900 sm:text-lg sm:font-semibold">
                    Tournament Schedule
                  </h3>
                  <div className="flex space-x-4 mb-4">
                    <div className="relative">
                      <button
                        onClick={handleCopyToClipboard}
                        className="flex items-center space-x-2 rounded-lg border-2 border-gray-300 bg-gray-50 px-5 py-3 text-lg font-bold text-gray-700 shadow-sm hover:bg-gray-100 hover:border-gray-400 sm:px-3 sm:py-2 sm:text-base sm:font-medium"
                      >
                        <span>📋</span>
                        <span>Copy</span>
                      </button>
                      {copyMessage && (
                        <div className="absolute top-12 left-0 z-10 rounded-lg bg-green-600 px-3 py-2 text-lg text-white shadow-lg sm:text-base">
                          {copyMessage}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={printGamesOnly}
                      className="flex items-center space-x-2 rounded-lg border-2 border-blue-300 bg-blue-600 px-5 py-3 text-lg font-bold text-white shadow-sm hover:bg-blue-700 hover:border-blue-400 sm:px-3 sm:py-2 sm:text-base sm:font-medium"
                    >
                      <span>🖨️</span>
                      <span>Print</span>
                    </button>
                  </div>
                </div>
                <div className="rounded border bg-gray-50 p-3">
                  <pre className="overflow-auto text-lg leading-snug sm:max-h-60 sm:text-xs sm:leading-normal" style={{ minHeight: '380px', fontSize: '18px', lineHeight: '1.3' }}>
                    {gamesOnly}
                  </pre>
                </div>
              </div>
            )}

            {activeTab === 'statistics' && (
              <div>
                <h3 className="mb-3 text-lg font-bold text-gray-900 sm:text-base sm:font-semibold">
                  Tournament Statistics
                </h3>

                {fairnessStats && fairnessStats.partnerships && fairnessStats.oppositions && fairnessStats.courtAssignments && (
                  <div>
                    <h4 className="mb-3 text-lg font-bold text-gray-900 sm:text-base sm:font-semibold">
                      🎯 Fairness Analysis
                    </h4>
                    
                    {/* Partnership Fairness */}
                    <div className="mb-4 rounded bg-emerald-50 p-3 border border-emerald-200">
                      <h5 className="mb-2 text-lg font-bold text-emerald-900 sm:text-xs sm:font-semibold">👥 Partnership Distribution</h5>
                      <div className="grid grid-cols-1 gap-3 text-lg sm:grid-cols-2 sm:gap-2 sm:text-xs" style={{ fontSize: '18px' }}>
                        <div>
                          <span className="font-semibold">Total partnerships:</span> {fairnessStats.partnerships.total}
                        </div>
                        <div>
                          <span className="font-semibold">Repeated partnerships:</span> {fairnessStats.partnerships.repeated}
                        </div>
                        <div>
                          <span className="font-semibold">Max repeats:</span> {fairnessStats.partnerships.maxRepeats} times
                        </div>
                        <div>
                          <span className="font-semibold">Fairness rating:</span> 
                          <span className={`ml-1 font-bold ${fairnessStats.partnerships.maxRepeats <= 2 ? 'text-green-600' : fairnessStats.partnerships.maxRepeats <= 3 ? 'text-orange-600' : 'text-red-600'}`}>
                            {fairnessStats.partnerships.maxRepeats <= 2 ? 'Excellent' : fairnessStats.partnerships.maxRepeats <= 3 ? 'Good' : 'Needs attention'}
                          </span>
                        </div>
                      </div>
                      {fairnessStats.partnerships.repeatedPairs && fairnessStats.partnerships.repeatedPairs.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-emerald-200">
                          <div className="text-lg sm:text-base font-bold text-emerald-800 mb-1">Repeated partnerships:</div>
                          <div className="space-y-1">
                            {fairnessStats.partnerships.repeatedPairs.slice(0, 5).map((pair, index) => (
                              <div key={index} className="text-lg sm:text-sm text-emerald-700">
                                • <span className="font-medium">{pair.players}</span> - {pair.count} times
                              </div>
                            ))}
                            {fairnessStats.partnerships.repeatedPairs.length > 5 && (
                              <div className="text-lg sm:text-sm text-emerald-600 italic">
                                ... and {fairnessStats.partnerships.repeatedPairs.length - 5} more
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Opposition Fairness */}
                    <div className="mb-4 rounded bg-amber-50 p-3 border border-amber-200">
                      <h5 className="mb-2 text-lg sm:text-base font-bold text-amber-900">⚔️ Opposition Distribution</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-lg sm:text-sm">
                        <div>
                          <span className="font-medium">Total oppositions:</span> {fairnessStats.oppositions.total}
                        </div>
                        <div>
                          <span className="font-medium">Repeated oppositions:</span> {fairnessStats.oppositions.repeated}
                        </div>
                        <div>
                          <span className="font-medium">Max repeats:</span> {fairnessStats.oppositions.maxRepeats} times
                        </div>
                        <div>
                          <span className="font-medium">Fairness rating:</span> 
                          <span className={`ml-1 font-bold ${fairnessStats.oppositions.maxRepeats <= 2 ? 'text-green-600' : fairnessStats.oppositions.maxRepeats <= 3 ? 'text-orange-600' : 'text-red-600'}`}>
                            {fairnessStats.oppositions.maxRepeats <= 2 ? 'Excellent' : fairnessStats.oppositions.maxRepeats <= 3 ? 'Good' : 'Needs attention'}
                          </span>
                        </div>
                      </div>
                      {fairnessStats.oppositions.repeatedPairs && fairnessStats.oppositions.repeatedPairs.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-amber-200">
                          <div className="text-lg sm:text-base font-bold text-amber-800 mb-1">Repeated oppositions:</div>
                          <div className="space-y-1">
                            {fairnessStats.oppositions.repeatedPairs.slice(0, 5).map((pair, index) => (
                              <div key={index} className="text-lg sm:text-sm text-amber-700">
                                • <span className="font-medium">{pair.players}</span> - {pair.count} times
                              </div>
                            ))}
                            {fairnessStats.oppositions.repeatedPairs.length > 5 && (
                              <div className="text-lg sm:text-sm text-amber-600 italic">
                                ... and {fairnessStats.oppositions.repeatedPairs.length - 5} more
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Court Balance */}
                    <div className="mb-4 rounded bg-blue-50 p-3 border border-blue-200">
                      <h5 className="mb-2 text-lg sm:text-base font-bold text-blue-900">🏟️ Court Distribution</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-lg sm:text-sm">
                        <div>
                          <span className="font-medium">Total players:</span> {fairnessStats.courtAssignments.players}
                        </div>
                        <div>
                          <span className="font-medium">Courts used:</span> {fairnessStats.courtAssignments.allCourts?.length || 0}
                        </div>
                      </div>
                      {fairnessStats.courtAssignments.allCourts && fairnessStats.courtAssignments.allCourts.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-blue-200">
                          <div className="text-lg sm:text-base font-bold text-blue-800 mb-1">Games per court:</div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {fairnessStats.courtAssignments.allCourts.map((courtInfo, index) => (
                              <div key={index} className="text-lg sm:text-sm text-blue-700">
                                Court {courtInfo.court}: <span className="font-semibold">{courtInfo.count} games</span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 text-lg sm:text-sm text-blue-600">
                            <span className="font-medium">Most used:</span> Court {fairnessStats.courtAssignments.mostUsedCourt.court} ({fairnessStats.courtAssignments.mostUsedCourt.count} games)
                            {' • '}
                            <span className="font-medium">Least used:</span> Court {fairnessStats.courtAssignments.leastUsedCourt.court} ({fairnessStats.courtAssignments.leastUsedCourt.count} games)
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 text-lg sm:text-sm text-gray-500 italic">
                      💡 This analysis shows how fairly the algorithm distributed partnerships, oppositions, and court assignments. Green indicates optimal fairness.
                    </div>
                  </div>
                )}
              </div>
            )}

            {!schedule && !gamesOnly && activeTab !== 'statistics' && (
              <div className="py-6 text-center">
                <div className="text-2xl mb-1">🏸</div>
                <h3 className="mb-1 text-lg font-bold text-gray-900 sm:text-base sm:font-medium">
                  No Schedule Yet
                </h3>
                <p className="text-lg text-gray-500 sm:text-base">
                  Add players and generate your tournament.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
      <ConfirmDialog
        open={confirmClearOpen}
        title="Clear players"
        message="Are you sure you want to clear all players? This action cannot be undone."
        onCancel={() => setConfirmClearOpen(false)}
        onConfirm={onConfirmClear}
      />
    </div>
  );
};

export default BadmintonScheduler;
