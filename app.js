import { characters } from "./js/data/characters.js";
import { createHintDeck } from "./js/core/hintEngine.js";
import {
  addRecentResult,
  loadGameData,
  pushRecentCharacter,
  rememberHints,
  saveGameData,
  updateLeaderboard,
} from "./js/core/storage.js";
import {
  clamp,
  escapeHtml,
  formatDateTime,
  normalizeText,
  shuffle,
} from "./js/core/utils.js";

const MAX_HINTS = 10;

const state = {
  data: loadGameData(),
  round: null,
  selectedAnime: "__all__",
};

const els = {
  totalScore: document.querySelector("#total-score"),
  roundsPlayed: document.querySelector("#rounds-played"),
  currentStreak: document.querySelector("#current-streak"),
  poolCount: document.querySelector("#pool-count"),
  roundTitle: document.querySelector("#round-title"),
  roundSubtitle: document.querySelector("#round-subtitle"),
  startRound: document.querySelector("#start-round"),
  nextHint: document.querySelector("#next-hint"),
  giveUp: document.querySelector("#give-up"),
  playerName: document.querySelector("#player-name"),
  animeSelect: document.querySelector("#anime-select"),
  messageBox: document.querySelector("#message-box"),
  hintList: document.querySelector("#hint-list"),
  guessForm: document.querySelector("#guess-form"),
  guessInput: document.querySelector("#guess-input"),
  guessButton: document.querySelector("#guess-button"),
  guessStatus: document.querySelector("#guess-status"),
  hintsUsed: document.querySelector("#hints-used"),
  wrongGuesses: document.querySelector("#wrong-guesses"),
  possiblePoints: document.querySelector("#possible-points"),
  answerBox: document.querySelector("#answer-box"),
  guessHistory: document.querySelector("#guess-history"),
  leaderboard: document.querySelector("#leaderboard"),
  recentResults: document.querySelector("#recent-results"),
};

function getPlayerName() {
  return els.playerName.value.trim() || "Guest";
}

function setMessage(text, tone = "info") {
  els.messageBox.textContent = text;
  els.messageBox.className = `message ${tone}`;
}

function getFilteredCharacters() {
  if (!state.selectedAnime || state.selectedAnime === "__all__") {
    return characters;
  }

  return characters.filter((character) => character.anime === state.selectedAnime);
}

function pickCharacter() {
  const recentCharacters = state.data.recentCharacters ?? [];
  const pool = getFilteredCharacters();

  if (pool.length === 0) {
    return null;
  }

  const available = pool.filter(
    (character) => !recentCharacters.includes(character.id),
  );
  const usablePool = available.length > 0 ? available : pool;

  return shuffle(usablePool)[0];
}

function canGuessNow() {
  if (!state.round || state.round.finished) {
    return false;
  }

  return (
    state.round.revealedCount > 0 &&
    state.round.lastGuessRevealIndex < state.round.revealedCount
  );
}

function calculateRoundScore(round) {
  const revealPenalty = (round.revealedCount - 1) * 9;
  const wrongPenalty = round.wrongGuesses * 7;

  return clamp(100 - revealPenalty - wrongPenalty, 10, 100);
}

function isCorrectGuess(guess, character) {
  const acceptedGuesses = [character.name, ...(character.aliases ?? [])]
    .map((value) => normalizeText(value))
    .filter(Boolean);

  return acceptedGuesses.includes(normalizeText(guess));
}

function startRound() {
  const character = pickCharacter();

  if (!character) {
    setMessage(
      "No characters are available for the selected anime. Try choosing a different one.",
      "error",
    );
    state.round = null;
    render();
    return;
  }

  const recentHintKeys = state.data.recentHintKeys?.[character.id] ?? [];

  state.round = {
    character,
    deck: createHintDeck(character, recentHintKeys, MAX_HINTS),
    revealedCount: 0,
    wrongGuesses: 0,
    guessHistory: [],
    finished: false,
    won: false,
    score: 0,
    lastGuessRevealIndex: 0,
    seenHintCount: 0,
  };

  els.guessInput.value = "";
  revealHint({ silent: true });
  setMessage(
    "New round started. Read the first hint and guess early for a better score.",
    "info",
  );
  render();
}

function revealHint({ silent = false } = {}) {
  if (!state.round) {
    startRound();
    return;
  }

  if (state.round.finished) {
    setMessage(
      "That round is over. Start a new one to keep playing.",
      "warning",
    );
    return;
  }

  if (state.round.revealedCount >= state.round.deck.length) {
    setMessage(
      "All hints are already revealed. Guess if you still can, or give up.",
      "warning",
    );
    render();
    return;
  }

  state.round.revealedCount += 1;
  state.round.seenHintCount = state.round.revealedCount;

  if (!silent) {
    setMessage(`Hint ${state.round.revealedCount} is now live.`, "info");
  }

  render();
}

function finishRound(won) {
  if (!state.round || state.round.finished) {
    return;
  }

  const round = state.round;
  const seenHintCount = round.revealedCount;
  const shownHintKeys = round.deck
    .slice(0, seenHintCount)
    .map((hint) => hint.key);
  const playerName = getPlayerName();

  round.finished = true;
  round.won = won;
  round.seenHintCount = seenHintCount;

  state.data.roundsPlayed += 1;
  state.data.preferredPlayerName = playerName;

  if (won) {
    round.score = calculateRoundScore(round);
    state.data.totalScore += round.score;
    state.data.streak += 1;
    state.data.bestStreak = Math.max(state.data.bestStreak, state.data.streak);
    setMessage(
      `Correct. It was ${round.character.name} from ${round.character.anime}. +${round.score} points.`,
      "success",
    );
  } else {
    round.score = 0;
    round.revealedCount = round.deck.length;
    state.data.streak = 0;
    setMessage(
      `Round over. The answer was ${round.character.name} from ${round.character.anime}.`,
      "error",
    );
  }

  pushRecentCharacter(state.data, round.character.id);
  rememberHints(state.data, round.character.id, shownHintKeys);

  addRecentResult(state.data, {
    player: playerName,
    won,
    score: round.score,
    character: round.character.name,
    anime: round.character.anime,
    hintsUsed: seenHintCount,
    wrongGuesses: round.wrongGuesses,
    time: formatDateTime(new Date()),
  });

  updateLeaderboard(state.data, playerName, round.score, won);
  saveGameData(state.data);
  render();
}

function handleGuess(event) {
  event.preventDefault();

  if (!state.round) {
    startRound();
    return;
  }

  if (state.round.finished) {
    setMessage("This round is finished. Start a new one.", "warning");
    return;
  }

  const guess = els.guessInput.value.trim();

  if (!guess) {
    setMessage("Type a character name before submitting a guess.", "warning");
    return;
  }

  if (!canGuessNow()) {
    setMessage(
      "You already used your guess for this hint. Reveal another one first.",
      "warning",
    );
    return;
  }

  if (isCorrectGuess(guess, state.round.character)) {
    finishRound(true);
  } else {
    state.round.wrongGuesses += 1;
    state.round.lastGuessRevealIndex = state.round.revealedCount;
    state.round.guessHistory.unshift(guess);
    els.guessInput.value = "";
    setMessage(
      "Wrong guess. Reveal another hint before you try again.",
      "error",
    );
    render();
  }
}

function renderStats() {
  els.totalScore.textContent = state.data.totalScore;
  els.roundsPlayed.textContent = state.data.roundsPlayed;
  els.currentStreak.textContent = `${state.data.streak} / best ${state.data.bestStreak}`;
  els.poolCount.textContent = getFilteredCharacters().length;
}

function renderHints(round) {
  if (!round) {
    els.hintList.innerHTML = Array.from(
      { length: MAX_HINTS },
      (_, index) => `
      <li class="hint-item locked">
        <span class="hint-number">Hint ${index + 1}</span>
        <p>Start a round to reveal this hint.</p>
      </li>
    `,
    ).join("");

    return;
  }

  els.hintList.innerHTML = round.deck
    .map((hint, index) => {
      if (index < round.revealedCount) {
        return `
          <li class="hint-item revealed">
            <span class="hint-number">Hint ${index + 1}</span>
            <p>${escapeHtml(hint.text)}</p>
          </li>
        `;
      }

      return `
        <li class="hint-item locked">
          <span class="hint-number">Hint ${index + 1}</span>
          <p>Locked until you reveal it.</p>
        </li>
      `;
    })
    .join("");
}

function renderAnswer(round) {
  if (!round || !round.finished) {
    els.answerBox.classList.add("hidden");
    els.answerBox.innerHTML = "";
    return;
  }

  const aliases = (round.character.aliases ?? []).filter(Boolean);
  const aliasLine = aliases.length
    ? `<p><span class="label">Accepted aliases:</span> ${escapeHtml(aliases.join(", "))}</p>`
    : "";

  els.answerBox.classList.remove("hidden");
  els.answerBox.innerHTML = `
    <div class="answer-tag ${round.won ? "won" : "lost"}">${round.won ? "Solved" : "Revealed"}</div>
    <h4>${escapeHtml(round.character.name)}</h4>
    <p><span class="label">Anime:</span> ${escapeHtml(round.character.anime)}</p>
    <p><span class="label">Round score:</span> ${round.score}</p>
    <p><span class="label">Hints seen:</span> ${round.seenHintCount ?? round.revealedCount}</p>
    ${aliasLine}
  `;
}

function renderGuessHistory(round) {
  if (!round || round.guessHistory.length === 0) {
    els.guessHistory.innerHTML =
      '<li class="empty-chip">No wrong guesses yet.</li>';
    return;
  }

  els.guessHistory.innerHTML = round.guessHistory
    .map((guess) => `<li class="guess-chip">${escapeHtml(guess)}</li>`)
    .join("");
}

function renderRound() {
  const round = state.round;

  if (!round) {
    els.roundTitle.textContent = "No round yet";
    els.roundSubtitle.textContent =
      "Start a round to get a random character and your first hint.";
  } else if (round.finished) {
    els.roundTitle.textContent = round.won ? "Round cleared" : "Round missed";
    els.roundSubtitle.textContent = `${round.character.name} • ${round.character.anime}`;
  } else {
    els.roundTitle.textContent = "Hidden character";
    els.roundSubtitle.textContent = `${round.revealedCount}/${round.deck.length} hints revealed • one guess per hint`;
  }

  renderHints(round);
  renderAnswer(round);
  renderGuessHistory(round);

  const allowGuess = canGuessNow();
  const scorePreview = round
    ? round.finished
      ? round.score
      : calculateRoundScore(round)
    : 100;
  const hintUsage = round
    ? round.finished
      ? (round.seenHintCount ?? round.revealedCount)
      : round.revealedCount
    : 0;

  els.hintsUsed.textContent = hintUsage;
  els.wrongGuesses.textContent = round ? round.wrongGuesses : 0;
  els.possiblePoints.textContent = scorePreview;

  if (!round) {
    els.guessStatus.textContent = "Start a round to make your first guess.";
  } else if (round.finished && round.won) {
    els.guessStatus.textContent = `You solved it in ${hintUsage} hints.`;
  } else if (round.finished) {
    els.guessStatus.textContent = "Round ended. Hit start for the next one.";
  } else if (allowGuess) {
    els.guessStatus.textContent =
      "You can submit one guess for the current hint.";
  } else if (round.revealedCount >= round.deck.length) {
    els.guessStatus.textContent =
      "No more hints left. Give up or start the next round.";
  } else {
    els.guessStatus.textContent =
      "You used your guess for this hint. Reveal another one to try again.";
  }

  els.guessInput.disabled = !allowGuess;
  els.guessButton.disabled = !allowGuess;
  els.nextHint.disabled =
    !round || round.finished || round.revealedCount >= round.deck.length;
  els.giveUp.disabled = !round || round.finished;
}

function renderLeaderboard() {
  const leaderboard = state.data.leaderboard ?? [];

  if (leaderboard.length === 0) {
    els.leaderboard.className = "leaderboard empty";
    els.leaderboard.innerHTML = "No scores yet. Be the first one on the board.";
    return;
  }

  els.leaderboard.className = "leaderboard";
  els.leaderboard.innerHTML = leaderboard
    .map(
      (entry, index) => `
        <div class="leader-entry">
          <div class="leader-rank">#${index + 1}</div>
          <div class="leader-meta">
            <strong>${escapeHtml(entry.player)}</strong>
            <span>${entry.wins} wins • ${entry.rounds} rounds • best ${entry.bestSingleRound}</span>
          </div>
          <div class="leader-total">${entry.totalScore}</div>
        </div>
      `,
    )
    .join("");
}

function renderRecentResults() {
  const recentResults = state.data.recentResults ?? [];

  if (recentResults.length === 0) {
    els.recentResults.className = "recent-results empty";
    els.recentResults.innerHTML = "No rounds played yet.";
    return;
  }

  els.recentResults.className = "recent-results";
  els.recentResults.innerHTML = recentResults
    .map(
      (result) => `
        <article class="result-card ${result.won ? "won" : "lost"}">
          <div class="result-top">
            <strong>${escapeHtml(result.player)}</strong>
            <span>${result.won ? "Correct" : "Missed"}</span>
          </div>
          <p>${escapeHtml(result.character)} <span class="muted-inline">from ${escapeHtml(result.anime)}</span></p>
          <p class="result-line">${result.score} pts • ${result.hintsUsed} hints • ${result.wrongGuesses} wrong</p>
          <p class="result-time">${escapeHtml(result.time)}</p>
        </article>
      `,
    )
    .join("");
}

function render() {
  renderStats();
  renderRound();
  renderLeaderboard();
  renderRecentResults();
}

function initAnimeSelect() {
  const uniqueAnime = Array.from(
    new Set(characters.map((character) => character.anime)),
  ).sort((a, b) => a.localeCompare(b));

  const fragment = document.createDocumentFragment();

  uniqueAnime.forEach((anime) => {
    const option = document.createElement("option");
    option.value = anime;
    option.textContent = anime;
    fragment.appendChild(option);
  });

  els.animeSelect.appendChild(fragment);

  // Restore previous selection if we ever persist it later
  els.animeSelect.value = state.selectedAnime;
}

function bindEvents() {
  els.startRound.addEventListener("click", startRound);
  els.nextHint.addEventListener("click", () => revealHint());
  els.giveUp.addEventListener("click", () => finishRound(false));
  els.guessForm.addEventListener("submit", handleGuess);
  els.animeSelect.addEventListener("change", () => {
    state.selectedAnime = els.animeSelect.value;
    state.round = null;
    setMessage(
      state.selectedAnime === "__all__"
        ? "Category cleared. New rounds will draw from all anime."
        : `Category set to ${state.selectedAnime}. Start a new round to get a character from this anime.`,
      "info",
    );
    render();
  });
  els.playerName.addEventListener("input", () => {
    state.data.preferredPlayerName = els.playerName.value.trim();
    saveGameData(state.data);
  });
}

function init() {
  els.playerName.value = state.data.preferredPlayerName ?? "";
  initAnimeSelect();
  bindEvents();
  render();
  startRound();
}

init();
