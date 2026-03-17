const STORAGE_KEY = "anime-hint-party-v1";

function getDefaultGameData() {
  return {
    totalScore: 0,
    roundsPlayed: 0,
    streak: 0,
    bestStreak: 0,
    preferredPlayerName: "",
    recentCharacters: [],
    recentHintKeys: {},
    recentResults: [],
    leaderboard: [],
  };
}

export function loadGameData() {
  const defaults = getDefaultGameData();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return defaults;
    }

    const parsed = JSON.parse(raw);

    return {
      ...defaults,
      ...parsed,
      recentCharacters: Array.isArray(parsed.recentCharacters)
        ? parsed.recentCharacters
        : [],
      recentHintKeys: parsed.recentHintKeys ?? {},
      recentResults: Array.isArray(parsed.recentResults)
        ? parsed.recentResults
        : [],
      leaderboard: Array.isArray(parsed.leaderboard) ? parsed.leaderboard : [],
    };
  } catch (error) {
    console.warn("Could not load saved game data.", error);
    return defaults;
  }
}

export function saveGameData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function pushRecentCharacter(data, characterId, limit = 10) {
  data.recentCharacters = [
    characterId,
    ...(data.recentCharacters ?? []).filter((id) => id !== characterId),
  ].slice(0, limit);
}

export function rememberHints(data, characterId, hintKeys, limit = 40) {
  const previous = data.recentHintKeys?.[characterId] ?? [];
  const merged = [...hintKeys, ...previous].filter(Boolean);
  const unique = [];
  const seen = new Set();

  for (const key of merged) {
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(key);
  }

  data.recentHintKeys = {
    ...(data.recentHintKeys ?? {}),
    [characterId]: unique.slice(0, limit),
  };
}

export function addRecentResult(data, result, limit = 14) {
  data.recentResults = [result, ...(data.recentResults ?? [])].slice(0, limit);
}

export function updateLeaderboard(data, playerName, score, won) {
  const safeName = (playerName || "Guest").trim() || "Guest";
  const leaderboard = data.leaderboard ?? [];
  const normalizedName = safeName.toLowerCase();

  let entry = leaderboard.find(
    (item) => item.player.toLowerCase() === normalizedName,
  );

  if (!entry) {
    entry = {
      player: safeName,
      totalScore: 0,
      wins: 0,
      rounds: 0,
      bestSingleRound: 0,
    };

    leaderboard.push(entry);
  }

  entry.rounds += 1;
  entry.totalScore += score;
  entry.bestSingleRound = Math.max(entry.bestSingleRound, score);

  if (won) {
    entry.wins += 1;
  }

  leaderboard.sort((left, right) => {
    if (right.totalScore !== left.totalScore) {
      return right.totalScore - left.totalScore;
    }

    if (right.wins !== left.wins) {
      return right.wins - left.wins;
    }

    return right.bestSingleRound - left.bestSingleRound;
  });

  data.leaderboard = leaderboard.slice(0, 20);
}
