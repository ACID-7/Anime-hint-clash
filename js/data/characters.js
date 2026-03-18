const uniq = (items) => [...new Set((items || []).filter(Boolean))];

const slugify = (value) =>
  String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const c = (name, aliases, role, affiliation, traits, extraTags = []) => ({
  name,
  aliases,
  role,
  affiliation,
  traits,
  extraTags,
});

const g = (
  name,
  aliases,
  gameSeries,
  genres,
  platforms,
  traits,
  extraTags = [],
) => ({
  name,
  aliases,
  role: "game title",
  affiliation: gameSeries || "Games",
  traits,
  extraTags: [...(extraTags || []), ...(genres || []), ...(platforms || [])],
  answerType: "game",
  gameSeries: gameSeries || "Games",
  genres: genres || [],
  platforms: platforms || [],
});

const series = (anime, seriesTags, characters) => ({
  anime,
  seriesTags,
  characters,
});

function makeCharacterHints(seriesInfo, entry) {
  const words = entry.name.split(/\s+/).filter(Boolean);
  const firstName = words[0] || entry.name;
  const lastName = words.length > 1 ? words[words.length - 1] : "";
  const initials = words.map((word) => word[0]?.toUpperCase()).join("");
  const traits = uniq(entry.traits || []);
  const aliasHint = (entry.aliases || []).find(
    (alias) => alias.toLowerCase() !== entry.name.toLowerCase(),
  );

  const vague = uniq([
    entry.role ? `This answer usually fills a ${entry.role} role.` : null,
    seriesInfo.seriesTags?.[0]
      ? `This answer comes from a ${seriesInfo.seriesTags[0]} series.`
      : null,
    traits[0] ? `One clue strongly points to ${traits[0]}.` : null,
    traits[1] ? `Another clue points toward ${traits[1]}.` : null,
    entry.affiliation
      ? `This answer is associated with ${entry.affiliation}.`
      : null,
  ]);

  const medium = uniq([
    seriesInfo.seriesTags?.[1]
      ? `This series also leans into ${seriesInfo.seriesTags[1]} themes.`
      : null,
    traits[2] ? `A stronger clue is ${traits[2]}.` : null,
    entry.affiliation
      ? `A stronger clue points toward ${entry.affiliation}.`
      : null,
    `The full answer has ${words.length} word${words.length === 1 ? "" : "s"}.`,
    `The initials of the answer are ${initials}.`,
  ]);

  const direct = uniq([
    `This answer is from ${seriesInfo.anime}.`,
    `The first name starts with ${firstName[0].toUpperCase()}.`,
    lastName
      ? `The surname starts with ${lastName[0].toUpperCase()}.`
      : `The answer is a single-word name.`,
    `The first name has ${firstName.length} letters.`,
    aliasHint ? `One accepted alias for this answer is ${aliasHint}.` : null,
  ]);

  return { vague, medium, direct };
}

function makeGameHints(seriesInfo, entry) {
  const words = entry.name.split(/\s+/).filter(Boolean);
  const firstWord = words[0] || entry.name;
  const initials = words
    .filter((word) => /^[A-Za-z0-9]/.test(word))
    .map((word) => word[0]?.toUpperCase())
    .join("");
  const aliasHint = (entry.aliases || []).find(
    (alias) => alias.toLowerCase() !== entry.name.toLowerCase(),
  );

  const vague = uniq([
    `This answer is a video game title.`,
    entry.genres?.[0]
      ? `It is mainly known as a ${entry.genres[0]} game.`
      : null,
    entry.traits?.[0] ? `One clue points to ${entry.traits[0]}.` : null,
    entry.traits?.[1] ? `Another clue points toward ${entry.traits[1]}.` : null,
    entry.gameSeries ? `It belongs to the ${entry.gameSeries} umbrella.` : null,
  ]);

  const medium = uniq([
    entry.genres?.[1]
      ? `A stronger clue is that it also fits ${entry.genres[1]}.`
      : null,
    entry.platforms?.length
      ? `It is commonly associated with ${entry.platforms.slice(0, 2).join(" and ")}.`
      : null,
    entry.traits?.[2] ? `A stronger clue is ${entry.traits[2]}.` : null,
    `The answer has ${words.length} word${words.length === 1 ? "" : "s"}.`,
    initials ? `The initials of the title are ${initials}.` : null,
  ]);

  const direct = uniq([
    `This title is in the Games category.`,
    entry.gameSeries && entry.gameSeries !== "Games"
      ? `This title is part of ${entry.gameSeries}.`
      : null,
    `The first word starts with ${firstWord[0].toUpperCase()}.`,
    `The first word has ${firstWord.length} letters.`,
    aliasHint ? `One accepted alias for this title is ${aliasHint}.` : null,
  ]);

  return { vague, medium, direct };
}

function makeHints(seriesInfo, entry) {
  return entry.answerType === "game"
    ? makeGameHints(seriesInfo, entry)
    : makeCharacterHints(seriesInfo, entry);
}

function buildEntry(seriesInfo, entry) {
  const displaySeries =
    entry.answerType === "game"
      ? entry.gameSeries || seriesInfo.anime
      : seriesInfo.anime;

  return {
    id: `${slugify(displaySeries)}-${slugify(entry.name)}`,
    name: entry.name,
    anime: displaySeries,
    aliases: entry.aliases || [],
    type: entry.answerType === "game" ? "game" : "character",
    tags: uniq([...(seriesInfo.seriesTags || []), ...(entry.extraTags || [])]),
    clueBanks: makeHints(seriesInfo, entry),
  };
}

const seriesPack = [
  series(
    "Naruto",
    ["shonen", "action", "ninja"],
    [
      c(
        "Naruto Uzumaki",
        ["Naruto", "Seventh Hokage"],
        "protagonist",
        "Konoha",
        ["shadow clones", "a sealed fox spirit", "orange ninja styling"],
      ),
      c("Sasuke Uchiha", ["Sasuke"], "rival", "the Uchiha clan", [
        "lightning techniques",
        "revenge",
        "special eye powers",
      ]),
      c("Sakura Haruno", ["Sakura"], "main heroine", "Team 7", [
        "super strength",
        "medical ninjutsu",
        "pink hair",
      ]),
      c("Kakashi Hatake", ["Kakashi", "Copy Ninja"], "mentor", "Team 7", [
        "covered eye",
        "copying techniques",
        "reading novels",
      ]),
      c("Hinata Hyuga", ["Hinata"], "main love interest", "the Hyuga clan", [
        "gentle fist style",
        "shy nature",
        "special vision",
      ]),
      c("Gaara", ["Gaara"], "former rival", "the Sand Village", [
        "sand control",
        "a tailed beast",
        "calm red-haired design",
      ]),
      c("Jiraiya", ["Jiraiya"], "mentor", "the Sannin", [
        "toad summons",
        "travel writing",
        "legendary ninja status",
      ]),
      c("Tsunade", ["Tsunade", "Fifth Hokage"], "leader", "Konoha", [
        "medical mastery",
        "immense strength",
        "gambling habit",
      ]),
      c("Orochimaru", ["Orochimaru"], "main villain", "the Sannin", [
        "snake theme",
        "forbidden experiments",
        "body switching",
      ]),
      c("Rock Lee", ["Lee"], "determined ally", "Team Guy", [
        "taijutsu only",
        "green jumpsuit",
        "intense training",
      ]),
      c("Neji Hyuga", ["Neji"], "talented ally", "the Hyuga clan", [
        "byakugan",
        "fate-themed conflict",
        "precise strikes",
      ]),
      c("Shikamaru Nara", ["Shikamaru"], "strategist", "Team 10", [
        "shadow control",
        "lazy genius",
        "high IQ plans",
      ]),
      c("Ino Yamanaka", ["Ino"], "supporting kunoichi", "Team 10", [
        "mind techniques",
        "blond ponytail",
        "medical support",
      ]),
      c("Choji Akimichi", ["Choji"], "supporting ally", "Team 10", [
        "expansion jutsu",
        "food-loving nature",
        "strong loyalty",
      ]),
      c("Kiba Inuzuka", ["Kiba"], "supporting ally", "Team 8", [
        "dog partner",
        "beast-like combat",
        "aggressive attitude",
      ]),
      c("Shino Aburame", ["Shino"], "quiet ally", "Team 8", [
        "insects",
        "glasses",
        "reserved personality",
      ]),
      c("Temari", ["Temari"], "sand kunoichi", "the Sand Village", [
        "giant fan",
        "wind attacks",
        "strategic thinking",
      ]),
      c("Kankuro", ["Kankuro"], "sand ninja", "the Sand Village", [
        "puppets",
        "face paint",
        "sibling bond",
      ]),
      c(
        "Minato Namikaze",
        ["Minato", "Fourth Hokage"],
        "legendary father figure",
        "Konoha",
        ["teleportation", "yellow flash image", "genius speed"],
      ),
      c("Kushina Uzumaki", ["Kushina"], "mother figure", "Konoha", [
        "red hair",
        "strong chakra",
        "fiery personality",
      ]),
      c(
        "Obito Uchiha",
        ["Obito", "Tobi"],
        "tragic villain",
        "the Uchiha clan",
        ["masked identity", "war manipulation", "space-time powers"],
      ),
      c("Madara Uchiha", ["Madara"], "legendary villain", "the Uchiha clan", [
        "immense battle power",
        "special eye powers",
        "ancient rivalry",
      ]),
      c(
        "Hashirama Senju",
        ["Hashirama", "First Hokage"],
        "legendary founder",
        "Konoha",
        ["wood release", "village founder", "healing strength"],
      ),
      c(
        "Tobirama Senju",
        ["Tobirama", "Second Hokage"],
        "legendary leader",
        "Konoha",
        ["water techniques", "strict policy making", "inventing jutsu"],
      ),
      c("Nagato", ["Pain"], "major antagonist", "the Akatsuki", [
        "multiple bodies",
        "ripple eyes",
        "god-like ideology",
      ]),
      c("Konan", ["Konan"], "Akatsuki member", "the Akatsuki", [
        "paper techniques",
        "blue hair flower",
        "loyalty to Nagato",
      ]),
      c("Kisame Hoshigaki", ["Kisame"], "Akatsuki member", "the Akatsuki", [
        "shark-like appearance",
        "massive sword",
        "huge chakra reserves",
      ]),
      c("Deidara", ["Deidara"], "Akatsuki member", "the Akatsuki", [
        "explosive clay",
        "art obsession",
        "blond side ponytail",
      ]),
      c("Sai", ["Sai"], "Team 7 replacement", "Konoha", [
        "ink drawings",
        "blank expression",
        "ROOT background",
      ]),
      c("Might Guy", ["Guy"], "mentor", "Team Guy", [
        "green jumpsuit",
        "youthful passion",
        "powerful taijutsu",
      ]),
    ],
  ),

  series(
    "One Piece",
    ["shonen", "adventure", "pirates"],
    [
      c(
        "Monkey D. Luffy",
        ["Luffy", "Straw Hat Luffy"],
        "protagonist",
        "the Straw Hat Pirates",
        ["rubber powers", "straw hat", "wants to be Pirate King"],
      ),
      c("Roronoa Zoro", ["Zoro"], "swordsman", "the Straw Hat Pirates", [
        "three-sword style",
        "green hair",
        "gets lost often",
      ]),
      c("Nami", ["Nami"], "navigator", "the Straw Hat Pirates", [
        "weather-based combat",
        "orange hair",
        "loves money",
      ]),
      c("Usopp", ["Usopp", "Sogeking"], "sniper", "the Straw Hat Pirates", [
        "long nose",
        "lies and bluffing",
        "slingshot expertise",
      ]),
      c("Sanji", ["Sanji", "Black Leg"], "cook", "the Straw Hat Pirates", [
        "kicking attacks",
        "blond hair over one eye",
        "chivalry",
      ]),
      c("Tony Tony Chopper", ["Chopper"], "doctor", "the Straw Hat Pirates", [
        "reindeer body",
        "medical skills",
        "cute mascot image",
      ]),
      c("Nico Robin", ["Robin"], "archaeologist", "the Straw Hat Pirates", [
        "flower-based limb powers",
        "dark past",
        "reading poneglyphs",
      ]),
      c("Franky", ["Franky"], "shipwright", "the Straw Hat Pirates", [
        "cyborg body",
        "blue hair style changes",
        "cola-powered mechanics",
      ]),
      c("Brook", ["Brook"], "musician", "the Straw Hat Pirates", [
        "skeleton body",
        "violin and music",
        "sword cane",
      ]),
      c("Jinbe", ["Jinbe"], "helmsman", "the Straw Hat Pirates", [
        "fish-man karate",
        "blue skin",
        "former warlord",
      ]),
      c(
        "Portgas D. Ace",
        ["Ace", "Fire Fist Ace"],
        "older brother figure",
        "the Whitebeard Pirates",
        ["fire powers", "freckles", "famous execution"],
      ),
      c("Sabo", ["Sabo"], "revolutionary ally", "the Revolutionary Army", [
        "pipe weapon",
        "flame powers later on",
        "Luffy's sworn brother",
      ]),
      c(
        "Shanks",
        ["Shanks", "Red-Haired Shanks"],
        "legendary pirate",
        "the Red Hair Pirates",
        ["red hair", "one arm", "emperor status"],
      ),
      c(
        "Trafalgar D. Water Law",
        ["Law", "Trafalgar Law"],
        "rival captain",
        "the Heart Pirates",
        ["surgical devil fruit power", "spotted hat", "doctor theme"],
      ),
      c(
        "Eustass Kid",
        ["Kid", "Eustass Kid"],
        "rival captain",
        "the Kid Pirates",
        ["magnetism", "red spiky hair", "metal arm imagery"],
      ),
      c("Boa Hancock", ["Hancock"], "pirate empress", "the Kuja Pirates", [
        "stone-themed power",
        "extreme beauty",
        "snake motifs",
      ]),
      c("Crocodile", ["Crocodile"], "former warlord", "Baroque Works", [
        "sand powers",
        "hook hand",
        "cigar smoking",
      ]),
      c(
        "Donquixote Doflamingo",
        ["Doflamingo", "Doffy"],
        "major villain",
        "the Donquixote Pirates",
        ["string powers", "pink feather coat", "sunglasses"],
      ),
      c(
        "Edward Newgate",
        ["Whitebeard"],
        "legendary pirate",
        "the Whitebeard Pirates",
        ["earthquake power", "giant mustache", "father figure image"],
      ),
      c(
        "Marshall D. Teach",
        ["Blackbeard"],
        "major villain",
        "the Blackbeard Pirates",
        [
          "darkness powers",
          "multiple devil fruit mystery",
          "missing teeth grin",
        ],
      ),
      c("Buggy", ["Buggy"], "comic emperor", "Cross Guild", [
        "body-splitting power",
        "clown styling",
        "failing upward",
      ]),
      c("Dracule Mihawk", ["Mihawk"], "legendary swordsman", "Cross Guild", [
        "huge black sword",
        "hawk eyes",
        "world's greatest swordsman title",
      ]),
      c("Nefertari Vivi", ["Vivi"], "princess ally", "Alabasta", [
        "blue hair",
        "royal identity",
        "former Straw Hat companion",
      ]),
      c("Yamato", ["Yamato"], "powerful ally", "Wano", [
        "oni traits",
        "club weapon",
        "idolizes Oden",
      ]),
      c("Carrot", ["Carrot"], "mink ally", "the Mokomo Dukedom", [
        "rabbit traits",
        "electro abilities",
        "sulong form",
      ]),
      c("Kaido", ["Kaido"], "emperor villain", "the Beasts Pirates", [
        "dragon form",
        "massive kanabo",
        "world's strongest creature image",
      ]),
      c(
        "Charlotte Linlin",
        ["Big Mom"],
        "emperor villain",
        "the Big Mom Pirates",
        ["soul powers", "homies", "huge appetite"],
      ),
      c("Smoker", ["Smoker"], "marine officer", "the Marines", [
        "smoke powers",
        "cigars",
        "jitte weapon",
      ]),
      c("Kuzan", ["Aokiji", "Kuzan"], "former admiral", "the Marines", [
        "ice powers",
        "lazy justice",
        "tall calm design",
      ]),
      c("Koby", ["Koby"], "marine hero", "the Marines", [
        "pink hair early on",
        "rapid growth",
        "honest justice",
      ]),
    ],
  ),

  series(
    "Jujutsu Kaisen",
    ["shonen", "supernatural", "action"],
    [
      c(
        "Yuji Itadori",
        ["Yuji", "Itadori"],
        "protagonist",
        "Tokyo Jujutsu High",
        ["pink hair", "superhuman strength", "vessel of Sukuna"],
      ),
      c("Satoru Gojo", ["Gojo"], "mentor", "Tokyo Jujutsu High", [
        "blindfold or shades",
        "limitless techniques",
        "absurdly overpowered",
      ]),
      c("Megumi Fushiguro", ["Megumi"], "deuteragonist", "Tokyo Jujutsu High", [
        "shadow summons",
        "serious attitude",
        "spiky dark hair",
      ]),
      c("Nobara Kugisaki", ["Nobara"], "main heroine", "Tokyo Jujutsu High", [
        "hammer and nails",
        "fashion confidence",
        "straw-doll attacks",
      ]),
      c("Ryomen Sukuna", ["Sukuna"], "main villain", "the world of curses", [
        "curse markings",
        "kingly cruelty",
        "shares a body with Yuji",
      ]),
      c(
        "Yuta Okkotsu",
        ["Yuta"],
        "special-grade sorcerer",
        "Tokyo Jujutsu High",
        ["Rika bond", "katana use", "quiet power"],
      ),
      c("Maki Zenin", ["Maki"], "fighter", "Tokyo Jujutsu High", [
        "glasses",
        "weapon mastery",
        "Zenin clan conflict",
      ]),
      c("Toge Inumaki", ["Inumaki"], "ally", "Tokyo Jujutsu High", [
        "cursed speech",
        "rice ball ingredients speech",
        "high collar",
      ]),
      c("Panda", ["Panda"], "ally", "Tokyo Jujutsu High", [
        "panda body",
        "cursed corpse",
        "surprisingly thoughtful",
      ]),
      c("Kento Nanami", ["Nanami"], "mentor ally", "the jujutsu world", [
        "salaryman vibe",
        "ratio technique",
        "blond hair",
      ]),
      c("Suguru Geto", ["Geto"], "major antagonist", "the curse user faction", [
        "long dark hair",
        "manipulates curses",
        "former friend of Gojo",
      ]),
      c("Mahito", ["Mahito"], "major curse", "the disaster curses", [
        "body reshaping",
        "stitched appearance",
        "cruel curiosity",
      ]),
      c("Toji Fushiguro", ["Toji"], "assassin", "the Zenin clan", [
        "zero cursed energy",
        "insane physical ability",
        "weapon arsenal",
      ]),
      c("Aoi Todo", ["Todo"], "powerful ally", "Kyoto Jujutsu High", [
        "idol obsession",
        "brute strength",
        "boogie woogie",
      ]),
      c("Choso", ["Choso"], "complex ally", "the cursed wombs", [
        "blood techniques",
        "long hair",
        "brother bond",
      ]),
      c("Mei Mei", ["Mei Mei"], "independent sorcerer", "the jujutsu world", [
        "crow attacks",
        "money focus",
        "long silver hair",
      ]),
      c("Utahime Iori", ["Utahime"], "teacher", "Kyoto Jujutsu High", [
        "facial scar",
        "strict demeanor",
        "Gojo annoyance",
      ]),
      c("Shoko Ieiri", ["Shoko"], "doctor", "Tokyo Jujutsu High", [
        "reverse cursed technique",
        "smoking habit",
        "medical role",
      ]),
      c("Masamichi Yaga", ["Yaga"], "principal", "Tokyo Jujutsu High", [
        "cursed corpses",
        "stern appearance",
        "panda's creator",
      ]),
      c("Junpei Yoshino", ["Junpei"], "tragic student", "Mahito's orbit", [
        "jellyfish shikigami",
        "school bullying trauma",
        "dark hair",
      ]),
      c("Jogo", ["Jogo"], "disaster curse", "the disaster curses", [
        "volcano head",
        "fire attacks",
        "hot-tempered pride",
      ]),
      c("Hanami", ["Hanami"], "disaster curse", "the disaster curses", [
        "plant-like body",
        "nature theme",
        "powerful durability",
      ]),
      c("Dagon", ["Dagon"], "disaster curse", "the disaster curses", [
        "sea theme",
        "domain expansion",
        "cursed spirit evolution",
      ]),
      c("Uraume", ["Uraume"], "Sukuna loyalist", "Sukuna's side", [
        "ice techniques",
        "calm menace",
        "long pale design",
      ]),
      c("Kinji Hakari", ["Hakari"], "rogue ally", "Tokyo Jujutsu High", [
        "gambling theme",
        "rough confidence",
        "jackpot domain",
      ]),
      c("Kirara Hoshi", ["Kirara"], "ally", "Tokyo Jujutsu High", [
        "star motif power",
        "colorful styling",
        "close to Hakari",
      ]),
      c("Hajime Kashimo", ["Kashimo"], "battle seeker", "the culling game", [
        "lightning powers",
        "ancient sorcerer",
        "fight obsession",
      ]),
      c("Hiromi Higuruma", ["Higuruma"], "sorcerer", "the culling game", [
        "judge theme",
        "courtroom domain",
        "former lawyer",
      ]),
      c("Naobito Zenin", ["Naobito"], "clan head", "the Zenin clan", [
        "projection sorcery",
        "old but fast",
        "drinking habit",
      ]),
      c("Miguel", ["Miguel"], "foreign sorcerer", "Geto's side", [
        "rope weapon",
        "powerful melee skill",
        "later Yuta connection",
      ]),
    ],
  ),

  series(
    "Demon Slayer",
    ["shonen", "fantasy", "action"],
    [
      c(
        "Tanjiro Kamado",
        ["Tanjiro"],
        "protagonist",
        "the Demon Slayer Corps",
        ["checkered haori", "great sense of smell", "saving his sister"],
      ),
      c("Nezuko Kamado", ["Nezuko"], "protected sister", "the Kamado family", [
        "bamboo muzzle",
        "demon powers",
        "pink eyes",
      ]),
      c(
        "Zenitsu Agatsuma",
        ["Zenitsu"],
        "comic ally",
        "the Demon Slayer Corps",
        [
          "yellow hair",
          "thunder breathing",
          "cowardly before bursting into skill",
        ],
      ),
      c(
        "Inosuke Hashibira",
        ["Inosuke"],
        "wild ally",
        "the Demon Slayer Corps",
        ["boar mask", "dual blades", "constant shouting"],
      ),
      c("Giyu Tomioka", ["Giyu"], "hashira", "the Demon Slayer Corps", [
        "water breathing",
        "calm behavior",
        "half-patterned haori",
      ]),
      c("Shinobu Kocho", ["Shinobu"], "hashira", "the Demon Slayer Corps", [
        "insect breathing",
        "butterfly motifs",
        "poison techniques",
      ]),
      c("Kyojuro Rengoku", ["Rengoku"], "hashira", "the Demon Slayer Corps", [
        "flame breathing",
        "fiery hair",
        "booming optimism",
      ]),
      c("Tengen Uzui", ["Tengen"], "hashira", "the Demon Slayer Corps", [
        "flashy style",
        "sound breathing",
        "dual chained blades",
      ]),
      c("Muichiro Tokito", ["Muichiro"], "hashira", "the Demon Slayer Corps", [
        "mist breathing",
        "long dark hair",
        "blank expression",
      ]),
      c("Mitsuri Kanroji", ["Mitsuri"], "hashira", "the Demon Slayer Corps", [
        "love breathing",
        "pink-green hair",
        "whip-like sword",
      ]),
      c("Sanemi Shinazugawa", ["Sanemi"], "hashira", "the Demon Slayer Corps", [
        "wind breathing",
        "many scars",
        "aggressive temper",
      ]),
      c("Gyomei Himejima", ["Gyomei"], "hashira", "the Demon Slayer Corps", [
        "stone breathing",
        "huge size",
        "prayer beads",
      ]),
      c("Obanai Iguro", ["Obanai"], "hashira", "the Demon Slayer Corps", [
        "serpent breathing",
        "bandaged mouth",
        "snake companion",
      ]),
      c("Kanao Tsuyuri", ["Kanao"], "skilled ally", "the Demon Slayer Corps", [
        "coin-flip indecision",
        "flower breathing",
        "quiet demeanor",
      ]),
      c(
        "Genya Shinazugawa",
        ["Genya"],
        "rough ally",
        "the Demon Slayer Corps",
        ["shotgun use", "demon flesh ability", "scarred face"],
      ),
      c("Kagaya Ubuyashiki", ["Kagaya"], "leader", "the Ubuyashiki family", [
        "soft voice",
        "blind illness",
        "corps master",
      ]),
      c("Aoi Kanzaki", ["Aoi"], "support", "the Butterfly Mansion", [
        "blue butterfly hairpiece",
        "recovery training",
        "tsundere edge",
      ]),
      c("Muzan Kibutsuji", ["Muzan"], "main villain", "the demons", [
        "shape-shifting",
        "hat and suit disguise",
        "demon progenitor",
      ]),
      c("Akaza", ["Akaza"], "upper moon", "the demons", [
        "martial arts",
        "blue body markings",
        "battle obsession",
      ]),
      c("Doma", ["Doma"], "upper moon", "the demons", [
        "fan weapons",
        "rainbow eyes",
        "chilling smile",
      ]),
      c("Kokushibo", ["Kokushibo"], "upper moon", "the demons", [
        "multiple eyes",
        "moon breathing",
        "samurai aura",
      ]),
      c("Tamayo", ["Tamayo"], "ally demon", "the anti-Muzan side", [
        "medical knowledge",
        "calm elegance",
        "helping humans",
      ]),
      c("Yushiro", ["Yushiro"], "ally demon", "Tamayo's side", [
        "paper talismans",
        "devotion to Tamayo",
        "sharp attitude",
      ]),
      c("Enmu", ["Enmu"], "lower moon", "the demons", [
        "dream manipulation",
        "train arc villainy",
        "soft sinister smile",
      ]),
      c("Gyutaro", ["Gyutaro"], "upper moon", "the demons", [
        "sickles",
        "emaciated appearance",
        "sibling bond",
      ]),
      c("Daki", ["Daki"], "upper moon", "the demons", [
        "obi sash attacks",
        "beautiful appearance",
        "sibling bond",
      ]),
      c("Gyokko", ["Gyokko"], "upper moon", "the demons", [
        "pot teleportation",
        "twisted art obsession",
        "fish-like imagery",
      ]),
      c("Hantengu", ["Hantengu"], "upper moon", "the demons", [
        "splitting emotion clones",
        "cowardice",
        "multiple manifestations",
      ]),
      c("Rui", ["Rui"], "lower moon", "the demons", [
        "spider threads",
        "fake family obsession",
        "pale childlike look",
      ]),
      c("Sabito", ["Sabito"], "mentor spirit", "Tanjiro's training", [
        "fox mask",
        "training guidance",
        "tragic past",
      ]),
    ],
  ),

  series(
    "Blue Lock",
    ["sports", "competitive", "psychological"],
    [
      c("Yoichi Isagi", ["Isagi"], "protagonist striker", "Blue Lock", [
        "spatial awareness",
        "blue training kit",
        "goal-hunting evolution",
      ]),
      c("Meguru Bachira", ["Bachira"], "creative striker", "Blue Lock", [
        "dribbling talent",
        "yellow-black styling",
        "talks about a monster",
      ]),
      c("Rin Itoshi", ["Rin"], "elite rival", "Blue Lock", [
        "cold genius",
        "teal hair",
        "elite finishing",
      ]),
      c("Seishiro Nagi", ["Nagi"], "lazy prodigy", "Blue Lock", [
        "white hair",
        "trapping skill",
        "bored expression",
      ]),
      c("Shoei Barou", ["Barou"], "egoist striker", "Blue Lock", [
        "king imagery",
        "dark hair",
        "self-centered scoring style",
      ]),
      c("Hyoma Chigiri", ["Chigiri"], "speedster striker", "Blue Lock", [
        "red hair",
        "explosive pace",
        "injury trauma",
      ]),
      c("Reo Mikage", ["Reo"], "versatile player", "Blue Lock", [
        "purple hair",
        "wealthy background",
        "copying versatility",
      ]),
      c("Rensuke Kunigami", ["Kunigami"], "power striker", "Blue Lock", [
        "orange hair",
        "hero mindset",
        "physical shot power",
      ]),
      c("Jyubei Aryu", ["Aryu"], "stylish player", "Blue Lock", [
        "very tall height",
        "beauty obsession",
        "aerial reach",
      ]),
      c("Aoshi Tokimitsu", ["Tokimitsu"], "anxious powerhouse", "Blue Lock", [
        "muscular body",
        "low confidence",
        "stamina and strength",
      ]),
      c("Ikki Niko", ["Niko"], "reading specialist", "Blue Lock", [
        "long bangs",
        "vision-based defense",
        "quiet cunning",
      ]),
      c("Eita Otoya", ["Otoya"], "shadow striker", "Blue Lock", [
        "ninja-like movement",
        "green hair",
        "stealthy runs",
      ]),
      c("Tabito Karasu", ["Karasu"], "playmaker", "Blue Lock", [
        "underrated control",
        "black-yellow styling",
        "analytical taunts",
      ]),
      c("Kenyu Yukimiya", ["Yukimiya"], "dribbling ace", "Blue Lock", [
        "fashionable image",
        "vision issues",
        "1v1 skill",
      ]),
      c("Yo Hiori", ["Hiori"], "creative passer", "Blue Lock", [
        "light blue hair",
        "precise passing",
        "calm demeanor",
      ]),
      c("Oliver Aiku", ["Aiku"], "defensive leader", "U-20 Japan", [
        "captain aura",
        "long green hair",
        "top defender",
      ]),
      c("Sae Itoshi", ["Sae"], "genius playmaker", "Japan youth football", [
        "mint hair",
        "Rin's brother",
        "world-class talent",
      ]),
      c("Ryusei Shidou", ["Shidou"], "chaotic striker", "Blue Lock", [
        "pink highlights",
        "violent instinct",
        "explosive scoring",
      ]),
      c("Gin Gagamaru", ["Gagamaru"], "goalkeeper", "Blue Lock", [
        "wild look",
        "great reflexes",
        "animal-like agility",
      ]),
      c("Jingo Raichi", ["Raichi"], "hard-working player", "Blue Lock", [
        "stamina focus",
        "loud intensity",
        "man-marking grit",
      ]),
      c("Gurimu Igarashi", ["Igarashi"], "comic underdog", "Blue Lock", [
        "monk background",
        "survival instinct",
        "dramatic flopping",
      ]),
      c("Zantetsu Tsurugi", ["Zantetsu"], "speedster", "Blue Lock", [
        "glasses",
        "straight-line speed",
        "simple-minded behavior",
      ]),
      c("Nijiro Nanase", ["Nanase"], "supporting player", "Blue Lock", [
        "friendly nature",
        "adaptability",
        "team-oriented movement",
      ]),
      c("Ranze Kurona", ["Kurona"], "link-up specialist", "Blue Lock", [
        "short light hair",
        "quick combinations",
        "shark-like energy",
      ]),
      c("Shuto Sendou", ["Sendou"], "U-20 forward", "U-20 Japan", [
        "flashy hairstyle",
        "ego as a star",
        "national team background",
      ]),
      c("Gen Fukaku", ["Fukaku"], "goalkeeper", "U-20 Japan", [
        "keeper role",
        "blue-black styling",
        "national team background",
      ]),
      c("Anri Teieri", ["Anri"], "project manager", "Blue Lock", [
        "office attire",
        "supports the project",
        "football reform ideal",
      ]),
      c("Jinpachi Ego", ["Ego"], "project mastermind", "Blue Lock", [
        "glasses",
        "extreme striker philosophy",
        "ramen and monitors",
      ]),
      c("Reiji Hiiragi", ["Hiiragi"], "supporting player", "Blue Lock", [
        "sharp-featured design",
        "Blue Lock participant",
        "competitive roster",
      ]),
      c("Kairu Saramadara", ["Saramadara"], "supporting player", "Blue Lock", [
        "blue lock participant",
        "lesser-known striker",
        "competitive roster",
      ]),
    ],
  ),

  series(
    "My Hero Academia",
    ["shonen", "superhero", "action"],
    [
      c("Izuku Midoriya", ["Deku", "Izuku"], "protagonist", "U.A. High", [
        "green hair",
        "inherited power",
        "hero notebook habit",
      ]),
      c("Katsuki Bakugo", ["Bakugo"], "rival", "U.A. High", [
        "explosions",
        "angry attitude",
        "spiky ash-blond hair",
      ]),
      c("Shoto Todoroki", ["Todoroki"], "rival ally", "U.A. High", [
        "ice and fire",
        "split-colored hair",
        "family pressure",
      ]),
      c("Ochaco Uraraka", ["Ochaco", "Uraraka"], "main heroine", "U.A. High", [
        "zero gravity",
        "pink touches",
        "space-like combat gear",
      ]),
      c("Tenya Iida", ["Iida"], "class representative", "U.A. High", [
        "engine legs",
        "glasses",
        "strict rule-following",
      ]),
      c("Tsuyu Asui", ["Tsuyu", "Froppy"], "ally", "U.A. High", [
        "frog traits",
        "long tongue",
        "calm practical thinking",
      ]),
      c("Eijiro Kirishima", ["Kirishima"], "ally", "U.A. High", [
        "hardening",
        "red spiky hair",
        "manly attitude",
      ]),
      c("Momo Yaoyorozu", ["Momo", "Yaoyorozu"], "ally", "U.A. High", [
        "creation quirk",
        "high intelligence",
        "elite upbringing",
      ]),
      c("Denki Kaminari", ["Kaminari"], "ally", "U.A. High", [
        "electricity",
        "blond lightning streak",
        "goofy personality",
      ]),
      c("Fumikage Tokoyami", ["Tokoyami"], "ally", "U.A. High", [
        "bird head",
        "shadow companion",
        "dark dramatic tone",
      ]),
      c("Mina Ashido", ["Mina"], "ally", "U.A. High", [
        "acid powers",
        "pink skin",
        "dance energy",
      ]),
      c("Kyoka Jiro", ["Jiro"], "ally", "U.A. High", [
        "earphone jacks",
        "music theme",
        "cool sarcasm",
      ]),
      c("Hanta Sero", ["Sero"], "ally", "U.A. High", [
        "tape elbows",
        "spider-man-like movement",
        "easygoing attitude",
      ]),
      c("Mezo Shoji", ["Shoji"], "ally", "U.A. High", [
        "multiple arms",
        "masked face",
        "protective nature",
      ]),
      c("Koji Koda", ["Koda"], "ally", "U.A. High", [
        "animal communication",
        "horn-like head shape",
        "very quiet nature",
      ]),
      c("Rikido Sato", ["Sato"], "ally", "U.A. High", [
        "sugar boost",
        "baking interest",
        "strong physique",
      ]),
      c("Yuga Aoyama", ["Aoyama"], "ally", "U.A. High", [
        "navel laser",
        "sparkles",
        "dramatic French flair",
      ]),
      c("Toru Hagakure", ["Hagakure"], "ally", "U.A. High", [
        "invisibility",
        "gloves and boots only",
        "cheerful energy",
      ]),
      c("Mashirao Ojiro", ["Ojiro"], "ally", "U.A. High", [
        "tail combat",
        "martial arts",
        "plain sincerity",
      ]),
      c("Minoru Mineta", ["Mineta"], "comic ally", "U.A. High", [
        "sticky balls",
        "short stature",
        "pervy behavior",
      ]),
      c("Shota Aizawa", ["Aizawa", "Eraser Head"], "teacher", "U.A. High", [
        "erasure quirk",
        "sleepy eyes",
        "binding scarf",
      ]),
      c("Toshinori Yagi", ["All Might"], "mentor", "U.A. High", [
        "symbol of peace",
        "muscular hero form",
        "smash attacks",
      ]),
      c("Enji Todoroki", ["Endeavor"], "top hero", "the Pro Heroes", [
        "flame beard",
        "fire powers",
        "harsh family legacy",
      ]),
      c("Keigo Takami", ["Hawks"], "pro hero", "the Pro Heroes", [
        "red wings",
        "feather control",
        "laid-back coolness",
      ]),
      c(
        "Mirio Togata",
        ["Mirio", "Lemillion"],
        "upperclass hero",
        "U.A. High",
        ["permeation", "blond hair", "huge optimism"],
      ),
      c("Nejire Hado", ["Nejire"], "upperclass hero", "U.A. High", [
        "blue spiral hair",
        "wave energy",
        "curious personality",
      ]),
      c(
        "Tamaki Amajiki",
        ["Tamaki", "Suneater"],
        "upperclass hero",
        "U.A. High",
        ["food-based manifestation", "shyness", "dark elf-like look"],
      ),
      c(
        "Tomura Shigaraki",
        ["Shigaraki"],
        "main villain",
        "the League of Villains",
        ["decay quirk", "hands motif", "white hair later on"],
      ),
      c("Dabi", ["Dabi"], "villain", "the League of Villains", [
        "blue flames",
        "stitched skin",
        "burn scars",
      ]),
      c("Himiko Toga", ["Toga"], "villain", "the League of Villains", [
        "blood obsession",
        "transformations",
        "schoolgirl-like styling",
      ]),
    ],
  ),

  series(
    "Chainsaw Man",
    ["action", "dark fantasy", "supernatural"],
    [
      c("Denji", ["Denji", "Chainsaw Man"], "protagonist", "Public Safety", [
        "chainsaws",
        "simple dreams",
        "pet devil companion",
      ]),
      c("Power", ["Power"], "chaotic ally", "Public Safety", [
        "blood powers",
        "horns",
        "wild confidence",
      ]),
      c("Aki Hayakawa", ["Aki"], "serious ally", "Public Safety", [
        "topknot hair",
        "sword use",
        "devil contracts",
      ]),
      c("Makima", ["Makima"], "manipulative superior", "Public Safety", [
        "red hair",
        "calm control",
        "intense eyes",
      ]),
      c("Pochita", ["Pochita"], "companion", "Denji's life", [
        "chainsaw nose",
        "orange body",
        "devil dog form",
      ]),
      c("Kobeni Higashiyama", ["Kobeni"], "nervous ally", "Public Safety", [
        "constant panic",
        "unexpected competence",
        "short dark hair",
      ]),
      c("Himeno", ["Himeno"], "mentor ally", "Public Safety", [
        "eye patch",
        "ghost devil contract",
        "smoking habit",
      ]),
      c("Kishibe", ["Kishibe"], "veteran hunter", "Public Safety", [
        "scarred face",
        "extreme training",
        "deadpan menace",
      ]),
      c("Beam", ["Beam"], "fiend ally", "Public Safety", [
        "shark form",
        "loyal to Denji",
        "hyperactive energy",
      ]),
      c("Angel Devil", ["Angel"], "devil ally", "Public Safety", [
        "halo imagery",
        "life-draining power",
        "soft manner",
      ]),
      c("Reze", ["Reze"], "tragic foe", "the Bomb Devil arc", [
        "bomb powers",
        "cafe girl disguise",
        "explosive romance",
      ]),
      c("Quanxi", ["Quanxi"], "legendary hunter", "foreign assassins", [
        "crossbow hybrid",
        "cold confidence",
        "blinding speed",
      ]),
      c("Katana Man", ["Katana Man"], "enemy hybrid", "yakuza conflict", [
        "katana blades",
        "revenge motive",
        "suit-wearing foe",
      ]),
      c("Fami", ["Famine Devil", "Fami"], "horseman", "the devil hierarchy", [
        "calm stare",
        "earrings",
        "famine identity",
      ]),
      c("Asa Mitaka", ["Asa"], "co-protagonist", "school life", [
        "social awkwardness",
        "war devil connection",
        "schoolgirl lead",
      ]),
      c("Yoru", ["War Devil", "Yoru"], "devil counterpart", "Asa's body", [
        "weapon creation",
        "scarred face form",
        "war identity",
      ]),
      c("Nayuta", ["Nayuta"], "child figure", "Denji's household", [
        "control devil link",
        "braided hair",
        "dogs around her",
      ]),
      c("Yoshida Hirofumi", ["Yoshida"], "mysterious ally", "Public Safety", [
        "octopus devil",
        "cool student look",
        "secretive role",
      ]),
      c("Haruka Iseumi", ["Haruka"], "club figure", "school life", [
        "chainsaw man fandom",
        "student politics",
        "self-important attitude",
      ]),
      c("Fumiko Mifune", ["Fumiko"], "bodyguard", "Public Safety", [
        "idol fan energy",
        "close protection role",
        "playful attitude",
      ]),
      c("Miri Sugo", ["Miri"], "weapon hybrid", "church conflict", [
        "sword hybrid",
        "teen recruit",
        "conflicted loyalty",
      ]),
      c("Barem Bridge", ["Barem"], "enemy hybrid", "church conflict", [
        "flamethrower imagery",
        "suit and grin",
        "manipulative menace",
      ]),
      c("Whip Hybrid", ["Whip Hybrid"], "enemy hybrid", "church conflict", [
        "whip weapon body",
        "young appearance",
        "hybrid fighter",
      ]),
      c("Spear Hybrid", ["Spear Hybrid"], "enemy hybrid", "church conflict", [
        "spear weapon body",
        "hybrid fighter",
        "church conflict",
      ]),
      c(
        "Longsword Hybrid",
        ["Longsword Hybrid"],
        "enemy hybrid",
        "church conflict",
        ["long blade body", "hybrid fighter", "church conflict"],
      ),
      c("Aldo", ["Aldo"], "assassin", "international assassins", [
        "brother team",
        "disguise tactics",
        "foreign assassin arc",
      ]),
      c("Cosmo", ["Cosmo"], "fiend", "Quanxi's group", [
        "knowledge overload power",
        "Halloween phrase",
        "fiend companion",
      ]),
      c("Violence Fiend", ["Violence"], "fiend ally", "Public Safety", [
        "masked face",
        "gentle personality",
        "immense power",
      ]),
      c("Galgali", ["Galgali"], "fiend ally", "Public Safety", [
        "masked face",
        "gentle personality",
        "violence fiend identity",
      ]),
      c(
        "Santa Claus",
        ["Santa Claus"],
        "major antagonist",
        "international assassins",
        ["doll devil power", "multiple bodies", "global chaos"],
      ),
    ],
  ),

  series(
    "Black Clover",
    ["shonen", "fantasy", "magic"],
    [
      c("Asta", ["Asta"], "protagonist", "the Black Bulls", [
        "no magic",
        "anti-magic swords",
        "constant yelling",
      ]),
      c("Yuno Grinberryall", ["Yuno"], "rival", "the Golden Dawn", [
        "wind magic",
        "quiet confidence",
        "royal origins",
      ]),
      c("Noelle Silva", ["Noelle"], "main heroine", "the Black Bulls", [
        "water magic",
        "royal family",
        "tsundere behavior",
      ]),
      c("Yami Sukehiro", ["Yami"], "captain", "the Black Bulls", [
        "dark magic",
        "katana use",
        "rough leadership",
      ]),
      c(
        "Julius Novachrono",
        ["Julius", "Wizard King"],
        "top leader",
        "the Clover Kingdom",
        ["time magic", "childlike curiosity", "the Wizard King title"],
      ),
      c("Luck Voltia", ["Luck"], "ally", "the Black Bulls", [
        "lightning magic",
        "battle mania",
        "wide smile",
      ]),
      c("Magna Swing", ["Magna"], "ally", "the Black Bulls", [
        "fire magic",
        "baseball-bat look",
        "street-punk style",
      ]),
      c("Vanessa Enoteca", ["Vanessa"], "ally", "the Black Bulls", [
        "thread magic",
        "witch ties",
        "wine-loving attitude",
      ]),
      c("Finral Roulacase", ["Finral"], "ally", "the Black Bulls", [
        "spatial magic",
        "cowardly flirting",
        "teleport support",
      ]),
      c("Gauche Adlai", ["Gauche"], "ally", "the Black Bulls", [
        "mirror magic",
        "sister obsession",
        "sharp eyes",
      ]),
      c("Charmy Pappitson", ["Charmy"], "ally", "the Black Bulls", [
        "food obsession",
        "cotton magic",
        "small size",
      ]),
      c("Grey", ["Grey"], "ally", "the Black Bulls", [
        "transformation magic",
        "shy demeanor",
        "supportive spells",
      ]),
      c("Gordon Agrippa", ["Gordon"], "ally", "the Black Bulls", [
        "poison magic",
        "soft creepy speech",
        "family curse vibe",
      ]),
      c("Henry Legolant", ["Henry"], "ally", "the Black Bulls", [
        "life-draining condition",
        "moving hideout",
        "long hair",
      ]),
      c("Nacht Faust", ["Nacht"], "vice-captain", "the Black Bulls", [
        "shadow magic",
        "devil pacts",
        "cold sarcasm",
      ]),
      c(
        "Secre Swallowtail",
        ["Secre", "Nero"],
        "mysterious ally",
        "Asta's side",
        ["bird form", "sealing magic", "ancient connection"],
      ),
      c(
        "Mimosa Vermillion",
        ["Mimosa"],
        "supportive heroine",
        "the Golden Dawn",
        ["plant magic", "healing support", "royal family"],
      ),
      c("Klaus Lunettes", ["Klaus"], "ally", "the Golden Dawn", [
        "steel magic",
        "glasses",
        "strict first impression",
      ]),
      c("Langris Vaude", ["Langris"], "rival", "the Golden Dawn", [
        "spatial magic",
        "arrogance",
        "Finral's brother",
      ]),
      c("William Vangeance", ["William"], "captain", "the Golden Dawn", [
        "world tree magic",
        "mask",
        "dual identity conflict",
      ]),
      c(
        "Fuegoleon Vermillion",
        ["Fuegoleon"],
        "captain",
        "the Crimson Lion Kings",
        ["fire magic", "royal pride", "spirit salamander"],
      ),
      c(
        "Mereoleona Vermillion",
        ["Mereoleona"],
        "legendary fighter",
        "the Vermillion family",
        ["wild fire combat", "battle frenzy", "lioness aura"],
      ),
      c("Nozel Silva", ["Nozel"], "captain", "the Silver Eagles", [
        "mercury magic",
        "cold older brother",
        "royal family",
      ]),
      c(
        "Charlotte Roselei",
        ["Charlotte"],
        "captain",
        "the Blue Rose Knights",
        ["briar magic", "masked history", "Yami crush"],
      ),
      c("Rill Boismortier", ["Rill"], "captain", "the Aqua Deer", [
        "painting magic",
        "child prodigy",
        "artistic excitement",
      ]),
      c("Dorothy Unsworth", ["Dorothy"], "captain", "the Coral Peacocks", [
        "dream world magic",
        "sleepy image",
        "pink styling",
      ]),
      c("Jack the Ripper", ["Jack"], "captain", "the Green Mantis", [
        "slash magic",
        "scarred face",
        "battle obsession",
      ]),
      c("Zora Ideale", ["Zora"], "trap specialist", "the Black Bulls", [
        "ash magic",
        "masked prankster",
        "commoner resentment",
      ]),
      c(
        "Patry",
        ["Patri", "Patry"],
        "major antagonist",
        "the Eye of the Midnight Sun",
        ["light magic", "elf grudge", "William connection"],
      ),
      c("Lucius Zogratis", ["Lucius"], "main villain", "the Zogratis family", [
        "soul manipulation",
        "holy imagery",
        "hidden identity",
      ]),
    ],
  ),

  series(
    "Haikyu!!",
    ["sports", "comedy", "shonen"],
    [
      c("Shoyo Hinata", ["Hinata"], "protagonist", "Karasuno", [
        "short height",
        "huge jumps",
        "orange hair",
      ]),
      c("Tobio Kageyama", ["Kageyama"], "rival teammate", "Karasuno", [
        "setting skill",
        "serious attitude",
        "the King of the Court",
      ]),
      c("Tooru Oikawa", ["Oikawa"], "rival setter", "Aoba Johsai", [
        "charisma",
        "powerful serves",
        "playboy energy",
      ]),
      c("Yu Nishinoya", ["Nishinoya"], "libero", "Karasuno", [
        "long blond streak",
        "fearlessness",
        "defensive specialist",
      ]),
      c("Kenma Kozume", ["Kenma"], "strategic setter", "Nekoma", [
        "bedhead hair",
        "gaming",
        "low stamina",
      ]),
      c("Tetsuro Kuroo", ["Kuroo"], "captain", "Nekoma", [
        "bedhead black hair",
        "blocking skill",
        "scheming grin",
      ]),
      c("Kotaro Bokuto", ["Bokuto"], "ace", "Fukurodani", [
        "owl imagery",
        "mood swings",
        "powerful spikes",
      ]),
      c("Keiji Akaashi", ["Akaashi"], "setter", "Fukurodani", [
        "calm demeanor",
        "supporting Bokuto",
        "dark hair",
      ]),
      c("Wakatoshi Ushijima", ["Ushijima"], "ace", "Shiratorizawa", [
        "left-handed spikes",
        "purple styling",
        "overwhelming power",
      ]),
      c("Satori Tendo", ["Tendo"], "middle blocker", "Shiratorizawa", [
        "guess blocking",
        "red hair",
        "weird grin",
      ]),
      c("Tsukishima Kei", ["Tsukishima"], "middle blocker", "Karasuno", [
        "blond hair",
        "glasses",
        "sarcastic attitude",
      ]),
      c("Tadashi Yamaguchi", ["Yamaguchi"], "pinch server", "Karasuno", [
        "freckles",
        "float serve",
        "supportive best friend",
      ]),
      c("Daichi Sawamura", ["Daichi"], "captain", "Karasuno", [
        "steady leadership",
        "defense focus",
        "serious reliability",
      ]),
      c("Koshi Sugawara", ["Sugawara"], "vice-captain", "Karasuno", [
        "silver hair",
        "kind setter",
        "bench support",
      ]),
      c("Asahi Azumane", ["Asahi"], "ace", "Karasuno", [
        "long hair",
        "power spikes",
        "gentle giant image",
      ]),
      c("Ryunosuke Tanaka", ["Tanaka"], "wing spiker", "Karasuno", [
        "shaved head",
        "loud confidence",
        "fiery loyalty",
      ]),
      c("Chikara Ennoshita", ["Ennoshita"], "supportive leader", "Karasuno", [
        "quiet responsibility",
        "bench leadership",
        "brown hair",
      ]),
      c("Kiyoko Shimizu", ["Kiyoko"], "manager", "Karasuno", [
        "silent beauty",
        "glasses later on",
        "team support",
      ]),
      c("Hitoka Yachi", ["Yachi"], "manager", "Karasuno", [
        "nervous energy",
        "blond hair",
        "design talent",
      ]),
      c("Lev Haiba", ["Lev"], "middle blocker", "Nekoma", [
        "very tall height",
        "silver hair",
        "raw talent",
      ]),
      c("Morisuke Yaku", ["Yaku"], "libero", "Nekoma", [
        "small stature",
        "sharp defense",
        "aggressive attitude",
      ]),
      c("Nobuyuki Kai", ["Kai"], "wing spiker", "Nekoma", [
        "calm reliability",
        "supportive play",
        "dark hair",
      ]),
      c("Taketora Yamamoto", ["Yamamoto"], "spiker", "Nekoma", [
        "loud confidence",
        "mohawk-like hair",
        "ace ambition",
      ]),
      c("So Inuoka", ["Inuoka"], "middle blocker", "Nekoma", [
        "speedy movement",
        "big smile",
        "friendly rivalry",
      ]),
      c("Akinori Konoha", ["Konoha"], "all-rounder", "Fukurodani", [
        "supportive veteran",
        "brown hair",
        "stable play",
      ]),
      c("Yamato Sarukui", ["Sarukui"], "wing spiker", "Fukurodani", [
        "wild hair",
        "support role",
        "solid offense",
      ]),
      c("Aran Ojiro", ["Aran"], "ace", "Inarizaki", [
        "dark curls",
        "top-three ace status",
        "steady power",
      ]),
      c("Atsumu Miya", ["Atsumu"], "setter", "Inarizaki", [
        "blond hair",
        "cocky confidence",
        "elite serving",
      ]),
      c("Osamu Miya", ["Osamu"], "spiker", "Inarizaki", [
        "twin brother",
        "cooler demeanor",
        "onigiri future",
      ]),
      c("Rintaro Suna", ["Suna"], "middle blocker", "Inarizaki", [
        "lazy expression",
        "sharp blocking",
        "social media habit",
      ]),
    ],
  ),

  series(
    "One Punch Man",
    ["action", "superhero", "comedy"],
    [
      c("Saitama", ["Caped Baldy"], "protagonist", "the Hero Association", [
        "bald head",
        "yellow suit",
        "ending fights with one punch",
      ]),
      c("Genos", ["Genos"], "disciple", "the Hero Association", [
        "cyborg body",
        "blond hair",
        "firepower",
      ]),
      c(
        "Tatsumaki",
        ["Terrible Tornado"],
        "elite hero",
        "the Hero Association",
        ["green hair", "psychic powers", "small stature"],
      ),
      c(
        "Mumen Rider",
        ["Mumen Rider"],
        "heroic underdog",
        "the Hero Association",
        ["a bicycle", "justice speeches", "ordinary power level"],
      ),
      c(
        "Garou",
        ["Garou", "Hero Hunter"],
        "rival antihero",
        "the monster conflict",
        ["silver hair later on", "martial arts", "hunting heroes"],
      ),
      c("King", ["King"], "accidental legend", "the Hero Association", [
        "scar on face",
        "intimidating reputation",
        "video games",
      ]),
      c(
        "Fubuki",
        ["Blizzard of Hell", "Fubuki"],
        "psychic hero",
        "the Hero Association",
        ["green-black bob cut", "telekinesis", "leader of a group"],
      ),
      c(
        "Bang",
        ["Silver Fang"],
        "martial arts master",
        "the Hero Association",
        ["old age", "dojo master", "water stream fist"],
      ),
      c("Bomb", ["Bomb"], "martial arts master", "Bang's dojo circle", [
        "older brother figure",
        "martial arts",
        "bald elder",
      ]),
      c(
        "Atomic Samurai",
        ["Atomic Samurai"],
        "sword hero",
        "the Hero Association",
        ["samurai image", "blinding sword speed", "elite S-class"],
      ),
      c(
        "Child Emperor",
        ["Child Emperor"],
        "genius hero",
        "the Hero Association",
        ["young age", "gadgets", "brilliant inventions"],
      ),
      c("Zombieman", ["Zombieman"], "hero", "the Hero Association", [
        "regeneration",
        "guns",
        "undead look",
      ]),
      c("Drive Knight", ["Drive Knight"], "hero", "the Hero Association", [
        "robotic body",
        "transforming weapons",
        "mysterious agenda",
      ]),
      c("Superalloy Darkshine", ["Darkshine"], "hero", "the Hero Association", [
        "shiny muscles",
        "overwhelming strength",
        "confidence issues later",
      ]),
      c("Pig God", ["Pig God"], "hero", "the Hero Association", [
        "giant appetite",
        "heroic rescues",
        "S-class body size",
      ]),
      c("Watchdog Man", ["Watchdog Man"], "hero", "the Hero Association", [
        "dog costume",
        "city guardian",
        "animal-like fighting",
      ]),
      c("Metal Bat", ["Metal Bat"], "hero", "the Hero Association", [
        "pompadour hairstyle",
        "baseball bat",
        "fighting spirit boost",
      ]),
      c(
        "Puri-Puri Prisoner",
        ["Puri-Puri Prisoner"],
        "hero",
        "the Hero Association",
        ["prison setting", "angel poses", "muscular flamboyance"],
      ),
      c("Flashy Flash", ["Flashy Flash"], "hero", "the Hero Association", [
        "ninja speed",
        "long blond hair",
        "elite movement",
      ]),
      c("Blast", ["Blast"], "top hero", "the Hero Association", [
        "rank one mystery",
        "dimensional power",
        "rare appearances",
      ]),
      c(
        "Metal Knight",
        ["Bofoi", "Metal Knight"],
        "scientist hero",
        "the Hero Association",
        ["remote machines", "robot army", "cold pragmatism"],
      ),
      c("Sweet Mask", ["Amai Mask"], "hero celebrity", "the Hero Association", [
        "idol looks",
        "strict standards",
        "dark hidden nature",
      ]),
      c("Iaian", ["Iaian"], "swordsman", "Atomic Samurai's disciples", [
        "partial arm loss",
        "serious duty",
        "samurai disciple",
      ]),
      c(
        "Spring Mustachio",
        ["Spring Mustachio"],
        "hero",
        "the Hero Association",
        ["rapier style", "mustache", "fencer image"],
      ),
      c("Tanktop Master", ["Tanktop Master"], "hero", "the Hero Association", [
        "tank top obsession",
        "massive strength",
        "heroic leadership",
      ]),
      c(
        "Sonic",
        ["Speed-o'-Sound Sonic", "Sonic"],
        "rival ninja",
        "the ninja world",
        ["purple scarf", "ninja speed", "obsession with Saitama"],
      ),
      c(
        "Mosquito Girl",
        ["Mosquito Girl"],
        "monster",
        "the House of Evolution",
        ["insect theme", "blood sucking", "winged body"],
      ),
      c("Boros", ["Boros"], "major villain", "space conquerors", [
        "single eye",
        "alien armor",
        "planet-level threat",
      ]),
      c("Orochi", ["Orochi"], "monster king", "the Monster Association", [
        "dragon-like body",
        "monster ruler",
        "massive power",
      ]),
      c("Psykos", ["Psykos"], "villain mastermind", "the Monster Association", [
        "glasses",
        "psychic powers",
        "monster schemes",
      ]),
    ],
  ),

  series(
    "Tokyo Revengers",
    ["action", "school", "time travel"],
    [
      c(
        "Takemichi Hanagaki",
        ["Takemichi"],
        "protagonist",
        "Tokyo Manji Gang",
        ["time leaps", "never giving up", "blond delinquent era"],
      ),
      c("Manjiro Sano", ["Mikey"], "charismatic leader", "Tokyo Manji Gang", [
        "enormous kick power",
        "short blond hair",
        "gang leadership",
      ]),
      c("Ken Ryuguji", ["Draken"], "vice leader", "Tokyo Manji Gang", [
        "dragon tattoo",
        "tall build",
        "shaved sides hairstyle",
      ]),
      c("Chifuyu Matsuno", ["Chifuyu"], "loyal ally", "Tokyo Manji Gang", [
        "black-and-blond hair",
        "calm support",
        "deep loyalty",
      ]),
      c("Keisuke Baji", ["Baji"], "wild captain", "Tokyo Manji Gang", [
        "long dark hair",
        "feral fighting style",
        "deep loyalty",
      ]),
      c("Takashi Mitsuya", ["Mitsuya"], "captain", "Tokyo Manji Gang", [
        "fashion talent",
        "older-brother vibe",
        "lavender hair",
      ]),
      c("Nahoya Kawata", ["Smiley"], "captain", "Tokyo Manji Gang", [
        "constant smile",
        "blue hair tint",
        "fierce fighting",
      ]),
      c("Souya Kawata", ["Angry"], "captain", "Tokyo Manji Gang", [
        "crying becomes power",
        "blue hair",
        "twin bond",
      ]),
      c(
        "Haruki Hayashida",
        ["Pah-chin"],
        "founding member",
        "Tokyo Manji Gang",
        ["shaved head", "big build", "hot-headed loyalty"],
      ),
      c("Ryohei Hayashi", ["Peh-yan"], "member", "Tokyo Manji Gang", [
        "blond hair",
        "big build",
        "close to Pah-chin",
      ]),
      c("Tetta Kisaki", ["Kisaki"], "mastermind villain", "Tokyo Manji Gang", [
        "glasses",
        "cold scheming",
        "timeline manipulation through plans",
      ]),
      c("Shuji Hanma", ["Hanma"], "chaotic villain", "Valhalla", [
        "hand tattoos",
        "tall build",
        "restless grin",
      ]),
      c("Kazutora Hanemiya", ["Kazutora"], "tragic antagonist", "Valhalla", [
        "tiger imagery",
        "blond-black hair",
        "broken mindset",
      ]),
      c("Atsushi Sendo", ["Akkun"], "old friend", "Takemichi's circle", [
        "pompadour style",
        "deep guilt",
        "childhood friend",
      ]),
      c("Naoto Tachibana", ["Naoto"], "detective ally", "the police", [
        "time-leap trigger bond",
        "serious demeanor",
        "protective brother",
      ]),
      c("Hinata Tachibana", ["Hina"], "main heroine", "Takemichi's life", [
        "pink-toned hair",
        "kindness",
        "central motivation",
      ]),
      c("Yuzuha Shiba", ["Yuzuha"], "strong-willed ally", "the Shiba family", [
        "blond hair",
        "protective sister",
        "Christmas conflict",
      ]),
      c("Taiju Shiba", ["Taiju"], "major antagonist", "Black Dragon", [
        "huge size",
        "religious imagery",
        "brutal strength",
      ]),
      c("Hakkai Shiba", ["Hakkai"], "ally", "Tokyo Manji Gang", [
        "blue hair",
        "quiet strength",
        "family trauma",
      ]),
      c("Seishu Inui", ["Inupi"], "ally", "Black Dragon", [
        "scar around eye",
        "white hair",
        "devotion to a dream",
      ]),
      c(
        "Hajime Kokonoi",
        ["Kokonoi", "Koko"],
        "ally-turned-rival",
        "Black Dragon",
        ["money obsession", "slick blond-black hair", "calculating mind"],
      ),
      c("Izana Kurokawa", ["Izana"], "major antagonist", "Tenjiku", [
        "pale hair",
        "cold emptiness",
        "Mikey connection",
      ]),
      c("Kakucho", ["Kakucho"], "loyal fighter", "Tenjiku", [
        "facial scar",
        "red-black hair",
        "absolute loyalty",
      ]),
      c("Ran Haitani", ["Ran"], "villain", "the Haitani brothers", [
        "braided hair",
        "nightclub vibe",
        "baton violence",
      ]),
      c("Rindo Haitani", ["Rindo"], "villain", "the Haitani brothers", [
        "striped hair",
        "cold expression",
        "joint attacks",
      ]),
      c("Haruchiyo Sanzu", ["Sanzu"], "dangerous enforcer", "Bonten", [
        "pink hair",
        "mouth scars",
        "obsessive devotion",
      ]),
      c(
        "Manjiro Sano (Bonten)",
        ["Bonten Mikey"],
        "dark future leader",
        "Bonten",
        ["black suit aura", "emotionless future", "crime syndicate ruler"],
      ),
      c("Senju Kawaragi", ["Senju"], "leader", "Brahman", [
        "pink hair",
        "elite fighter",
        "small but powerful",
      ]),
      c("Wakasa Imaushi", ["Wakasa"], "legendary fighter", "Brahman", [
        "light hair",
        "older generation fighter",
        "cool demeanor",
      ]),
      c("Keizo Arashi", ["Benkei"], "legendary fighter", "Brahman", [
        "huge build",
        "older generation fighter",
        "heavy strength",
      ]),
    ],
  ),

  series(
    "Kaiju No. 8",
    ["action", "science fiction", "military"],
    [
      c("Kafka Hibino", ["Kafka"], "protagonist", "the Defense Force", [
        "transforms into a kaiju",
        "older underdog status",
        "clean-up crew past",
      ]),
      c("Mina Ashiro", ["Mina"], "elite commander", "the Defense Force", [
        "long dark hair",
        "massive firearm use",
        "cool authority",
      ]),
      c("Reno Ichikawa", ["Reno"], "younger ally", "the Defense Force", [
        "serious rookie",
        "blond hair",
        "respect for Kafka",
      ]),
      c(
        "Kikoru Shinomiya",
        ["Kikoru"],
        "genius rival ally",
        "the Defense Force",
        ["blond twintails", "elite upbringing", "combat talent"],
      ),
      c("Soshiro Hoshina", ["Hoshina"], "vice captain", "the Defense Force", [
        "sword-based combat",
        "smiling confidence",
        "Osaka-style speech",
      ]),
      c("Aoi Kaguragi", ["Aoi"], "officer", "the Defense Force", [
        "serious demeanor",
        "team-oriented combat",
        "Third Division member",
      ]),
      c("Iharu Furuhashi", ["Iharu"], "rival ally", "the Defense Force", [
        "red hair",
        "hot-headed attitude",
        "firearm user",
      ]),
      c("Haruichi Izumo", ["Izumo"], "officer", "the Defense Force", [
        "well-groomed look",
        "calm competence",
        "Third Division member",
      ]),
      c(
        "Konomi Okonogi",
        ["Okonogi"],
        "operations leader",
        "the Defense Force",
        ["support role", "glasses", "logistics specialist"],
      ),
      c("Gen Narumi", ["Narumi"], "captain", "the First Division", [
        "sleepy gamer vibe",
        "overwhelming power",
        "captain status",
      ]),
      c("Isao Shinomiya", ["Isao"], "commander", "the Defense Force", [
        "stern authority",
        "Kikoru's father",
        "weaponized kaiju power",
      ]),
      c(
        "Hikari Shinomiya",
        ["Hikari"],
        "legendary captain",
        "the Defense Force",
        ["former Second Division captain", "heroic legacy", "deceased legend"],
      ),
      c("Eiji Hasegawa", ["Hasegawa"], "vice-captain", "the First Division", [
        "supporting command",
        "First Division role",
        "calm veteran",
      ]),
      c(
        "Rin Shinonome",
        ["Shinonome"],
        "platoon leader",
        "the First Division",
        ["leadership role", "combat officer", "First Division member"],
      ),
      c(
        "Kota Tachibana",
        ["Tachibana"],
        "platoon leader",
        "the First Division",
        ["leadership role", "combat officer", "First Division member"],
      ),
      c("Akira Kurusu", ["Kurusu"], "operations leader", "the First Division", [
        "support command",
        "operations role",
        "First Division member",
      ]),
      c("Jura Igarashi", ["Jura"], "captain", "the Second Division", [
        "captain status",
        "Defense Force authority",
        "Second Division leader",
      ]),
      c("Ebina", ["Ebina"], "platoon leader", "the Third Division", [
        "team leadership",
        "Third Division member",
        "combat role",
      ]),
      c("Ryo Ikaruga", ["Ikaruga"], "platoon leader", "the Third Division", [
        "team leadership",
        "Third Division member",
        "combat role",
      ]),
      c("Itakura", ["Itakura"], "platoon leader", "the Third Division", [
        "team leadership",
        "Third Division member",
        "combat role",
      ]),
      c(
        "Tae Nakanoshima",
        ["Nakanoshima"],
        "platoon leader",
        "the Third Division",
        ["team leadership", "Third Division member", "combat role"],
      ),
      c("Takao", ["Takao"], "platoon leader", "the Third Division", [
        "team leadership",
        "Third Division member",
        "combat role",
      ]),
      c("Akari Minase", ["Minase"], "officer", "the Defense Force", [
        "Third Division role",
        "supportive combat",
        "young officer",
      ]),
      c("Hakua Igarashi", ["Hakua"], "officer", "the Defense Force", [
        "Third Division role",
        "combat officer",
        "rising talent",
      ]),
      c("Toma Takanashi", ["Takanashi"], "officer", "the Defense Force", [
        "Third Division role",
        "combat officer",
        "young talent",
      ]),
      c("Bakko", ["Bakko"], "companion", "Mina's side", [
        "animal companion",
        "Mina connection",
        "support presence",
      ]),
      c(
        "Kaiju No. 9",
        ["No. 9", "Kaiju No. 9"],
        "main villain",
        "the kaiju threat",
        ["shapeshifting intellect", "human imitation", "major numbered kaiju"],
      ),
      c(
        "Kaiju No. 10",
        ["No. 10", "Kaiju No. 10"],
        "kaiju weapon core",
        "Hoshina's gear",
        ["numbered kaiju", "combat core", "weaponized link"],
      ),
      c(
        "Kaiju No. 11",
        ["No. 11", "Kaiju No. 11"],
        "numbered kaiju",
        "the kaiju threat",
        ["numbered kaiju", "major battlefield threat", "active kaiju"],
      ),
      c(
        "Kaiju No. 12",
        ["No. 12", "Kaiju No. 12"],
        "numbered kaiju",
        "the kaiju threat",
        ["numbered kaiju", "major battlefield threat", "active kaiju"],
      ),
    ],
  ),

  series(
    "Dandadan",
    ["supernatural", "comedy", "action"],
    [
      c("Momo Ayase", ["Momo"], "main heroine", "the occult chaos", [
        "psychic powers",
        "gyaru styling",
        "believes in ghosts first",
      ]),
      c("Ken Takakura", ["Okarun"], "male lead", "the occult chaos", [
        "alien obsession",
        "glasses",
        "turbo-charged curse problems",
      ]),
      c("Seiko Ayase", ["Seiko"], "grandmother mentor", "Momo's family", [
        "spiritual expertise",
        "confident style",
        "combat readiness",
      ]),
      c("Aira Shiratori", ["Aira"], "rival ally", "the occult chaos", [
        "school beauty image",
        "spiritual weirdness",
        "dramatic personality",
      ]),
      c("Jiji", ["Jiji"], "childhood friend", "the occult chaos", [
        "energetic personality",
        "handsome image",
        "dangerous possession issue",
      ]),
      c("Kinta Sakata", ["Kinta"], "comic ally", "the occult chaos", [
        "robot obsession",
        "round glasses",
        "delusional confidence",
      ]),
      c("Rin Sawaki", ["Rin"], "ally", "the occult chaos", [
        "school friend",
        "occult involvement",
        "support role",
      ]),
      c("Unji Zuma", ["Zuma"], "ally", "the occult chaos", [
        "fighter image",
        "later major ally",
        "strong presence",
      ]),
      c("Koki Yukishiro", ["Koki"], "ally", "the occult chaos", [
        "student role",
        "later involvement",
        "sharp design",
      ]),
      c("Miko", ["Miko"], "school friend", "Momo's circle", [
        "relationship gossip",
        "supportive classmate",
        "human side cast",
      ]),
      c("Kei", ["Kei"], "school friend", "Momo's circle", [
        "human side cast",
        "supportive classmate",
        "school life",
      ]),
      c("Manjiro", ["Manjiro"], "spirit medium", "Seiko's circle", [
        "spiritual training",
        "helper role",
        "occult specialist",
      ]),
      c("Turbo Granny", ["Turbo Granny"], "urban legend", "the yokai side", [
        "speed curse",
        "cat-like vessel later",
        "iconic early threat",
      ]),
      c("Acrobatic Silky", ["Acrobatic Silky"], "spirit", "the yokai side", [
        "tragic backstory",
        "gymnastic ghost",
        "emotional arc",
      ]),
      c("Evil Eye", ["Evil Eye"], "spirit", "the yokai side", [
        "possessing curse",
        "host conflict",
        "dangerous eye theme",
      ]),
      c("Reiko Kashima", ["Reiko Kashima"], "urban legend", "the yokai side", [
        "creepy woman ghost",
        "urban legend status",
        "major threat",
      ]),
      c("Mai Kawabanga", ["Mai"], "spirit", "the yokai side", [
        "yokai presence",
        "side threat",
        "supernatural conflict",
      ]),
      c(
        "Fairy-Tale Card",
        ["Fairy-Tale Card"],
        "supernatural foe",
        "the yokai side",
        ["card-themed threat", "strange powers", "later arc enemy"],
      ),
      c("Serpo", ["Serpo"], "alien foe", "the alien side", [
        "gray alien look",
        "abduction theme",
        "recurring threat",
      ]),
      c("Mantisian", ["Mantisian"], "alien foe", "the alien side", [
        "mantis-like shape",
        "alien combat",
        "recurring threat",
      ]),
      c("Chiquitita", ["Chiquitita"], "alien", "the alien side", [
        "small alien form",
        "space-related chaos",
        "odd design",
      ]),
      c("Bamora", ["Bamora"], "alien ally", "the alien side", [
        "kaiju-scale suit themes",
        "space conflict",
        "major later arc",
      ]),
      c("Nessie", ["Nessie"], "UMA", "the supernatural side", [
        "cryptid name",
        "absurd battle presence",
        "non-human threat",
      ]),
      c("Taro", ["Taro"], "odd supernatural figure", "the bizarre side", [
        "weird body horror",
        "strange arc involvement",
        "non-human entity",
      ]),
      c("Hana", ["Hana"], "odd supernatural figure", "the bizarre side", [
        "non-human entity",
        "weird arc involvement",
        "supernatural conflict",
      ]),
      c(
        "Count Saint-Germain",
        ["Count Saint-Germain"],
        "mysterious figure",
        "the human side",
        ["occult aura", "elegant menace", "later major mystery"],
      ),
      c("Vlad", ["Vlad"], "fighter", "the Black Paladins", [
        "combat role",
        "group affiliation",
        "later conflict",
      ]),
      c("Red Baron", ["Red Baron"], "fighter", "the Black Paladins", [
        "combat role",
        "group affiliation",
        "later conflict",
      ]),
      c("Shinobi", ["Shinobi"], "fighter", "the Black Paladins", [
        "ninja-like image",
        "group affiliation",
        "later conflict",
      ]),
      c("Rokuro Serpo", ["Rokuro"], "alien figure", "the alien side", [
        "Serpo connection",
        "later involvement",
        "space conflict",
      ]),
    ],
  ),

  series(
    "Wind Breaker",
    ["action", "school", "delinquent"],
    [
      c("Haruka Sakura", ["Sakura"], "protagonist", "Bofurin", [
        "split black-and-white hair",
        "social awkwardness",
        "strong fighting",
      ]),
      c("Hajime Umemiya", ["Umemiya"], "leader", "Bofurin", [
        "charisma",
        "gardening",
        "top protector status",
      ]),
      c("Hayato Suo", ["Suo"], "calm fighter", "Bofurin", [
        "an eyepatch",
        "soft voice",
        "precise fighting",
      ]),
      c("Akihiko Nirei", ["Nirei"], "supportive friend", "Bofurin", [
        "glasses",
        "note-taking",
        "admiration for stronger fighters",
      ]),
      c("Toma Hiragi", ["Hiragi"], "senior fighter", "Bofurin", [
        "tall presence",
        "reliable leadership",
        "serious demeanor",
      ]),
      c("Kyotaro Sugishita", ["Sugishita"], "intense ally", "Bofurin", [
        "loyal devotion",
        "heavy demeanor",
        "strong combat style",
      ]),
      c("Mitsuki Kiryu", ["Kiryu"], "ally", "Bofurin", [
        "stylish appearance",
        "composed attitude",
        "supportive role",
      ]),
      c(
        "Kotoha Tachibana",
        ["Kotoha"],
        "supporting heroine",
        "Bofurin's town",
        ["cafe role", "warm support", "brown hair"],
      ),
      c("Jo Togame", ["Togame"], "rival leader", "Shishitoren", [
        "long hair",
        "heavy strength",
        "older-brother feel",
      ]),
      c("Ren Kaji", ["Kaji"], "fighter", "Bofurin", [
        "stoic expression",
        "combat specialist",
        "supportive senior",
      ]),
      c(
        "Choji Tomiyama",
        ["Tomiyama", "Choji"],
        "rival leader",
        "Shishitoren",
        ["small stature", "chaotic authority", "dangerous charisma"],
      ),
      c("Tasuku Tsubakino", ["Tsubakino"], "senior fighter", "Bofurin", [
        "confident presence",
        "senior authority",
        "elegant style",
      ]),
      c("Shizuka Narita", ["Narita"], "supporting character", "the town", [
        "quiet presence",
        "support role",
        "female side character",
      ]),
      c("Uryu Sakaki", ["Uryu"], "fighter", "the Sakaki brothers", [
        "twin pairing",
        "combat role",
        "Bofurin conflict",
      ]),
      c("Seiryu Sakaki", ["Seiryu"], "fighter", "the Sakaki brothers", [
        "twin pairing",
        "combat role",
        "Bofurin conflict",
      ]),
      c("Kanji Nakamura", ["Nakamura"], "fighter", "Bofurin", [
        "large build",
        "combat role",
        "senior presence",
      ]),
      c("Ritsu Otoha", ["Otoha"], "fighter", "Bofurin", [
        "musical surname",
        "support role",
        "street-fight setting",
      ]),
      c("Takumi Momose", ["Momose"], "fighter", "Bofurin", [
        "short stature",
        "combat role",
        "supportive member",
      ]),
      c("Akihito Miyoshi", ["Miyoshi"], "fighter", "Bofurin", [
        "combat role",
        "school gang setting",
        "team member",
      ]),
      c("Saku Mizuki", ["Mizuki"], "fighter", "Bofurin", [
        "older member",
        "combat role",
        "serious tone",
      ]),
      c("Kota Sako", ["Sako"], "fighter", "Bofurin", [
        "supportive role",
        "combat member",
        "school gang setting",
      ]),
      c("Shuhei Suzuri", ["Suzuri"], "fighter", "Bofurin", [
        "combat role",
        "school gang setting",
        "team member",
      ]),
      c("Taiga Tsugeura", ["Tsugeura"], "fighter", "Bofurin", [
        "big build",
        "combat role",
        "team member",
      ]),
      c("Yuto Kusumi", ["Kusumi"], "fighter", "Bofurin", [
        "quiet support",
        "combat role",
        "team member",
      ]),
      c("Taishi Mogami", ["Mogami"], "fighter", "Bofurin", [
        "combat role",
        "school gang setting",
        "team member",
      ]),
      c("Shingo Natori", ["Natori"], "fighter", "Bofurin", [
        "combat role",
        "school gang setting",
        "team member",
      ]),
      c("Atsushi Nagato", ["Nagato"], "fighter", "Bofurin", [
        "combat role",
        "school gang setting",
        "team member",
      ]),
      c("Minoru Kanuma", ["Kanuma"], "fighter", "Bofurin", [
        "combat role",
        "school gang setting",
        "team member",
      ]),
      c("Yuri Kakiuchi", ["Kakiuchi"], "fighter", "Bofurin", [
        "combat role",
        "school gang setting",
        "team member",
      ]),
      c("Yukinari Arima", ["Arima"], "fighter", "Bofurin", [
        "tall frame",
        "combat role",
        "team member",
      ]),
    ],
  ),

  series(
    "VALORANT",
    ["tactical fps", "hero shooter", "competitive"],
    [
      c("Astra", ["Astra"], "controller", "VALORANT Protocol", [
        "cosmic powers",
        "purple-gold styling",
        "star placement",
      ]),
      c("Breach", ["Breach"], "initiator", "VALORANT Protocol", [
        "mechanical arms",
        "stun abilities",
        "heavy aggression",
      ]),
      c("Brimstone", ["Brimstone"], "controller", "VALORANT Protocol", [
        "orbital utility",
        "beard and cap",
        "commander vibe",
      ]),
      c("Chamber", ["Chamber"], "sentinel", "VALORANT Protocol", [
        "French style",
        "sniper focus",
        "gold-accented fashion",
      ]),
      c("Clove", ["Clove"], "controller", "VALORANT Protocol", [
        "Scottish styling",
        "smokes after death",
        "purple themes",
      ]),
      c("Cypher", ["Cypher"], "sentinel", "VALORANT Protocol", [
        "hat and covered face",
        "surveillance tools",
        "trap setups",
      ]),
      c("Deadlock", ["Deadlock"], "sentinel", "VALORANT Protocol", [
        "Norwegian operator",
        "barrier utility",
        "hard-lock captures",
      ]),
      c("Fade", ["Fade"], "initiator", "VALORANT Protocol", [
        "nightmare motifs",
        "dark styling",
        "tracking enemies",
      ]),
      c("Gekko", ["Gekko"], "initiator", "VALORANT Protocol", [
        "creature companions",
        "green hair",
        "Los Angeles vibe",
      ]),
      c("Harbor", ["Harbor"], "controller", "VALORANT Protocol", [
        "water-based walls",
        "Indian origin",
        "bracelet artifact",
      ]),
      c("Iso", ["Iso"], "duelist", "VALORANT Protocol", [
        "purple energy",
        "duel-focused style",
        "shield gain",
      ]),
      c("Jett", ["Jett"], "duelist", "VALORANT Protocol", [
        "wind mobility",
        "white hair",
        "knife ultimate",
      ]),
      c("KAY/O", ["KAY/O"], "initiator", "VALORANT Protocol", [
        "robot body",
        "suppression blade",
        "anti-radiant design",
      ]),
      c("Killjoy", ["Killjoy"], "sentinel", "VALORANT Protocol", [
        "German engineer",
        "turret and gadgets",
        "yellow jacket",
      ]),
      c("Neon", ["Neon"], "duelist", "VALORANT Protocol", [
        "electric speed",
        "blue-yellow styling",
        "Filipino origin",
      ]),
      c("Omen", ["Omen"], "controller", "VALORANT Protocol", [
        "shadow teleportation",
        "hooded design",
        "mysterious identity",
      ]),
      c("Phoenix", ["Phoenix"], "duelist", "VALORANT Protocol", [
        "fire powers",
        "British swagger",
        "self-healing flames",
      ]),
      c("Raze", ["Raze"], "duelist", "VALORANT Protocol", [
        "explosives",
        "Brazilian style",
        "paint-shell chaos",
      ]),
      c("Reyna", ["Reyna"], "duelist", "VALORANT Protocol", [
        "soul energy",
        "purple glow",
        "aggressive self-sustain",
      ]),
      c("Sage", ["Sage"], "sentinel", "VALORANT Protocol", [
        "healing",
        "wall creation",
        "Chinese origin",
      ]),
      c("Skye", ["Skye"], "initiator", "VALORANT Protocol", [
        "animal summons",
        "green styling",
        "Australian origin",
      ]),
      c("Sova", ["Sova"], "initiator", "VALORANT Protocol", [
        "recon arrows",
        "blond hair",
        "Russian hunter vibe",
      ]),
      c("Tejo", ["Tejo"], "initiator", "VALORANT Protocol", [
        "precision offense",
        "modern tactical styling",
        "setup disruption",
      ]),
      c("Viper", ["Viper"], "controller", "VALORANT Protocol", [
        "poison gas",
        "green-black suit",
        "scientist vibe",
      ]),
      c("Vyse", ["Vyse"], "sentinel", "VALORANT Protocol", [
        "trap utility",
        "rose-metal styling",
        "space control",
      ]),
      c("Waylay", ["Waylay"], "agent", "VALORANT Protocol", [
        "official roster appearance",
        "protocol styling",
        "competitive shooter identity",
      ]),
      c("Yoru", ["Yoru"], "duelist", "VALORANT Protocol", [
        "blue styling",
        "teleport tricks",
        "Japanese origin",
      ]),
    ],
  ),

  // Genshin pack kept broad and current for your mixed anime + game build.
  series(
    "Genshin Impact",
    ["fantasy", "adventure", "rpg"],
    [
      c(
        "Traveler",
        ["Aether", "Lumine", "The Traveler"],
        "protagonist",
        "Teyvat",
        [
          "element switching",
          "searching for a lost sibling",
          "gold-themed design",
        ],
      ),
      c("Paimon", ["Paimon"], "guide companion", "the Traveler", [
        "floating companion",
        "small size",
        "constant commentary",
      ]),
      c("Venti", ["Venti", "Barbatos"], "archon", "Mondstadt", [
        "anemo powers",
        "bard persona",
        "green styling",
      ]),
      c("Zhongli", ["Zhongli", "Morax"], "archon", "Liyue", [
        "geo powers",
        "contract themes",
        "calm consultant look",
      ]),
      c("Raiden Shogun", ["Raiden", "Ei"], "archon", "Inazuma", [
        "electro powers",
        "purple styling",
        "eternity ideology",
      ]),
      c("Nahida", ["Nahida"], "archon", "Sumeru", [
        "dendro powers",
        "small stature",
        "wisdom themes",
      ]),
      c("Furina", ["Furina"], "archon figure", "Fontaine", [
        "hydro themes",
        "theatrical personality",
        "blue-white styling",
      ]),
      c("Neuvillette", ["Neuvillette"], "chief justice", "Fontaine", [
        "hydro themes",
        "judicial authority",
        "long-haired calm design",
      ]),
      c(
        "Arlecchino",
        ["Arlecchino", "The Knave"],
        "fatui harbinger",
        "the Fatui",
        ["red-black styling", "cold authority", "harbinger rank"],
      ),
      c("Xiao", ["Xiao"], "adeptus", "Liyue", [
        "anemo powers",
        "masked burst state",
        "yaksha background",
      ]),
      c("Hu Tao", ["Hu Tao"], "funeral director", "Liyue", [
        "pyro themes",
        "ghostly motifs",
        "playful dark humor",
      ]),
      c("Ganyu", ["Ganyu"], "secretary adeptus", "Liyue", [
        "cryo powers",
        "horn-like design",
        "overworked personality",
      ]),
      c("Keqing", ["Keqing"], "qixing member", "Liyue", [
        "electro powers",
        "purple twin-tails",
        "hard-working attitude",
      ]),
      c("Yelan", ["Yelan"], "mysterious operative", "Liyue", [
        "hydro themes",
        "gambling vibes",
        "blue-black styling",
      ]),
      c("Shenhe", ["Shenhe"], "adeptal disciple", "Liyue", [
        "cryo themes",
        "white hair",
        "red cords",
      ]),
      c("Kamisato Ayaka", ["Ayaka"], "noble heroine", "Inazuma", [
        "cryo swordplay",
        "blue kimono styling",
        "graceful etiquette",
      ]),
      c("Kamisato Ayato", ["Ayato"], "clan leader", "Inazuma", [
        "hydro swordplay",
        "refined authority",
        "light blue hair",
      ]),
      c("Kaedehara Kazuha", ["Kazuha"], "wandering swordsman", "Inazuma", [
        "anemo powers",
        "maple leaf motifs",
        "calm poetic tone",
      ]),
      c("Yoimiya", ["Yoimiya"], "fireworks maker", "Inazuma", [
        "pyro bow use",
        "festival energy",
        "blond ponytail",
      ]),
      c("Yae Miko", ["Yae Miko"], "guuji", "Inazuma", [
        "electro powers",
        "fox motifs",
        "pink hair",
      ]),
      c("Tartaglia", ["Childe"], "fatui harbinger", "the Fatui", [
        "hydro combat",
        "dual stance style",
        "harbinger rank",
      ]),
      c("Diluc", ["Diluc"], "dark hero noble", "Mondstadt", [
        "pyro claymore use",
        "red hair",
        "winery background",
      ]),
      c("Jean", ["Jean"], "acting grand master", "Mondstadt", [
        "anemo powers",
        "blond hair",
        "knightly duty",
      ]),
      c("Kaeya", ["Kaeya"], "cavalry captain", "Mondstadt", [
        "eye patch",
        "cryo sword use",
        "smooth confidence",
      ]),
      c("Lisa", ["Lisa"], "librarian mage", "Mondstadt", [
        "electro powers",
        "witch-like hat",
        "lazy genius",
      ]),
      c("Bennett", ["Bennett"], "unlucky adventurer", "Mondstadt", [
        "pyro sword use",
        "bandaged design",
        "bad luck",
      ]),
      c("Fischl", ["Fischl"], "eccentric investigator", "Mondstadt", [
        "electro bow use",
        "fantasy speech",
        "raven companion",
      ]),
      c("Albedo", ["Albedo"], "chief alchemist", "Mondstadt", [
        "geo powers",
        "alchemy",
        "calm blond design",
      ]),
      c("Mona", ["Mona"], "astrologer", "Mondstadt", [
        "hydro powers",
        "star motifs",
        "fortune-reading theme",
      ]),
      c("Klee", ["Klee"], "spark knight", "Mondstadt", [
        "explosives",
        "tiny size",
        "red hat",
      ]),
      c("Eula", ["Eula"], "captain", "Mondstadt", [
        "cryo claymore",
        "vengeance line",
        "blue-white styling",
      ]),
      c("Rosaria", ["Rosaria"], "church sister", "Mondstadt", [
        "cryo polearm",
        "gothic style",
        "night operations",
      ]),
      c("Noelle", ["Noelle"], "maid knight", "Mondstadt", [
        "geo defense",
        "maid armor",
        "service and strength",
      ]),
      c("Sucrose", ["Sucrose"], "alchemist assistant", "Mondstadt", [
        "anemo catalyst",
        "shy personality",
        "bio-alchemy",
      ]),
      c("Amber", ["Amber"], "outrider", "Mondstadt", [
        "pyro bow",
        "bunny bomb",
        "glider enthusiasm",
      ]),
      c("Barbara", ["Barbara"], "idol healer", "Mondstadt", [
        "hydro healing",
        "church singer",
        "blond twintails",
      ]),
      c("Razor", ["Razor"], "wolf boy", "Mondstadt", [
        "electro claymore",
        "raised by wolves",
        "wild speech",
      ]),
      c("Diona", ["Diona"], "bartender", "Mondstadt", [
        "cryo bow",
        "cat traits",
        "drink-related grudge",
      ]),
      c("Mika", ["Mika"], "surveyor", "Mondstadt", [
        "cryo polearm",
        "maps",
        "support role",
      ]),
      c("Nilou", ["Nilou"], "dancer", "Sumeru", [
        "hydro dance combat",
        "red hair",
        "theater performance",
      ]),
      c("Alhaitham", ["Alhaitham"], "scholar fighter", "Sumeru", [
        "dendro swordplay",
        "bookish strategist",
        "green motifs",
      ]),
      c("Kaveh", ["Kaveh"], "architect", "Sumeru", [
        "dendro claymore",
        "artistic temperament",
        "blond hair",
      ]),
      c("Cyno", ["Cyno"], "general mahamatra", "Sumeru", [
        "electro polearm",
        "judgment theme",
        "desert styling",
      ]),
      c("Tighnari", ["Tighnari"], "forest watcher", "Sumeru", [
        "dendro bow",
        "large ears",
        "forest ranger",
      ]),
      c("Collei", ["Collei"], "forest ranger trainee", "Sumeru", [
        "dendro bow",
        "green hair",
        "forest patrol",
      ]),
      c("Dehya", ["Dehya"], "mercenary", "Sumeru", [
        "pyro claymore",
        "desert fighter",
        "lioness image",
      ]),
      c("Candace", ["Candace"], "guardian", "Sumeru", [
        "hydro polearm",
        "desert protector",
        "shield style",
      ]),
      c("Layla", ["Layla"], "student astrologer", "Sumeru", [
        "cryo sword",
        "sleepy scholar",
        "starry styling",
      ]),
      c("Faruzan", ["Faruzan"], "scholar", "Sumeru", [
        "anemo bow",
        "ancient academic",
        "confident attitude",
      ]),
      c("Baizhu", ["Baizhu"], "doctor", "Liyue", [
        "dendro catalyst",
        "snake companion",
        "pharmacy role",
      ]),
      c("Yanfei", ["Yanfei"], "legal adviser", "Liyue", [
        "pyro catalyst",
        "law motif",
        "half-adeptus",
      ]),
      c("Xingqiu", ["Xingqiu"], "bookish swordsman", "Liyue", [
        "hydro swords",
        "noble family",
        "supportive rain attacks",
      ]),
      c("Xiangling", ["Xiangling"], "chef", "Liyue", [
        "pyro cooking",
        "guoba companion",
        "chef energy",
      ]),
      c("Ningguang", ["Ningguang"], "qixing leader", "Liyue", [
        "geo catalyst",
        "wealth and jade chamber",
        "white-gold styling",
      ]),
      c("Beidou", ["Beidou"], "captain", "Liyue", [
        "electro claymore",
        "pirate captain vibe",
        "parry mechanics",
      ]),
      c("Xianyun", ["Xianyun", "Cloud Retainer"], "adeptus inventor", "Liyue", [
        "anemo catalyst",
        "crane adeptus identity",
        "airborne support",
      ]),
      c("Gaming", ["Gaming"], "performer", "Liyue", [
        "pyro claymore",
        "lion dance imagery",
        "playful attitude",
      ]),
      c("Yaoyao", ["Yaoyao"], "young disciple", "Liyue", [
        "dendro polearm",
        "rabbit companion",
        "small size",
      ]),
      c("Yun Jin", ["Yun Jin"], "opera performer", "Liyue", [
        "geo polearm",
        "stage performance",
        "traditional styling",
      ]),
      c("Kuki Shinobu", ["Shinobu"], "deputy leader", "Inazuma", [
        "electro sword",
        "masked ninja vibe",
        "gang support",
      ]),
      c("Gorou", ["Gorou"], "general", "Inazuma", [
        "geo bow",
        "canine traits",
        "resistance leader",
      ]),
      c("Sangonomiya Kokomi", ["Kokomi"], "divine priestess", "Inazuma", [
        "hydro strategy",
        "blue-pink styling",
        "island leadership",
      ]),
      c("Thoma", ["Thoma"], "housekeeper", "Inazuma", [
        "pyro polearm",
        "protective shields",
        "blond hair",
      ]),
      c("Kirara", ["Kirara"], "courier", "Inazuma", [
        "dendro sword",
        "cat courier theme",
        "box delivery",
      ]),
      c("Sayu", ["Sayu"], "sleepy ninja", "Inazuma", [
        "anemo claymore",
        "rolling movement",
        "sleepy personality",
      ]),
      c("Yoimiya", ["Yoimiya"], "fireworks maker", "Inazuma", [
        "pyro bow",
        "festival energy",
        "bright personality",
      ]),
      c("Chiori", ["Chiori"], "designer", "Inazuma", [
        "geo sword",
        "fashion creator",
        "tailor identity",
      ]),
      c("Charlotte", ["Charlotte"], "reporter", "Fontaine", [
        "cryo catalyst",
        "journalist theme",
        "camera imagery",
      ]),
      c("Wriothesley", ["Wriothesley"], "administrator", "Fontaine", [
        "cryo catalyst",
        "fortress authority",
        "boxing-like combat",
      ]),
      c("Navia", ["Navia"], "leader", "Fontaine", [
        "geo claymore",
        "umbrella-gun imagery",
        "blond styling",
      ]),
      c("Clorinde", ["Clorinde"], "duelist", "Fontaine", [
        "electro sword",
        "gun-duelist image",
        "purple styling",
      ]),
      c("Freminet", ["Freminet"], "diver", "Fontaine", [
        "cryo claymore",
        "underwater theme",
        "reserved demeanor",
      ]),
      c("Lyney", ["Lyney"], "magician", "Fontaine", [
        "pyro bow",
        "stage magic",
        "top hat flair",
      ]),
      c("Lynette", ["Lynette"], "magician assistant", "Fontaine", [
        "anemo sword",
        "cat-like styling",
        "reserved twin",
      ]),
      c("Sigewinne", ["Sigewinne"], "nurse", "Fontaine", [
        "hydro bow",
        "melusine look",
        "medical support",
      ]),
    ],
  ),

  series(
    "Games",
    ["games", "interactive", "video games"],
    [
      g(
        "Minecraft",
        ["Minecraft"],
        "Minecraft",
        ["sandbox", "survival"],
        ["PC", "Console"],
        ["block building", "creepers", "open-ended crafting"],
      ),
      g(
        "Terraria",
        ["Terraria"],
        "Terraria",
        ["sandbox", "survival"],
        ["PC", "Console"],
        ["2D exploration", "boss progression", "crafting"],
      ),
      g(
        "Stardew Valley",
        ["Stardew"],
        "Stardew Valley",
        ["farming sim", "life sim"],
        ["PC", "Switch"],
        ["farm restoration", "small-town relationships", "pixel art"],
      ),
      g(
        "Animal Crossing: New Horizons",
        ["New Horizons", "ACNH"],
        "Animal Crossing",
        ["life sim", "social sim"],
        ["Nintendo Switch"],
        ["island decoration", "villager life", "real-time calendar"],
      ),
      g(
        "Among Us",
        ["Among Us"],
        "Among Us",
        ["social deduction", "party"],
        ["PC", "Mobile"],
        ["impostors", "space tasks", "meetings and votes"],
      ),
      g(
        "Fall Guys",
        ["Fall Guys"],
        "Fall Guys",
        ["party platformer", "battle royale"],
        ["PC", "Console"],
        ["bean-shaped contestants", "obstacle courses", "colorful chaos"],
      ),
      g(
        "Phasmophobia",
        ["Phasmophobia"],
        "Phasmophobia",
        ["horror", "co-op"],
        ["PC"],
        ["ghost hunting tools", "voice interaction", "co-op scares"],
      ),
      g(
        "Lethal Company",
        ["Lethal Company"],
        "Lethal Company",
        ["co-op horror", "survival"],
        ["PC"],
        ["scrap collection", "quota pressure", "comedic panic"],
      ),
      g(
        "Balatro",
        ["Balatro"],
        "Balatro",
        ["roguelike", "deckbuilder"],
        ["PC", "Switch"],
        ["poker hands", "joker synergies", "score-chasing runs"],
      ),
      g(
        "Slay the Spire",
        ["Slay the Spire"],
        "Slay the Spire",
        ["roguelike", "deckbuilder"],
        ["PC", "Switch"],
        ["deck-building runs", "relics", "tower climb"],
      ),
      g(
        "Hades",
        ["Hades"],
        "Hades",
        ["roguelike", "action"],
        ["PC", "Switch"],
        ["Greek myth", "repeated escape attempts", "boon builds"],
      ),
      g(
        "Dead Cells",
        ["Dead Cells"],
        "Dead Cells",
        ["roguelike", "metroidvania"],
        ["PC", "Switch"],
        ["fast combat", "procedural runs", "side-scrolling action"],
      ),
      g(
        "Cuphead",
        ["Cuphead"],
        "Cuphead",
        ["run and gun", "boss rush"],
        ["PC", "Xbox"],
        ["1930s cartoon style", "difficult bosses", "finger-gun combat"],
      ),
      g(
        "Celeste",
        ["Celeste"],
        "Celeste",
        ["platformer"],
        ["PC", "Switch"],
        ["mountain climb", "air dashes", "emotional indie story"],
      ),
      g(
        "Hollow Knight",
        ["Hollow Knight"],
        "Hollow Knight",
        ["metroidvania", "action"],
        ["PC", "Switch"],
        ["underground kingdom", "insect world", "nail combat"],
      ),
      g(
        "Undertale",
        ["Undertale"],
        "Undertale",
        ["rpg", "indie"],
        ["PC", "Switch"],
        ["mercy choices", "bullet-hell dialogue", "underground monsters"],
      ),
      g(
        "Disco Elysium",
        ["Disco Elysium"],
        "Disco Elysium",
        ["rpg", "narrative"],
        ["PC", "PlayStation"],
        ["amnesiac detective", "internal skills talking", "heavy dialogue"],
      ),
      g(
        "Outer Wilds",
        ["Outer Wilds"],
        "Outer Wilds",
        ["exploration", "mystery"],
        ["PC", "Console"],
        ["time loop", "tiny solar system", "knowledge-based progression"],
      ),
      g(
        "Portal 2",
        ["Portal 2"],
        "Portal",
        ["puzzle", "first-person"],
        ["PC", "Console"],
        ["portal gun", "test chambers", "sarcastic AI"],
      ),
      g(
        "Half-Life 2",
        ["Half-Life 2"],
        "Half-Life",
        ["fps", "science fiction"],
        ["PC"],
        ["gravity gun", "silent scientist hero", "Combine invasion"],
      ),
      g(
        "BioShock",
        ["BioShock"],
        "BioShock",
        ["fps", "immersive sim"],
        ["PC", "Console"],
        ["underwater city", "plasmids", "would you kindly"],
      ),
      g(
        "BioShock Infinite",
        ["BioShock Infinite"],
        "BioShock",
        ["fps", "science fiction"],
        ["PC", "Console"],
        ["floating city", "dimension tears", "Booker and Elizabeth"],
      ),
      g(
        "DOOM Eternal",
        ["DOOM Eternal"],
        "DOOM",
        ["fps", "action"],
        ["PC", "Console"],
        ["fast demon slaying", "resource loop combat", "heavy metal energy"],
      ),
      g(
        "Halo 3",
        ["Halo 3"],
        "Halo",
        ["fps", "science fiction"],
        ["Xbox"],
        ["Master Chief", "ringworld war", "Warthog finale vibes"],
      ),
      g(
        "Halo: Reach",
        ["Halo Reach", "Reach"],
        "Halo",
        ["fps", "science fiction"],
        ["Xbox", "PC"],
        ["Noble Team", "tragic last stand", "prequel war story"],
      ),
      g(
        "Titanfall 2",
        ["Titanfall 2"],
        "Titanfall",
        ["fps", "mech action"],
        ["PC", "Console"],
        ["pilot mobility", "BT companion", "time-shift mission"],
      ),
      g(
        "Call of Duty: Modern Warfare 2",
        ["MW2", "Modern Warfare 2"],
        "Call of Duty",
        ["fps", "military"],
        ["PC", "Console"],
        ["task force missions", "cinematic warfare", "multiplayer fame"],
      ),
      g(
        "Counter-Strike 2",
        ["CS2", "Counter-Strike 2"],
        "Counter-Strike",
        ["fps", "tactical shooter"],
        ["PC"],
        ["bomb sites", "buy phase", "terrorists vs counter-terrorists"],
      ),
      g(
        "VALORANT",
        ["VALORANT"],
        "VALORANT",
        ["fps", "hero shooter"],
        ["PC"],
        ["agents with abilities", "bomb planting rounds", "competitive 5v5"],
      ),
      g(
        "Overwatch 2",
        ["Overwatch 2", "OW2"],
        "Overwatch",
        ["hero shooter", "fps"],
        ["PC", "Console"],
        ["hero abilities", "payload maps", "team compositions"],
      ),
      g(
        "Apex Legends",
        ["Apex"],
        "Apex Legends",
        ["battle royale", "hero shooter"],
        ["PC", "Console"],
        ["legend squads", "ping system", "movement-heavy gunplay"],
      ),
      g(
        "Fortnite",
        ["Fortnite"],
        "Fortnite",
        ["battle royale", "shooter"],
        ["PC", "Console"],
        ["building forts", "constant collaborations", "cartoony style"],
      ),
      g(
        "PUBG: Battlegrounds",
        ["PUBG"],
        "PUBG",
        ["battle royale", "shooter"],
        ["PC", "Console"],
        ["large military maps", "drop-in survival", "realistic gunplay"],
      ),
      g(
        "Rocket League",
        ["Rocket League"],
        "Rocket League",
        ["sports", "arcade"],
        ["PC", "Console"],
        ["cars playing soccer", "boost jumps", "aerial goals"],
      ),
      g(
        "League of Legends",
        ["LoL", "League"],
        "League of Legends",
        ["moba"],
        ["PC"],
        ["lanes and towers", "champions", "5v5 nexus battles"],
      ),
      g(
        "Dota 2",
        ["Dota 2"],
        "Dota",
        ["moba"],
        ["PC"],
        ["ancients", "heroes", "high-complexity esports"],
      ),
      g(
        "Genshin Impact",
        ["Genshin"],
        "Genshin Impact",
        ["action rpg", "gacha"],
        ["PC", "Mobile"],
        ["element reactions", "anime world exploration", "party switching"],
      ),
      g(
        "Honkai: Star Rail",
        ["Star Rail", "HSR"],
        "Honkai",
        ["turn-based rpg", "science fiction"],
        ["PC", "Mobile"],
        ["Astral Express", "turn-based combat", "gacha squad building"],
      ),
      g(
        "Elden Ring",
        ["Elden Ring"],
        "Souls",
        ["action rpg", "open world"],
        ["PC", "Console"],
        ["the Lands Between", "tough bosses", "mounted exploration"],
      ),
      g(
        "Dark Souls III",
        ["Dark Souls 3", "DS3"],
        "Dark Souls",
        ["action rpg"],
        ["PC", "Console"],
        ["bonfires", "stamina combat", "dark fantasy bosses"],
      ),
      g(
        "Bloodborne",
        ["Bloodborne"],
        "Souls",
        ["action rpg", "horror"],
        ["PlayStation"],
        ["gothic hunters", "aggressive healing loop", "cosmic horror"],
      ),
      g(
        "Sekiro: Shadows Die Twice",
        ["Sekiro"],
        "Sekiro",
        ["action", "soulslike"],
        ["PC", "Console"],
        [
          "parry-focused swordplay",
          "shinobi prosthetic",
          "resurrection mechanic",
        ],
      ),
      g(
        "Demon's Souls",
        ["Demon's Souls"],
        "Souls",
        ["action rpg"],
        ["PlayStation"],
        ["fog gates", "world tendency roots", "origin of the formula"],
      ),
      g(
        "Lies of P",
        ["Lies of P"],
        "Lies of P",
        ["soulslike", "action"],
        ["PC", "Console"],
        ["Pinocchio twist", "puppet enemies", "weapon assembly"],
      ),
      g(
        "Black Myth: Wukong",
        ["Wukong", "Black Myth"],
        "Black Myth",
        ["action rpg"],
        ["PC", "PlayStation"],
        [
          "Journey to the West influence",
          "staff combat",
          "boss-heavy progression",
        ],
      ),
      g(
        "The Elder Scrolls V: Skyrim",
        ["Skyrim"],
        "The Elder Scrolls",
        ["open-world rpg"],
        ["PC", "Console"],
        ["dragonborn", "shouting powers", "northern province"],
      ),
      g(
        "The Elder Scrolls IV: Oblivion",
        ["Oblivion"],
        "The Elder Scrolls",
        ["open-world rpg"],
        ["PC", "Console"],
        ["Cyrodiil", "oblivion gates", "guild questlines"],
      ),
      g(
        "The Witcher 3: Wild Hunt",
        ["Witcher 3"],
        "The Witcher",
        ["open-world rpg"],
        ["PC", "Console"],
        ["monster contracts", "Geralt", "Gwent"],
      ),
      g(
        "Cyberpunk 2077",
        ["Cyberpunk", "Cyberpunk 2077"],
        "Cyberpunk",
        ["action rpg", "science fiction"],
        ["PC", "Console"],
        ["Night City", "cyberware", "first-person story"],
      ),
      g(
        "Grand Theft Auto V",
        ["GTA V", "GTA 5"],
        "Grand Theft Auto",
        ["open-world action"],
        ["PC", "Console"],
        ["three protagonists", "Los Santos", "heists"],
      ),
      g(
        "Red Dead Redemption 2",
        ["RDR2"],
        "Red Dead Redemption",
        ["open-world action"],
        ["PC", "Console"],
        ["outlaw gang", "horse riding", "Arthur Morgan"],
      ),
      g(
        "Baldur's Gate 3",
        ["BG3"],
        "Baldur's Gate",
        ["rpg", "party-based"],
        ["PC", "PlayStation"],
        ["dice rolls", "mind flayer parasite", "companion choices"],
      ),
      g(
        "Mass Effect 2",
        ["Mass Effect 2"],
        "Mass Effect",
        ["action rpg", "science fiction"],
        ["PC", "Console"],
        ["suicide mission", "Commander Shepard", "space squad"],
      ),
      g(
        "Dragon Age: Origins",
        ["Dragon Age Origins"],
        "Dragon Age",
        ["rpg", "party-based"],
        ["PC", "Console"],
        ["Grey Wardens", "darkspawn", "origin stories"],
      ),
      g(
        "Persona 5 Royal",
        ["Persona 5", "P5R"],
        "Persona",
        ["jrpg"],
        ["PlayStation", "PC"],
        ["Phantom Thieves", "school life by day", "palaces by night"],
      ),
      g(
        "Persona 4 Golden",
        ["Persona 4", "P4G"],
        "Persona",
        ["jrpg"],
        ["PC", "PlayStation"],
        ["murder mystery", "TV world", "small-town bonds"],
      ),
      g(
        "Persona 3 Reload",
        ["Persona 3", "P3R"],
        "Persona",
        ["jrpg"],
        ["PC", "PlayStation"],
        ["Dark Hour", "Evokers", "tower climb"],
      ),
      g(
        "Final Fantasy VII Remake",
        ["FF7 Remake"],
        "Final Fantasy",
        ["jrpg", "action rpg"],
        ["PlayStation", "PC"],
        ["Midgar", "Cloud Strife", "reimagined classic"],
      ),
      g(
        "Final Fantasy X",
        ["FFX"],
        "Final Fantasy",
        ["jrpg"],
        ["PlayStation"],
        ["Tidus and Yuna", "turn-based combat", "Spira pilgrimage"],
      ),
      g(
        "Kingdom Hearts II",
        ["Kingdom Hearts 2", "KH2"],
        "Kingdom Hearts",
        ["action rpg"],
        ["PlayStation"],
        ["Disney worlds", "Keyblade", "Sora adventure"],
      ),
      g(
        "NieR: Automata",
        ["Nier Automata"],
        "NieR",
        ["action rpg", "science fiction"],
        ["PC", "PlayStation"],
        ["android protagonists", "machine war", "multiple endings"],
      ),
      g(
        "Devil May Cry 5",
        ["DMC5"],
        "Devil May Cry",
        ["character action"],
        ["PC", "Console"],
        ["stylish combos", "demon hunters", "ranked flair"],
      ),
      g(
        "Resident Evil 4",
        ["RE4", "Resident Evil 4"],
        "Resident Evil",
        ["survival horror", "action"],
        ["PC", "Console"],
        ["village rescue", "over-the-shoulder shooting", "Leon S. Kennedy"],
      ),
      g(
        "Resident Evil 2",
        ["RE2", "Resident Evil 2"],
        "Resident Evil",
        ["survival horror"],
        ["PC", "Console"],
        ["Raccoon City", "zombies", "police station"],
      ),
      g(
        "Silent Hill 2",
        ["Silent Hill 2"],
        "Silent Hill",
        ["survival horror", "psychological"],
        ["PC", "Console"],
        ["foggy town", "personal guilt", "Pyramid Head"],
      ),
      g(
        "The Last of Us",
        ["The Last of Us", "TLOU"],
        "The Last of Us",
        ["action-adventure", "survival"],
        ["PlayStation", "PC"],
        ["Joel and Ellie", "fungal apocalypse", "emotional road trip"],
      ),
      g(
        "God of War",
        ["God of War 2018"],
        "God of War",
        ["action-adventure"],
        ["PlayStation", "PC"],
        ["Norse mythology", "Kratos and Atreus", "single-shot camera style"],
      ),
      g(
        "God of War Ragnarök",
        ["God of War Ragnarok", "Ragnarok"],
        "God of War",
        ["action-adventure"],
        ["PlayStation"],
        ["Norse apocalypse", "Kratos", "sequel continuation"],
      ),
      g(
        "Ghost of Tsushima",
        ["Ghost of Tsushima"],
        "Ghost of Tsushima",
        ["action-adventure", "open world"],
        ["PlayStation", "PC"],
        ["samurai island", "wind-guided exploration", "Mongol invasion"],
      ),
      g(
        "Horizon Zero Dawn",
        ["Horizon Zero Dawn"],
        "Horizon",
        ["open-world action"],
        ["PlayStation", "PC"],
        ["robot dinosaurs", "Aloy", "tribal future"],
      ),
      g(
        "Horizon Forbidden West",
        ["Forbidden West"],
        "Horizon",
        ["open-world action"],
        ["PlayStation"],
        ["robot dinosaurs", "western frontier ruins", "Aloy sequel"],
      ),
      g(
        "Uncharted 4: A Thief's End",
        ["Uncharted 4"],
        "Uncharted",
        ["action-adventure"],
        ["PlayStation", "PC"],
        ["Nathan Drake", "treasure hunting", "cinematic set pieces"],
      ),
      g(
        "Marvel's Spider-Man",
        ["Spider-Man PS4", "Marvel's Spider-Man"],
        "Spider-Man",
        ["action-adventure"],
        ["PlayStation", "PC"],
        ["web swinging", "New York City", "Peter Parker heroics"],
      ),
      g(
        "Marvel's Spider-Man 2",
        ["Spider-Man 2"],
        "Spider-Man",
        ["action-adventure"],
        ["PlayStation"],
        ["two spider heroes", "symbiote storyline", "open-world New York"],
      ),
      g(
        "Batman: Arkham City",
        ["Arkham City"],
        "Batman Arkham",
        ["action-adventure"],
        ["PC", "Console"],
        [
          "gliding over Gotham prison district",
          "freeflow combat",
          "Batman gadgets",
        ],
      ),
      g(
        "Metal Gear Solid 3: Snake Eater",
        ["MGS3", "Snake Eater"],
        "Metal Gear",
        ["stealth", "action"],
        ["PlayStation"],
        ["jungle stealth", "Big Boss origins", "codec drama"],
      ),
      g(
        "Death Stranding",
        ["Death Stranding"],
        "Death Stranding",
        ["action", "delivery"],
        ["PlayStation", "PC"],
        [
          "cargo balancing",
          "strand connections",
          "post-apocalyptic deliveries",
        ],
      ),
      g(
        "Monster Hunter: World",
        ["Monster Hunter World", "MHW"],
        "Monster Hunter",
        ["action rpg"],
        ["PC", "Console"],
        ["big monster hunts", "weapon classes", "tracking gigantic beasts"],
      ),
      g(
        "Monster Hunter Rise",
        ["Monster Hunter Rise", "MHR"],
        "Monster Hunter",
        ["action rpg"],
        ["PC", "Switch"],
        ["wirebugs", "Palamutes", "village hunts"],
      ),
      g(
        "Metroid Dread",
        ["Metroid Dread"],
        "Metroid",
        ["metroidvania", "action"],
        ["Nintendo Switch"],
        ["Samus Aran", "E.M.M.I. pursuit", "alien sci-fi labyrinth"],
      ),
      g(
        "Metroid Prime",
        ["Metroid Prime"],
        "Metroid",
        ["first-person adventure"],
        ["Nintendo"],
        ["scan visor", "alien planet exploration", "Samus Aran"],
      ),
      g(
        "Fire Emblem: Three Houses",
        ["Three Houses"],
        "Fire Emblem",
        ["strategy rpg"],
        ["Nintendo Switch"],
        ["school professor role", "house leaders", "grid battles"],
      ),
      g(
        "Xenoblade Chronicles",
        ["Xenoblade"],
        "Xenoblade",
        ["jrpg"],
        ["Nintendo"],
        ["Bionis and Mechonis", "future sight", "MMO-like combat"],
      ),
      g(
        "Xenoblade Chronicles 3",
        ["Xenoblade 3"],
        "Xenoblade",
        ["jrpg"],
        ["Nintendo Switch"],
        ["two warring nations", "Ouroboros forms", "large party combat"],
      ),
      g(
        "Chrono Trigger",
        ["Chrono Trigger"],
        "Chrono",
        ["jrpg"],
        ["SNES", "PC"],
        ["time travel", "Akira Toriyama art", "multiple endings"],
      ),
      g(
        "Super Mario Odyssey",
        ["Mario Odyssey"],
        "Super Mario",
        ["platformer"],
        ["Nintendo Switch"],
        ["hat capture mechanic", "globe-trotting kingdoms", "3D platforming"],
      ),
      g(
        "Super Mario 64",
        ["Mario 64"],
        "Super Mario",
        ["platformer"],
        ["Nintendo"],
        ["castle hub", "painting worlds", "3D movement milestone"],
      ),
      g(
        "Super Mario Galaxy",
        ["Mario Galaxy"],
        "Super Mario",
        ["platformer"],
        ["Nintendo"],
        ["tiny planets", "gravity gimmicks", "space adventure"],
      ),
      g(
        "Super Mario Bros. Wonder",
        ["Mario Wonder"],
        "Super Mario",
        ["platformer"],
        ["Nintendo Switch"],
        ["wonder effects", "side-scrolling chaos", "elephant power-up"],
      ),
      g(
        "Mario Kart 8 Deluxe",
        ["Mario Kart 8", "MK8"],
        "Mario Kart",
        ["racing", "party"],
        ["Nintendo Switch"],
        ["blue shells", "kart chaos", "iconic item racing"],
      ),
      g(
        "Super Smash Bros. Ultimate",
        ["Smash Ultimate", "Ultimate"],
        "Smash Bros.",
        ["fighting", "party"],
        ["Nintendo Switch"],
        ["crossover roster", "ring outs", "everyone is here"],
      ),
      g(
        "The Legend of Zelda: Breath of the Wild",
        ["BOTW", "Breath of the Wild"],
        "The Legend of Zelda",
        ["open-world action-adventure"],
        ["Nintendo Switch"],
        ["climb almost anything", "gliding", "breaking weapons"],
      ),
      g(
        "The Legend of Zelda: Tears of the Kingdom",
        ["TOTK", "Tears of the Kingdom"],
        "The Legend of Zelda",
        ["open-world action-adventure"],
        ["Nintendo Switch"],
        ["building contraptions", "sky islands", "ultrahand mechanics"],
      ),
      g(
        "The Legend of Zelda: Ocarina of Time",
        ["Ocarina of Time", "OOT"],
        "The Legend of Zelda",
        ["action-adventure"],
        ["Nintendo"],
        ["time travel", "ocarina songs", "classic lock-on combat"],
      ),
      g(
        "The Legend of Zelda: Majora's Mask",
        ["Majora's Mask"],
        "The Legend of Zelda",
        ["action-adventure"],
        ["Nintendo"],
        ["three-day loop", "masks", "falling moon"],
      ),
      g(
        "Pokémon Red and Blue",
        ["Pokemon Red", "Pokemon Blue"],
        "Pokemon",
        ["monster-collecting rpg"],
        ["Nintendo"],
        ["Kanto region", "starter monsters", "turn-based battles"],
      ),
      g(
        "Pokémon Gold and Silver",
        ["Pokemon Gold", "Pokemon Silver"],
        "Pokemon",
        ["monster-collecting rpg"],
        ["Nintendo"],
        ["Johto region", "day-night cycle", "two regions postgame"],
      ),
      g(
        "Pokémon Emerald",
        ["Pokemon Emerald"],
        "Pokemon",
        ["monster-collecting rpg"],
        ["Nintendo"],
        ["Battle Frontier", "Hoenn", "Rayquaza focus"],
      ),
      g(
        "Pokémon Platinum",
        ["Pokemon Platinum"],
        "Pokemon",
        ["monster-collecting rpg"],
        ["Nintendo"],
        ["Distortion World", "Sinnoh", "expanded third version"],
      ),
      g(
        "Pokémon Sword and Shield",
        ["Pokemon Sword", "Pokemon Shield"],
        "Pokemon",
        ["monster-collecting rpg"],
        ["Nintendo Switch"],
        ["Galar region", "gym challenge", "Dynamax"],
      ),
      g(
        "Pokémon Scarlet and Violet",
        ["Pokemon Scarlet", "Pokemon Violet"],
        "Pokemon",
        ["monster-collecting rpg"],
        ["Nintendo Switch"],
        ["Paldea region", "open-world structure", "three story paths"],
      ),
      g(
        "Pokémon Legends: Arceus",
        ["Legends Arceus", "PLA"],
        "Pokemon",
        ["action rpg", "monster-collecting"],
        ["Nintendo Switch"],
        ["Hisui region", "catching without battle sometimes", "survey corps"],
      ),
      g(
        "Super Metroid",
        ["Super Metroid"],
        "Metroid",
        ["metroidvania"],
        ["Nintendo"],
        ["atmospheric exploration", "alien labyrinth", "genre-defining design"],
      ),
      g(
        "Castlevania: Symphony of the Night",
        ["Symphony of the Night", "SOTN"],
        "Castlevania",
        ["metroidvania", "action"],
        ["PlayStation"],
        ["Alucard", "castle exploration", "RPG elements"],
      ),
      g(
        "Street Fighter 6",
        ["Street Fighter 6", "SF6"],
        "Street Fighter",
        ["fighting"],
        ["PC", "Console"],
        ["hadoukens", "Drive system", "1v1 martial arts"],
      ),
      g(
        "Tekken 8",
        ["Tekken 8"],
        "Tekken",
        ["fighting"],
        ["PC", "Console"],
        ["3D fighter", "Mishima family drama", "heat system"],
      ),
      g(
        "Mortal Kombat 1",
        ["Mortal Kombat 1", "MK1"],
        "Mortal Kombat",
        ["fighting"],
        ["PC", "Console"],
        ["fatalities", "ultraviolence", "rebooted timeline"],
      ),
      g(
        "Gran Turismo 7",
        ["GT7"],
        "Gran Turismo",
        ["racing", "simulation"],
        ["PlayStation"],
        ["real cars", "license tests", "track precision"],
      ),
      g(
        "Forza Horizon 5",
        ["Forza Horizon 5"],
        "Forza Horizon",
        ["racing", "open world"],
        ["Xbox", "PC"],
        ["Mexico setting", "festival vibe", "arcade driving"],
      ),
      g(
        "Need for Speed: Most Wanted",
        ["Most Wanted"],
        "Need for Speed",
        ["racing", "arcade"],
        ["PC", "Console"],
        ["blacklist rivals", "street racing", "police chases"],
      ),
      g(
        "The Sims 4",
        ["Sims 4"],
        "The Sims",
        ["life sim"],
        ["PC", "Console"],
        ["build houses", "control daily lives", "social sandbox"],
      ),
    ],
  ),
];

export const characters = seriesPack.flatMap((seriesInfo) =>
  seriesInfo.characters.map((entry) => buildEntry(seriesInfo, entry)),
);
