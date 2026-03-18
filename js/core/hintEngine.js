import { takeRandom, uniqBy } from "./utils.js";

function escapeRegExp(str = "") {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getAcceptedAnswers(character) {
  const name = character?.name;
  const aliases = character?.aliases ?? [];
  const accepted = [name, ...(aliases || [])].filter(Boolean).map(String);
  // De-dupe while preserving order.
  return [...new Set(accepted)];
}

function hintRevealsAcceptedAnswer(hint, character) {
  const text = String(hint?.text ?? "");
  if (!text) return false;

  // Fast path for the explicit alias-revealing templates in the data.
  const t = text.toLowerCase();
  if (t.includes("accepted alias for this answer is")) return true;
  if (t.includes("accepted alias for this title is")) return true;

  const accepted = getAcceptedAnswers(character);
  for (const alias of accepted) {
    const escaped = escapeRegExp(alias.trim());
    if (!escaped) continue;
    // Match the whole answer/alias as its own token/phrase (case-insensitive).
    // Boundaries are "not alphanumeric" to avoid substring matches.
    const re = new RegExp(
      `(^|[^A-Za-z0-9])${escaped}([^A-Za-z0-9]|$)`,
      "i",
    );
    if (re.test(text)) return true;
  }

  return false;
}

function interleaveTiers(hints, deckSize) {
  const byTier = { 1: [], 2: [], 3: [] };
  for (const hint of hints) byTier[hint.tier]?.push(hint);

  const result = [];
  let prevTier = null;

  while (result.length < deckSize) {
    const available = [1, 2, 3].filter((t) => byTier[t].length > 0);
    if (available.length === 0) break;

    let candidates = available.filter((t) => t !== prevTier);
    if (candidates.length === 0) candidates = available;

    // Prefer the tier with the most remaining hints.
    candidates.sort((a, b) => byTier[b].length - byTier[a].length);
    const tier = candidates[0];
    result.push(byTier[tier].shift());
    prevTier = tier;
  }

  return result;
}

function buildGenericHints(character) {
  const cleanedName = character.name.replace(/[^A-Za-z0-9 ]/g, "").trim();
  const words = cleanedName.split(/\s+/).filter(Boolean);
  const fullLetterCount = words.join("").length;
  const genreLabel = (character.tags ?? []).slice(0, 2).join(" / ");

  const hints = [];

  if (genreLabel) {
    hints.push({
      tier: 1,
      key: `${character.id}:g:genre`,
      text: `The series this character comes from is often described as ${genreLabel}.`,
    });
  }

  hints.push({
    tier: 2,
    key: `${character.id}:g:structure`,
    text: `Ignoring spaces, the full name of this answer uses ${fullLetterCount} letters in total.`,
  });

  return hints;
}

function buildManualHints(character) {
  const vague = (character.clueBanks?.vague ?? []).map((text, index) => ({
    tier: 1,
    key: `${character.id}:v:${index}`,
    text,
  }));

  const medium = (character.clueBanks?.medium ?? []).map((text, index) => ({
    tier: 2,
    key: `${character.id}:m:${index}`,
    text,
  }));

  const direct = (character.clueBanks?.direct ?? []).map((text, index) => ({
    tier: 3,
    key: `${character.id}:d:${index}`,
    text,
  }));

  return [...vague, ...medium, ...direct];
}

function getTierTargets(deckSize) {
  if (deckSize <= 5) {
    return { 1: 2, 2: 2, 3: 1 };
  }

  if (deckSize <= 8) {
    return { 1: 3, 2: 3, 3: deckSize - 6 };
  }

  return { 1: 4, 2: 3, 3: deckSize - 7 };
}

export function buildHintPool(character) {
  return uniqBy(
    [...buildManualHints(character), ...buildGenericHints(character)],
    (hint) => hint.text,
  );
}

export function createHintDeck(character, recentHintKeys = [], deckSize = 10) {
  let hintPool = buildHintPool(character);

  // Avoid any hint that reveals the accepted answer directly (name or alias).
  // Otherwise the player can type the revealed alias and score instantly.
  hintPool = hintPool.filter((hint) => !hintRevealsAcceptedAnswer(hint, character));

  // If filtering removes too much (unexpected data), fall back to safe hints.
  // We intentionally DO NOT fall back to the unfiltered pool, because that could
  // reintroduce alias/name-revealing hints.
  if (hintPool.length === 0) {
    hintPool = buildGenericHints(character).filter(
      (hint) => !hintRevealsAcceptedAnswer(hint, character),
    );
  }
  if (hintPool.length === 0) {
    const cleaned = String(character?.name ?? "")
      .replace(/[^A-Za-z0-9 ]/g, "")
      .trim();
    const words = cleaned.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const initials = words
      .map((w) => w[0]?.toUpperCase())
      .filter(Boolean)
      .join("");
    const letterCount = words.join("").length;

    // These are name-agnostic: no substrings of the answer itself are included.
    hintPool = [
      {
        tier: 1,
        key: `${character.id}:fallback:wc`,
        text: wordCount > 1 ? "The answer is made of multiple words." : "The answer is a single word.",
      },
      {
        tier: 2,
        key: `${character.id}:fallback:lc`,
        text: `Ignoring spaces, the answer uses about ${letterCount} letters.`,
      },
      initials
        ? {
            tier: 3,
            key: `${character.id}:fallback:init`,
            text: `The initials start with ${initials}.`,
          }
        : null,
    ].filter(Boolean);
  }

  const targets = getTierTargets(deckSize);
  const grouped = {
    1: hintPool.filter((hint) => hint.tier === 1),
    2: hintPool.filter((hint) => hint.tier === 2),
    3: hintPool.filter((hint) => hint.tier === 3),
  };

  const chosen = [];

  for (const tier of [1, 2, 3]) {
    const freshHints = grouped[tier].filter(
      (hint) => !recentHintKeys.includes(hint.key),
    );
    const source =
      freshHints.length >= targets[tier] ? freshHints : grouped[tier];
    chosen.push(...takeRandom(source, targets[tier]));
  }

  const uniqueChosen = uniqBy(chosen, (hint) => hint.key);

  if (uniqueChosen.length < deckSize) {
    const leftovers = hintPool.filter(
      (hint) => !uniqueChosen.some((chosenHint) => chosenHint.key === hint.key),
    );

    uniqueChosen.push(...takeRandom(leftovers, deckSize - uniqueChosen.length));
  }

  const deck = interleaveTiers(uniqueChosen.slice(0, deckSize), deckSize);
  return deck.map((hint, index) => ({
    ...hint,
    order: index + 1,
  }));
}
