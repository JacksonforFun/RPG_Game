// ==================== ИГРОВОЙ ДВИЖОК "СКАЗОЧНИК" ====================

import {
  GameState, Player, StoryEntry, PendingAction, Location,
  Phase
} from "./types";

const uid = () => Math.random().toString(36).slice(2, 9);

// ==================== ЛОКАЦИИ ====================

export const LOCATIONS: Location[] = [
  {
    id: "crossroads",
    name: "Перекрёсток трёх дорог",
    blurb: "Место, где сходятся пути судеб. Старый верстовой столб покосился, а в кустах что-то шуршит.",
    tags: ["открытая местность", "путевой", "встречи"],
    danger: 1,
    imagePrompt: "crossroads in dark slavic forest, old wooden signpost, misty evening"
  },
  {
    id: "village",
    name: "Деревня Тихие Омуты",
    blurb: "Заброшенная деревня на болотах. Дома покосились, но в окнах мерцают огоньки.",
    tags: ["поселение", "болото", "нежить"],
    danger: 2,
    imagePrompt: "abandoned slavic village on swamp, tilted wooden houses, ghostly lights"
  },
  {
    id: "forest",
    name: "Чёрная пуща",
    blurb: "Древний лес, где деревья помнят времена до людей. Тропы здесь обманчивы.",
    tags: ["лес", "тёмный", "духи"],
    danger: 3,
    imagePrompt: "dark ancient slavic forest, huge twisted trees, mysterious fog"
  },
  {
    id: "cave",
    name: "Пещера Змеиного царя",
    blurb: "Вход в подземное царство. Стены покрыты чешуйчатым узором, пахнет серой.",
    tags: ["подземелье", "драконы", "сокровища"],
    danger: 4,
    imagePrompt: "entrance to dragon cave, scale patterns on walls, sulfur mist"
  },
  {
    id: "tower",
    name: "Башня Кощея",
    blurb: "Чёрная игла пронзает небо. Здесь хранится то, что лучше не будить.",
    tags: ["крепость", "тёмная магия", "финал"],
    danger: 5,
    imagePrompt: "black tower of Koschei, dark slavic fortress, storm clouds"
  },
  {
    id: "river",
    name: "Река Смородина",
    blurb: "Граница меж мирами. Калинов мост виднеется в тумане.",
    tags: ["река", "граница", "мост"],
    danger: 3,
    imagePrompt: "mystical river Smorodina, Kalinov bridge in mist, boundary between worlds"
  },
  {
    id: "market",
    name: "Ярмарка в Лукоморье",
    blurb: "Шумное торжище где торгуют и люди, и нелюди. Здесь можно найти всё.",
    tags: ["торговля", "город", "встречи"],
    danger: 1,
    imagePrompt: "magical slavic marketplace, merchants humans and creatures, colorful tents"
  },
  {
    id: "temple",
    name: "Капище Велеса",
    blurb: "Древнее святилище бога мудрости и загробного мира. Каменные идолы следят за тобой.",
    tags: ["святилище", "магия", "тайны"],
    danger: 3,
    imagePrompt: "ancient slavic temple of Veles, stone idols, mystical atmosphere"
  },
  {
    id: "battlefield",
    name: "Калиново поле",
    blurb: "Место древней битвы. Земля до сих пор стонет, а ночью встают павшие воины.",
    tags: ["поле боя", "нежить", "проклятие"],
    danger: 4,
    imagePrompt: "ancient battlefield, bones and rusted weapons, ghostly warriors rising"
  },
  {
    id: "island",
    name: "Остров Буян",
    blurb: "Легендарный остров, где хранится Алатырь-камень — источник всей магии мира.",
    tags: ["остров", "артефакт", "финал"],
    danger: 5,
    imagePrompt: "mystical island Buyan, Alatyr stone glowing, magical atmosphere"
  },
  {
    id: "baba_yaga",
    name: "Избушка на курьих ножках",
    blurb: "Дом Бабы-Яги вертится меж деревьев. Хозяйка может помочь... или съесть.",
    tags: ["ведьма", "магия", "испытание"],
    danger: 3,
    imagePrompt: "Baba Yaga hut on chicken legs, dark forest, magical lights"
  },
  {
    id: "underwater",
    name: "Подводное царство",
    blurb: "Дворец Водяного, где правят иные законы. Воздух здесь — роскошь.",
    tags: ["подводный", "водяной", "сокровища"],
    danger: 4,
    imagePrompt: "underwater slavic palace, Vodyanoy throne, magical air bubbles"
  }
];

// ==================== СОЗДАНИЕ ИГРЫ ====================

export function createNewGame(campaignTitle?: string): GameState {
  const code = Math.random().toString(36).slice(2, 6).toUpperCase();
  return {
    roomCode: code,
    campaignTitle: campaignTitle || "Тропой Кощея",
    phase: "lobby",
    turn: 0,
    players: [],
    story: [],
    pending: [],
    timerStartedAt: null,
    lastResultSummary: "",
    locationIndex: 0,
    settings: {
      comfyEnabled: false,
      comfyUrl: "http://localhost:8188",
      llmEnabled: false,
      llmUrl: "http://localhost:11434",
      llmModel: "llama3.1:8b",
      turnSeconds: 75,
      hostPassword: ""
    },
    content: {
      stats: [],
      buffs: [],
      items: [],
      abilities: [],
      classes: [],
      races: []
    }
  };
}

// ==================== УПРАВЛЕНИЕ ИГРОКАМИ ====================

export function addPlayer(game: GameState, player: Player): GameState {
  // Проверяем, не существует ли уже игрок с таким ID
  if (game.players.find(p => p.id === player.id)) {
    return game;
  }
  
  const entry: StoryEntry = {
    id: uid(),
    turn: game.turn,
    type: "system",
    text: `${player.avatar} ${player.name} присоединился к отряду!`
  };
  
  return {
    ...game,
    players: [...game.players, { ...player, connected: true }],
    story: [...game.story, entry]
  };
}

export function removePlayer(game: GameState, playerId: string): GameState {
  const player = game.players.find(p => p.id === playerId);
  if (!player) return game;
  
  const entry: StoryEntry = {
    id: uid(),
    turn: game.turn,
    type: "system",
    text: `${player.avatar} ${player.name} покинул отряд.`
  };
  
  return {
    ...game,
    players: game.players.filter(p => p.id !== playerId),
    pending: game.pending.filter(a => a.playerId !== playerId),
    story: [...game.story, entry]
  };
}

export function setPlayerConnected(game: GameState, playerId: string, connected: boolean): GameState {
  return {
    ...game,
    players: game.players.map(p =>
      p.id === playerId ? { ...p, connected } : p
    )
  };
}

// ==================== ФАЗЫ ИГРЫ ====================

export function startBriefing(game: GameState): GameState {
  const location = getLocation(game);
  const briefingText = generateBriefing(game, location);
  
  const entry: StoryEntry = {
    id: uid(),
    turn: game.turn + 1,
    type: "narrator",
    text: briefingText,
    imagePrompt: location.imagePrompt
  };
  
  return {
    ...game,
    phase: "briefing",
    turn: game.turn + 1,
    story: [...game.story, entry],
    pending: []
  };
}

export function startActionPhase(game: GameState): GameState {
  return {
    ...game,
    phase: "action",
    timerStartedAt: Date.now(),
    pending: []
  };
}

export function submitAction(game: GameState, playerId: string, text: string): GameState {
  // Не принимаем повторные действия
  if (game.pending.find(a => a.playerId === playerId)) {
    return game;
  }
  
  const player = game.players.find(p => p.id === playerId);
  if (!player) return game;
  
  const action: PendingAction = {
    playerId,
    text,
    submittedAt: Date.now()
  };
  
  // Добавляем запись в историю
  const entry: StoryEntry = {
    id: uid(),
    turn: game.turn,
    type: "action",
    text: text,
    author: player.name,
    authorColor: player.color
  };
  
  return {
    ...game,
    pending: [...game.pending, action],
    story: [...game.story, entry]
  };
}

export function setPhase(game: GameState, phase: Phase): GameState {
  return { ...game, phase };
}

export function advanceToNextTurn(game: GameState): GameState {
  const nextTurn = game.turn + 1;
  const nextLocationIndex = Math.min(game.locationIndex + 1, LOCATIONS.length - 1);
  
  // Проверяем, не конец ли игры
  if (nextTurn > 12) {
    return {
      ...game,
      phase: "finished",
      story: [...game.story, {
        id: uid(),
        turn: game.turn,
        type: "narrator",
        text: "Так завершилась эта глава великой саги. Герои вписали свои имена в летопись..."
      }]
    };
  }
  
  const location = LOCATIONS[nextLocationIndex];
  const briefingText = generateBriefing({ ...game, turn: nextTurn, locationIndex: nextLocationIndex }, location);
  
  const entry: StoryEntry = {
    id: uid(),
    turn: nextTurn,
    type: "narrator",
    text: briefingText,
    imagePrompt: location.imagePrompt
  };
  
  return {
    ...game,
    phase: "briefing",
    turn: nextTurn,
    locationIndex: nextLocationIndex,
    pending: [],
    timerStartedAt: null,
    story: [...game.story, entry]
  };
}

// ==================== УТИЛИТЫ ====================

export function getLocation(game: GameState): Location {
  return LOCATIONS[game.locationIndex] || LOCATIONS[0];
}

export function timeLeft(game: GameState): number {
  if (!game.timerStartedAt || game.phase !== "action") return 0;
  const elapsed = Math.floor((Date.now() - game.timerStartedAt) / 1000);
  return Math.max(0, game.settings.turnSeconds - elapsed);
}

export function allSubmitted(game: GameState): boolean {
  if (game.players.length === 0) return false;
  return game.pending.length >= game.players.filter(p => p.connected).length;
}

// ==================== ГЕНЕРАЦИЯ БРИФИНГА ====================

function generateBriefing(_game: GameState, location: Location): string {
  const templates = [
    `Отряд приближается к ${location.name}. ${location.blurb} Что предпримут герои?`,
    `Перед вами ${location.name}. ${location.blurb} Опасность здесь оценивается в ${location.danger} из 5.`,
    `Путь привёл героев к месту, известному как ${location.name}. ${location.blurb}`,
    `${location.name} — именно сюда вела судьба. ${location.blurb} Будьте осторожны.`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
}

// ==================== ОФЛАЙН РАЗРЕШЕНИЕ ХОДА (d20) ====================

export interface ResolveResult {
  state: GameState;
  summary: string;
}

export function resolveOffline(game: GameState): ResolveResult {
  let newState = { ...game };
  const results: string[] = [];
  const newStory: StoryEntry[] = [];
  
  for (const action of game.pending) {
    const player = game.players.find(p => p.id === action.playerId);
    if (!player) continue;
    
    // Бросок d20
    const roll = Math.floor(Math.random() * 20) + 1;
    const mod = getPlayerModifier(player);
    const total = roll + mod;
    const dc = 10 + getLocation(game).danger * 2;
    
    let success: string;
    let resultText: string;
    
    if (roll === 20) {
      success = "КРИТ!";
      resultText = generateCriticalSuccess(player, action.text);
    } else if (roll === 1) {
      success = "ПРОВАЛ!";
      resultText = generateCriticalFailure(player, action.text);
    } else if (total >= dc) {
      success = "успех";
      resultText = generateSuccess(player, action.text);
    } else {
      success = "неудача";
      resultText = generateFailure(player, action.text);
    }
    
    // Запись броска
    newStory.push({
      id: uid(),
      turn: game.turn,
      type: "dice",
      text: `${player.name} бросает: 🎲 ${roll}+${mod}=${total} vs DC${dc}`,
      author: player.name,
      authorColor: player.color,
      rolls: [{ roll, mod, total, dc, success }]
    });
    
    // Запись результата
    newStory.push({
      id: uid(),
      turn: game.turn,
      type: "result",
      text: resultText
    });
    
    results.push(`${player.name}: ${success}`);
    
    // Обновляем игрока (XP, урон и т.д.)
    newState = updatePlayerAfterAction(newState, player.id, success, roll);
  }
  
  // Добавляем итоговое событие
  const summaryText = generateTurnSummary(game, results);
  newStory.push({
    id: uid(),
    turn: game.turn,
    type: "narrator",
    text: summaryText,
    imagePrompt: `${getLocation(game).imagePrompt}, aftermath of battle, heroes`
  });
  
  return {
    state: {
      ...newState,
      story: [...newState.story, ...newStory],
      lastResultSummary: summaryText,
      phase: "result"
    },
    summary: summaryText
  };
}

function getPlayerModifier(player: Player): number {
  // Базовый модификатор от класса и уровня
  const classBonus: Record<string, number> = {
    vityaz: 3,
    vedmak: 2,
    volhv: 1,
    vor: 2,
    skald: 1,
    zverolog: 2
  };
  return (classBonus[player.pclass] || 0) + Math.floor(player.level / 2);
}

function generateCriticalSuccess(player: Player, action: string): string {
  const templates = [
    `${player.name} превосходит все ожидания! Действие "${action}" выполнено мастерски.`,
    `Невероятно! ${player.name} совершает подвиг, достойный легенд.`,
    `Боги благословляют ${player.name}! Полный успех с великолепным результатом.`
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

function generateCriticalFailure(player: Player, action: string): string {
  const templates = [
    `Катастрофа! ${player.name} терпит сокрушительную неудачу.`,
    `Что-то пошло совсем не так. ${player.name} оказывается в беде.`,
    `Судьба жестока к ${player.name}. Попытка "${action}" заканчивается провалом.`
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

function generateSuccess(player: Player, action: string): string {
  const templates = [
    `${player.name} справляется с задачей. "${action}" — выполнено.`,
    `Действие ${player.name} приносит результат.`,
    `${player.name} добивается своего умением и удачей.`
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

function generateFailure(player: Player, action: string): string {
  const templates = [
    `${player.name} не справляется. Придётся искать другой путь.`,
    `Попытка "${action}" не увенчалась успехом.`,
    `${player.name} терпит неудачу, но это ещё не конец.`
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

function generateTurnSummary(game: GameState, results: string[]): string {
  const location = getLocation(game);
  const templates = [
    `Ход ${game.turn} завершён. ${results.join(", ")}. Отряд готовится двигаться дальше от ${location.name}.`,
    `Глава ${game.turn} окончена. Герои пережили испытания ${location.name}.`,
    `Эхо событий в ${location.name} затихает. ${results.join("; ")}.`
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

function updatePlayerAfterAction(game: GameState, playerId: string, success: string, roll: number): GameState {
  void game.turn; // Используется для контекста
  return {
    ...game,
    players: game.players.map(p => {
      if (p.id !== playerId) return p;
      
      let xpGain = 0;
      let hpChange = 0;
      
      if (success === "КРИТ!") {
        xpGain = 15;
      } else if (success === "успех") {
        xpGain = 8;
      } else if (success === "ПРОВАЛ!") {
        hpChange = -Math.floor(Math.random() * 4) - 2;
        xpGain = 2;
      } else {
        xpGain = 3;
        hpChange = roll < 5 ? -2 : 0;
      }
      
      const newXp = p.xp + xpGain;
      const xpForLevel = p.level * 35;
      const levelUp = newXp >= xpForLevel;
      
      return {
        ...p,
        xp: levelUp ? newXp - xpForLevel : newXp,
        level: levelUp ? p.level + 1 : p.level,
        hp: Math.max(1, Math.min(p.maxHp, p.hp + hpChange)),
        maxHp: levelUp ? p.maxHp + 4 : p.maxHp,
        maxMana: levelUp ? p.maxMana + 2 : p.maxMana
      };
    })
  };
}
