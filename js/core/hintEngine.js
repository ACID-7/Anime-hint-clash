import { takeRandom, uniqBy } from "./utils.js";

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
  const hintPool = buildHintPool(character);
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

  return uniqueChosen.slice(0, deckSize).map((hint, index) => ({
    ...hint,
    order: index + 1,
  }));
}
