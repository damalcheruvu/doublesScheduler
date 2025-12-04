// Utility: find duplicate player names (case-insensitive), returning arrays of actual spellings per duplicate
export function findDuplicates(playersText) {
  const names = playersText
    .split('\n')
    .map(p => p.trim())
    .filter(p => p);
  const duplicatesMap = new Map();

  names.forEach(name => {
    const lowercaseName = name.toLowerCase();
    if (!duplicatesMap.has(lowercaseName)) {
      duplicatesMap.set(lowercaseName, []);
    }
    duplicatesMap.get(lowercaseName).push(name);
  });

  return Array.from(duplicatesMap.entries()).filter(
    ([, arr]) => arr.length > 1
  );
}
