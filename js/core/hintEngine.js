import { takeRandom, uniqBy } from "./utils.js";

function buildGenericHints(character) {
  const cleanedName = character.name.replace(/[^A-Za-z0-9 ]/g, "").trim();
  const words = cleanedName.split(/\s+/).filter(Boolean);
  const firstName = words[0] ?? character.name;
  const surname = words.length > 1 ? words[words.length - 1] : "";
  const initials = words.map((word) => word[0]?.toUpperCase()).join("");
  const fullLetterCount = words.join("").length;
  const genreLabel = (character.tags ?? []).slice(0, 2).join(" / ");

  const hints = [
    {
      tier: 1,
      key: `${character.id}:g:genre`,
      text: `This answer comes from a ${genreLabel} anime.`,
    },
    {
      tier: 3,
      key: `${character.id}:g:anime`,
      text: `This character is from ${character.anime}.`,
    },
    {
      tier: 3,
      key: `${character.id}:g:initials`,
      text: `The initials of the full answer are ${initials}.`,
    },
    {
      tier: 3,
      key: `${character.id}:g:words`,
      text: `The full answer has ${words.length} word${words.length === 1 ? "" : "s"}.`,
    },
    {
      tier: 3,
      key: `${character.id}:g:first-start`,
      text: `The first name starts with ${firstName[0].toUpperCase()}.`,
    },
    {
      tier: 3,
      key: `${character.id}:g:first-length`,
      text: `The first name has ${firstName.length} letters.`,
    },
    {
      tier: 3,
      key: `${character.id}:g:full-length`,
      text: `The full name has ${fullLetterCount} letters if spaces are ignored.`,
    },
  ];

  if (surname) {
    hints.push(
      {
        tier: 3,
        key: `${character.id}:g:last-start`,
        text: `The surname starts with ${surname[0].toUpperCase()}.`,
      },
      {
        tier: 3,
        key: `${character.id}:g:last-length`,
        text: `The surname has ${surname.length} letters.`,
      },
    );
  }

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
