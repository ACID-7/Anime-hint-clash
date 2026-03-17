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
  page: "home",
};

const els = {
  totalScore: document.querySelector("#total-score"),
  currentStreak: document.querySelector("#current-streak"),
  poolCount: document.querySelector("#pool-count"),
  homeTotalScore: document.querySelector("#home-total-score"),
  homeStreak: document.querySelector("#home-streak"),
  homePool: document.querySelector("#home-pool"),
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
  return els.playerName?.value?.trim() || "Guest";
}

function setMessage(text, tone = "info") {
  if (!els.messageBox) return;
  els.messageBox.textContent = text;
  els.messageBox.className = `message ${tone}`;
}

function getFilteredCharacters() {
  if (!state.selectedAnime || state.selectedAnime === "__all__") {
    return characters;
  }
  return characters.filter((c) => c.anime === state.selectedAnime);
}

function pickCharacter() {
  const recentCharacters = state.data.recentCharacters ?? [];
  const pool = getFilteredCharacters();
  if (pool.length === 0) return null;
  const available = pool.filter((c) => !recentCharacters.includes(c.id));
  const usablePool = available.length > 0 ? available : pool;
  return shuffle(usablePool)[0];
}

function canGuessNow() {
  if (!state.round || state.round.finished) return false;
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
  const accepted = [character.name, ...(character.aliases ?? [])]
    .map((v) => normalizeText(v))
    .filter(Boolean);
  return accepted.includes(normalizeText(guess));
}

function startRound() {
  const character = pickCharacter();
  if (!character) {
    setMessage("No characters for this anime. Try another category.", "error");
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
  setMessage("Round started. Read the first hint and guess early for more points.", "info");
  render();
}

function revealHint({ silent = false } = {}) {
  if (!state.round) {
    startRound();
    return;
  }
  if (state.round.finished) {
    setMessage("Round over. Start a new one.", "warning");
    return;
  }
  if (state.round.revealedCount >= state.round.deck.length) {
    setMessage("All hints revealed. Guess or give up.", "warning");
    render();
    return;
  }

  state.round.revealedCount += 1;
  state.round.seenHintCount = state.round.revealedCount;
  if (!silent) setMessage(`Hint ${state.round.revealedCount} revealed.`, "info");
  render();
}

function finishRound(won) {
  if (!state.round || state.round.finished) return;

  const round = state.round;
  const seenHintCount = round.revealedCount;
  const shownHintKeys = round.deck.slice(0, seenHintCount).map((h) => h.key);
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
    setMessage(`Correct! ${round.character.name} from ${round.character.anime}. +${round.score} pts.`, "success");
  } else {
    round.score = 0;
    round.revealedCount = round.deck.length;
    state.data.streak = 0;
    setMessage(`Round over. Answer: ${round.character.name} from ${round.character.anime}.`, "error");
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

function handleGuess(e) {
  e.preventDefault();
  if (!state.round) {
    startRound();
    return;
  }
  if (state.round.finished) {
    setMessage("Round finished. Start a new one.", "warning");
    return;
  }

  const guess = els.guessInput.value.trim();
  if (!guess) {
    setMessage("Enter a character name.", "warning");
    return;
  }
  if (!canGuessNow()) {
    setMessage("Reveal another hint to guess again.", "warning");
    return;
  }

  if (isCorrectGuess(guess, state.round.character)) {
    finishRound(true);
  } else {
    state.round.wrongGuesses += 1;
    state.round.lastGuessRevealIndex = state.round.revealedCount;
    state.round.guessHistory.unshift(guess);
    els.guessInput.value = "";
    setMessage("Wrong. Reveal another hint to try again.", "error");
    render();
  }
}

function renderStats() {
  const pool = getFilteredCharacters().length;
  if (els.totalScore) els.totalScore.textContent = state.data.totalScore;
  if (els.currentStreak) els.currentStreak.textContent = `${state.data.streak} / best ${state.data.bestStreak}`;
  if (els.poolCount) els.poolCount.textContent = pool;
  if (els.homeTotalScore) els.homeTotalScore.textContent = state.data.totalScore;
  if (els.homeStreak) els.homeStreak.textContent = state.data.streak;
  if (els.homePool) els.homePool.textContent = pool;
}

function renderHints(round) {
  if (!els.hintList) return;
  if (!round) {
    els.hintList.innerHTML = Array.from({ length: MAX_HINTS }, (_, i) => `
      <li class="hint-item locked">
        <span class="hint-number">Hint ${i + 1}</span>
        <p>Start a round to reveal.</p>
      </li>
    `).join("");
    return;
  }

  els.hintList.innerHTML = round.deck.map((hint, i) => {
    if (i < round.revealedCount) {
      return `<li class="hint-item revealed"><span class="hint-number">Hint ${i + 1}</span><p>${escapeHtml(hint.text)}</p></li>`;
    }
    return `<li class="hint-item locked"><span class="hint-number">Hint ${i + 1}</span><p>Locked</p></li>`;
  }).join("");
}

function renderAnswer(round) {
  if (!els.answerBox) return;
  if (!round || !round.finished) {
    els.answerBox.classList.add("hidden");
    els.answerBox.innerHTML = "";
    return;
  }
  const aliases = (round.character.aliases ?? []).filter(Boolean);
  const aliasLine = aliases.length ? `<p><span class="label">Aliases:</span> ${escapeHtml(aliases.join(", "))}</p>` : "";
  els.answerBox.classList.remove("hidden");
  els.answerBox.innerHTML = `
    <div class="answer-tag ${round.won ? "won" : "lost"}">${round.won ? "Solved" : "Revealed"}</div>
    <h4>${escapeHtml(round.character.name)}</h4>
    <p><span class="label">Anime:</span> ${escapeHtml(round.character.anime)}</p>
    <p><span class="label">Score:</span> ${round.score} • Hints: ${round.seenHintCount ?? round.revealedCount}</p>
    ${aliasLine}
  `;
}

function renderGuessHistory(round) {
  if (!els.guessHistory) return;
  if (!round || round.guessHistory.length === 0) {
    els.guessHistory.innerHTML = '<li class="empty-chip">None yet</li>';
    return;
  }
  els.guessHistory.innerHTML = round.guessHistory.map((g) => `<li class="guess-chip">${escapeHtml(g)}</li>`).join("");
}

function renderRound() {
  const round = state.round;
  renderHints(round);
  renderAnswer(round);
  renderGuessHistory(round);

  if (!els.hintsUsed || !els.wrongGuesses || !els.possiblePoints || !els.guessStatus) return;

  const allowGuess = canGuessNow();
  const scorePreview = round ? (round.finished ? round.score : calculateRoundScore(round)) : 100;
  const hintUsage = round ? (round.finished ? (round.seenHintCount ?? round.revealedCount) : round.revealedCount) : 0;

  els.hintsUsed.textContent = hintUsage;
  els.wrongGuesses.textContent = round ? round.wrongGuesses : 0;
  els.possiblePoints.textContent = scorePreview;

  if (!round) els.guessStatus.textContent = "Start a round to guess.";
  else if (round.finished && round.won) els.guessStatus.textContent = `Solved in ${hintUsage} hints.`;
  else if (round.finished) els.guessStatus.textContent = "Round ended. Start a new one.";
  else if (allowGuess) els.guessStatus.textContent = "You can guess now.";
  else if (round.revealedCount >= round.deck.length) els.guessStatus.textContent = "No more hints. Give up or start over.";
  else els.guessStatus.textContent = "Reveal another hint to guess again.";

  if (els.guessInput) els.guessInput.disabled = !allowGuess;
  if (els.guessButton) els.guessButton.disabled = !allowGuess;
  if (els.nextHint) els.nextHint.disabled = !round || round.finished || round.revealedCount >= round.deck.length;
  if (els.giveUp) els.giveUp.disabled = !round || round.finished;
}

function renderLeaderboard() {
  if (!els.leaderboard) return;
  const lb = state.data.leaderboard ?? [];
  if (lb.length === 0) {
    els.leaderboard.className = "leaderboard empty";
    els.leaderboard.innerHTML = "No scores yet. Be the first!";
    return;
  }
  els.leaderboard.className = "leaderboard";
  els.leaderboard.innerHTML = lb.map((e, i) => `
    <div class="leader-entry">
      <div class="leader-rank">#${i + 1}</div>
      <div class="leader-meta">
        <strong>${escapeHtml(e.player)}</strong>
        <span>${e.wins} wins • ${e.rounds} rounds • best ${e.bestSingleRound}</span>
      </div>
      <div class="leader-total">${e.totalScore}</div>
    </div>
  `).join("");
}

function renderRecentResults() {
  if (!els.recentResults) return;
  const results = state.data.recentResults ?? [];
  if (results.length === 0) {
    els.recentResults.className = "recent-results empty";
    els.recentResults.innerHTML = "No rounds played yet.";
    return;
  }
  els.recentResults.className = "recent-results";
  els.recentResults.innerHTML = results.map((r) => `
    <article class="result-card ${r.won ? "won" : "lost"}">
      <div class="result-top">
        <strong>${escapeHtml(r.player)}</strong>
        <span>${r.won ? "Correct" : "Missed"}</span>
      </div>
      <p>${escapeHtml(r.character)} <span class="muted-inline">from ${escapeHtml(r.anime)}</span></p>
      <p class="result-line">${r.score} pts • ${r.hintsUsed} hints • ${r.wrongGuesses} wrong</p>
      <p class="result-time">${escapeHtml(r.time)}</p>
    </article>
  `).join("");
}

function render() {
  renderStats();
  renderRound();
  renderLeaderboard();
  renderRecentResults();
}

function showPage(page) {
  state.page = page;
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach((a) => a.classList.remove("active"));
  const pageEl = document.getElementById(`page-${page}`);
  const linkEl = document.querySelector(`.nav-link[data-page="${page}"]`);
  if (pageEl) pageEl.classList.add("active");
  if (linkEl) linkEl.classList.add("active");
  window.location.hash = page;
}

function initRouting() {
  const hash = window.location.hash.slice(1) || "home";
  const valid = ["home", "game", "leaderboard", "history"];
  showPage(valid.includes(hash) ? hash : "home");

  window.addEventListener("hashchange", () => {
    const h = window.location.hash.slice(1) || "home";
    if (valid.includes(h)) showPage(h);
  });

  document.querySelectorAll(".nav-link").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      showPage(a.dataset.page);
    });
  });
}

function initAnimeSelect() {
  if (!els.animeSelect) return;
  const unique = [...new Set(characters.map((c) => c.anime))].sort((a, b) => a.localeCompare(b));
  unique.forEach((anime) => {
    const opt = document.createElement("option");
    opt.value = anime;
    opt.textContent = anime;
    els.animeSelect.appendChild(opt);
  });
  els.animeSelect.value = state.selectedAnime;
}

function bindEvents() {
  if (els.startRound) els.startRound.addEventListener("click", startRound);
  if (els.nextHint) els.nextHint.addEventListener("click", () => revealHint());
  if (els.giveUp) els.giveUp.addEventListener("click", () => finishRound(false));
  if (els.guessForm) els.guessForm.addEventListener("submit", handleGuess);
  if (els.animeSelect) {
    els.animeSelect.addEventListener("change", () => {
      state.selectedAnime = els.animeSelect.value;
      state.round = null;
      setMessage(
        state.selectedAnime === "__all__"
          ? "All anime selected. Start a new round."
          : `Category: ${state.selectedAnime}. Start a round.`,
        "info"
      );
      render();
    });
  }
  if (els.playerName) {
    els.playerName.addEventListener("input", () => {
      state.data.preferredPlayerName = els.playerName.value.trim();
      saveGameData(state.data);
    });
  }
}

function init() {
  if (els.playerName) els.playerName.value = state.data.preferredPlayerName ?? "";
  initAnimeSelect();
  initRouting();
  bindEvents();
  render();
  startRound();
}

init();
