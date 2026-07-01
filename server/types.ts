// ==================== СЕРВЕРНЫЕ ТИПЫ ====================

export type Phase = "lobby" | "briefing" | "action" | "resolve" | "result" | "finished";
export type PlayerClass = "vityaz" | "vedmak" | "volhv" | "vor" | "skald" | "zverolog";
export type Race = "chelovek" | "leshiy" | "domovoy" | "rusalka" | "polukan";

export interface InventoryItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  type: "weapon" | "armor" | "potion" | "artifact" | "misc";
  bonus?: number;
}

export interface Player {
  id: string;
  name: string;
  race: Race;
  pclass: PlayerClass;
  avatar: string;
  color: string;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  level: number;
  xp: number;
  gold: number;
  inventory: InventoryItem[];
  traits: string[];
  status: string[];
  connected?: boolean;
  isHost?: boolean;
}

export interface PendingAction {
  playerId: string;
  text: string;
  submittedAt: number;
}

export interface DiceRoll {
  roll: number;
  mod: number;
  total: number;
  dc: number;
  success: string;
}

export interface StoryEntry {
  id: string;
  turn: number;
  type: "narrator" | "action" | "dice" | "result" | "event" | "loot" | "combat" | "system";
  text: string;
  author?: string;
  authorColor?: string;
  rolls?: DiceRoll[];
  imageUrl?: string;
  imagePrompt?: string;
}

export interface Location {
  id: string;
  name: string;
  blurb: string;
  tags: string[];
  danger: number;
  imagePrompt: string;
}

export interface GameSettings {
  comfyEnabled: boolean;
  comfyUrl: string;
  llmEnabled: boolean;
  llmUrl: string;
  llmModel: string;
  turnSeconds: number;
  hostPassword: string;
}

// ==================== КАСТОМНЫЙ КОНТЕНТ ====================

export interface StatDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  minValue: number;
  maxValue: number;
  defaultValue: number;
  color: string;
  aiDescription: string;
}

export interface BuffDebuff {
  id: string;
  name: string;
  icon: string;
  iconUrl?: string;
  isDebuff: boolean;
  description: string;
  aiDescription: string;
  duration: number;
  statModifiers: { statId: string; value: number }[];
  tags: string[];
}

export interface ItemDefinition {
  id: string;
  name: string;
  icon: string;
  iconUrl?: string;
  type: string;
  description: string;
  aiDescription: string;
  rarity: string;
  stats: { statId: string; value: number }[];
  durability?: number;
  maxDurability?: number;
  charges?: number;
  tags: string[];
}

export interface ClassDefinition {
  id: string;
  name: string;
  icon: string;
  iconUrl?: string;
  description: string;
  aiDescription: string;
  baseStats: { statId: string; value: number }[];
  startingAbilities: string[];
  startingItems: string[];
  statBonusPerLevel: { statId: string; value: number }[];
  tags: string[];
  isCustom: boolean;
}

export interface RaceDefinition {
  id: string;
  name: string;
  icon: string;
  iconUrl?: string;
  description: string;
  aiDescription: string;
  statModifiers: { statId: string; value: number }[];
  innateAbilities: string[];
  tags: string[];
  isCustom: boolean;
}

export interface AbilityDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  aiDescription: string;
  manaCost: number;
  staminaCost: number;
  cooldown: number;
  tags: string[];
}

export interface GameContent {
  stats: StatDefinition[];
  buffs: BuffDebuff[];
  items: ItemDefinition[];
  abilities: AbilityDefinition[];
  classes: ClassDefinition[];
  races: RaceDefinition[];
}

export interface GameState {
  roomCode: string;
  campaignTitle: string;
  phase: Phase;
  turn: number;
  players: Player[];
  story: StoryEntry[];
  pending: PendingAction[];
  timerStartedAt: number | null;
  lastResultSummary: string;
  locationIndex: number;
  settings: GameSettings;
  content: GameContent;
}

// ==================== КОНСТАНТЫ ====================

export const PLAYER_CLASSES: Record<PlayerClass, { name: string; hp: number; mana: number }> = {
  vityaz: { name: "Витязь", hp: 28, mana: 4 },
  vedmak: { name: "Ведьмак", hp: 22, mana: 10 },
  volhv: { name: "Волхв", hp: 14, mana: 24 },
  vor: { name: "Вор", hp: 16, mana: 6 },
  skald: { name: "Скальд", hp: 16, mana: 16 },
  zverolog: { name: "Зверолог", hp: 20, mana: 12 }
};

export const LOCATIONS: Location[] = [
  { id: "crossroads", name: "Перекрёсток трёх дорог", blurb: "Место, где сходятся пути судеб. Старый верстовой столб покосился, а в кустах что-то шуршит.", tags: ["открытая местность", "путевой", "встречи"], danger: 1, imagePrompt: "crossroads in dark slavic forest, old wooden signpost, misty evening" },
  { id: "village", name: "Деревня Тихие Омуты", blurb: "Заброшенная деревня на болотах. Дома покосились, но в окнах мерцают огоньки.", tags: ["поселение", "болото", "нежить"], danger: 2, imagePrompt: "abandoned slavic village on swamp, tilted wooden houses, ghostly lights" },
  { id: "forest", name: "Чёрная пуща", blurb: "Древний лес, где деревья помнят времена до людей. Тропы здесь обманчивы.", tags: ["лес", "тёмный", "духи"], danger: 3, imagePrompt: "dark ancient slavic forest, huge twisted trees, mysterious fog" },
  { id: "cave", name: "Пещера Змеиного царя", blurb: "Вход в подземное царство. Стены покрыты чешуйчатым узором, пахнет серой.", tags: ["подземелье", "драконы", "сокровища"], danger: 4, imagePrompt: "entrance to dragon cave, scale patterns on walls, sulfur mist" },
  { id: "tower", name: "Башня Кощея", blurb: "Чёрная игла пронзает небо. Здесь хранится то, что лучше не будить.", tags: ["крепость", "тёмная магия", "финал"], danger: 5, imagePrompt: "black tower of Koschei, dark slavic fortress, storm clouds" },
  { id: "river", name: "Река Смородина", blurb: "Граница меж мирами. Калинов мост виднеется в тумане.", tags: ["река", "граница", "мост"], danger: 3, imagePrompt: "mystical river Smorodina, Kalinov bridge in mist, boundary between worlds" },
  { id: "market", name: "Ярмарка в Лукоморье", blurb: "Шумное торжище где торгуют и люди, и нелюди. Здесь можно найти всё.", tags: ["торговля", "город", "встречи"], danger: 1, imagePrompt: "magical slavic marketplace, merchants humans and creatures, colorful tents" },
  { id: "temple", name: "Капище Велеса", blurb: "Древнее святилище бога мудрости и загробного мира. Каменные идолы следят за тобой.", tags: ["святилище", "магия", "тайны"], danger: 3, imagePrompt: "ancient slavic temple of Veles, stone idols, mystical atmosphere" },
  { id: "battlefield", name: "Калиново поле", blurb: "Место древней битвы. Земля до сих пор стонет, а ночью встают павшие воины.", tags: ["поле боя", "нежить", "проклятие"], danger: 4, imagePrompt: "ancient battlefield, bones and rusted weapons, ghostly warriors rising" },
  { id: "island", name: "Остров Буян", blurb: "Легендарный остров, где хранится Алатырь-камень — источник всей магии мира.", tags: ["остров", "артефакт", "финал"], danger: 5, imagePrompt: "mystical island Buyan, Alatyr stone glowing, magical atmosphere" },
  { id: "baba_yaga", name: "Избушка на курьих ножках", blurb: "Дом Бабы-Яги вертится меж деревьев. Хозяйка может помочь... или съесть.", tags: ["ведьма", "магия", "испытание"], danger: 3, imagePrompt: "Baba Yaga hut on chicken legs, dark forest, magical lights" },
  { id: "underwater", name: "Подводное царство", blurb: "Дворец Водяного, где правят иные законы. Воздух здесь — роскошь.", tags: ["подводный", "водяной", "сокровища"], danger: 4, imagePrompt: "underwater slavic palace, Vodyanoy throne, magical air bubbles" }
];
