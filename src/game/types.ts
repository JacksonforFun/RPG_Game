// ==================== ТИПЫ ИГРЫ "СКАЗОЧНИК" v2 ====================

export type Phase = "lobby" | "briefing" | "action" | "resolve" | "result" | "finished";

// ==================== ДИНАМИЧЕСКИЕ СТАТЫ ====================

export interface StatDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  minValue: number;
  maxValue: number;
  defaultValue: number;
  color: string; // для UI
  aiDescription: string; // описание для AI
}

// Базовые статы по умолчанию
export const DEFAULT_STATS: StatDefinition[] = [
  { id: "hp", name: "Здоровье", icon: "❤️", description: "Очки жизни", minValue: 0, maxValue: 999, defaultValue: 20, color: "#ef4444", aiDescription: "Здоровье персонажа. При 0 персонаж теряет сознание или умирает." },
  { id: "mana", name: "Мана", icon: "✨", description: "Магическая энергия", minValue: 0, maxValue: 999, defaultValue: 10, color: "#3b82f6", aiDescription: "Магическая энергия для заклинаний. Тратится при использовании магии." },
  { id: "stamina", name: "Выносливость", icon: "💪", description: "Физическая сила", minValue: 0, maxValue: 100, defaultValue: 100, color: "#22c55e", aiDescription: "Физическая выносливость. Влияет на силу атак и возможность бега." },
  { id: "sanity", name: "Рассудок", icon: "🧠", description: "Психическое здоровье", minValue: 0, maxValue: 100, defaultValue: 100, color: "#a855f7", aiDescription: "Психическое здоровье. При низком значении персонаж может галлюцинировать или паниковать." },
];

// ==================== БАФФЫ И ДЕБАФФЫ ====================

export interface BuffDebuff {
  id: string;
  name: string;
  icon: string;
  iconUrl?: string; // URL картинки или data URL
  isDebuff: boolean;
  description: string;
  aiDescription: string; // детальное описание для AI
  duration: number; // -1 = постоянный, 0+ = количество ходов
  statModifiers: { statId: string; value: number }[]; // модификаторы статов (value может быть отрицательным)
  tags: string[]; // теги для AI (например: "ослепление", "яд", "благословение")
}

// Базовые баффы/дебаффы
export const DEFAULT_BUFFS: BuffDebuff[] = [
  { id: "poisoned", name: "Отравлен", icon: "🤢", isDebuff: true, description: "Теряет HP каждый ход", aiDescription: "Персонаж отравлен. Каждый ход теряет 2-4 HP. Снижена точность атак. Может быть вылечен антидотом или магией.", duration: 3, statModifiers: [], tags: ["яд", "урон_со_временем"] },
  { id: "blessed", name: "Благословение", icon: "✝️", isDebuff: false, description: "+2 ко всем броскам", aiDescription: "Божественное благословение. +2 ко всем проверкам. Защита от нежити и демонов.", duration: 5, statModifiers: [], tags: ["святой", "защита", "бонус"] },
  { id: "stunned", name: "Оглушён", icon: "💫", isDebuff: true, description: "Пропускает ход", aiDescription: "Персонаж оглушён и дезориентирован. Не может выполнять сложные действия. -5 к защите.", duration: 1, statModifiers: [], tags: ["контроль", "оглушение"] },
  { id: "burning", name: "Горит", icon: "🔥", isDebuff: true, description: "Горит, теряет HP", aiDescription: "Персонаж охвачен пламенем. Получает урон огнём каждый ход. Может поджечь окружающих.", duration: 2, statModifiers: [], tags: ["огонь", "урон_со_временем"] },
  { id: "invisible", name: "Невидимость", icon: "👻", isDebuff: false, description: "Невидим для врагов", aiDescription: "Персонаж невидим. Враги не могут целиться в него. Бонус к скрытным атакам. Спадает при атаке.", duration: 3, statModifiers: [], tags: ["скрытность", "магия"] },
  { id: "sleeping", name: "Спит", icon: "😴", isDebuff: true, description: "Без сознания", aiDescription: "Персонаж спит или без сознания. Не может действовать. Автоматически просыпается при получении урона.", duration: -1, statModifiers: [], tags: ["сон", "контроль", "беспомощность"] },
  { id: "one_arm", name: "Потеря руки", icon: "🦾", isDebuff: true, description: "Одна рука потеряна", aiDescription: "У персонажа отсутствует одна рука. Не может использовать двуручное оружие. -3 к атакам. Невозможно лазать. Перманентно.", duration: -1, statModifiers: [], tags: ["увечье", "перманентный"] },
  { id: "blind", name: "Слепота", icon: "🙈", isDebuff: true, description: "Не видит", aiDescription: "Персонаж ослеплён. Не видит окружение. -5 к атакам. Не может читать. Полагается на слух.", duration: 3, statModifiers: [], tags: ["слепота", "контроль"] },
];

// ==================== ПРЕДМЕТЫ ====================

export interface ItemDefinition {
  id: string;
  name: string;
  icon: string;
  iconUrl?: string;
  type: "weapon" | "armor" | "consumable" | "artifact" | "quest" | "misc";
  description: string;
  aiDescription: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  
  // Характеристики предмета
  stats: { statId: string; value: number }[];
  durability?: number; // текущая прочность
  maxDurability?: number;
  charges?: number; // заряды (для свитков, зелий)
  
  // Эффекты
  onUseEffects?: string[]; // ID баффов при использовании
  passiveEffects?: string[]; // ID баффов пока экипирован
  
  // Ограничения
  requiredClass?: string[];
  requiredRace?: string[];
  requiredLevel?: number;
  
  tags: string[];
}

// Базовые предметы
export const DEFAULT_ITEMS: ItemDefinition[] = [
  { id: "iron_sword", name: "Железный меч", icon: "⚔️", type: "weapon", description: "Простой меч", aiDescription: "Обычный железный меч. +3 к урону в ближнем бою. Надёжное оружие начинающего воина.", rarity: "common", stats: [{ statId: "damage", value: 3 }], durability: 100, maxDurability: 100, tags: ["оружие", "меч", "ближний_бой"] },
  { id: "health_potion", name: "Зелье здоровья", icon: "🧪", type: "consumable", description: "Восстанавливает HP", aiDescription: "Красное зелье в стеклянной склянке. При употреблении восстанавливает 15-20 HP.", rarity: "common", stats: [], charges: 1, onUseEffects: [], tags: ["зелье", "лечение"] },
  { id: "magic_ring", name: "Кольцо мудрости", icon: "💍", type: "artifact", description: "+5 маны", aiDescription: "Серебряное кольцо с сапфиром. Увеличивает максимальный запас маны на 5. Помогает концентрации.", rarity: "rare", stats: [{ statId: "mana", value: 5 }], passiveEffects: [], tags: ["кольцо", "магия", "мана"] },
];

// ==================== СПОСОБНОСТИ ====================

export interface AbilityDefinition {
  id: string;
  name: string;
  icon: string;
  iconUrl?: string;
  description: string;
  aiDescription: string;
  
  // Стоимость
  manaCost: number;
  staminaCost: number;
  cooldown: number; // ходов
  
  // Эффекты
  effects: string[]; // ID баффов/дебаффов
  damage?: number;
  healing?: number;
  
  // Ограничения
  requiredClass?: string[];
  requiredLevel?: number;
  
  tags: string[];
}

// ==================== КЛАССЫ И РАСЫ ====================

export interface ClassDefinition {
  id: string;
  name: string;
  icon: string;
  iconUrl?: string;
  description: string;
  aiDescription: string; // детальное описание для AI
  
  // Стартовые статы
  baseStats: { statId: string; value: number }[];
  
  // Стартовые способности
  startingAbilities: string[];
  
  // Стартовые предметы
  startingItems: string[];
  
  // Бонусы класса
  statBonusPerLevel: { statId: string; value: number }[];
  
  // Теги для AI
  tags: string[];
  
  // Кастомный или базовый
  isCustom: boolean;
}

export interface RaceDefinition {
  id: string;
  name: string;
  icon: string;
  iconUrl?: string;
  description: string;
  aiDescription: string;
  
  // Модификаторы статов
  statModifiers: { statId: string; value: number }[];
  
  // Врождённые способности
  innateAbilities: string[];
  
  // Теги для AI
  tags: string[];
  
  isCustom: boolean;
}

// Базовые классы
export const DEFAULT_CLASSES: ClassDefinition[] = [
  {
    id: "vityaz",
    name: "Витязь",
    icon: "⚔️",
    description: "Воин-защитник, мастер меча и щита",
    aiDescription: "Витязь — благородный воин славянских земель. Специализируется на ближнем бою и защите союзников. Высокое здоровье, сильные атаки мечом. Может использовать щит для блокирования. Слаб в магии. Предан чести и долгу.",
    baseStats: [{ statId: "hp", value: 28 }, { statId: "mana", value: 4 }, { statId: "stamina", value: 100 }],
    startingAbilities: ["slash", "shield_bash"],
    startingItems: ["iron_sword"],
    statBonusPerLevel: [{ statId: "hp", value: 4 }, { statId: "stamina", value: 5 }],
    tags: ["воин", "ближний_бой", "защита", "физический"],
    isCustom: false
  },
  {
    id: "vedmak",
    name: "Ведьмак",
    icon: "🗡️",
    description: "Охотник на чудовищ, знает их слабости",
    aiDescription: "Ведьмак — мутант-охотник на монстров. Знает слабости нечисти и как её убить. Использует серебряное и стальное оружие, знаки (простую магию), эликсиры. Бонус к урону по монстрам. Хорошие рефлексы. Социально отвергнут обществом.",
    baseStats: [{ statId: "hp", value: 22 }, { statId: "mana", value: 10 }, { statId: "stamina", value: 100 }],
    startingAbilities: ["silver_blade", "aard_sign"],
    startingItems: ["silver_sword"],
    statBonusPerLevel: [{ statId: "hp", value: 3 }, { statId: "mana", value: 2 }],
    tags: ["охотник", "монстры", "знаки", "эликсиры"],
    isCustom: false
  },
  {
    id: "volhv",
    name: "Волхв",
    icon: "✨",
    description: "Мудрец, владеющий древней магией",
    aiDescription: "Волхв — славянский маг и мудрец. Владеет стихийной магией, исцелением, прорицанием. Может общаться с духами. Высокая мана, мощные заклинания. Физически слаб. Уважаем в обществе как советник и целитель.",
    baseStats: [{ statId: "hp", value: 14 }, { statId: "mana", value: 24 }, { statId: "stamina", value: 60 }],
    startingAbilities: ["fireball", "heal", "foresight"],
    startingItems: ["staff"],
    statBonusPerLevel: [{ statId: "mana", value: 4 }, { statId: "hp", value: 2 }],
    tags: ["маг", "заклинания", "стихии", "исцеление"],
    isCustom: false
  },
  {
    id: "vor",
    name: "Вор",
    icon: "🗝️",
    description: "Ловкач, мастер скрытности и замков",
    aiDescription: "Вор — мастер скрытности и ловкости рук. Вскрывает замки, крадёт, наносит удары из тени. Бонус к критическим ударам сзади. Может обнаруживать ловушки. Низкое здоровье, избегает прямого боя.",
    baseStats: [{ statId: "hp", value: 16 }, { statId: "mana", value: 6 }, { statId: "stamina", value: 100 }],
    startingAbilities: ["backstab", "lockpick", "stealth"],
    startingItems: ["dagger", "lockpicks"],
    statBonusPerLevel: [{ statId: "hp", value: 2 }, { statId: "stamina", value: 8 }],
    tags: ["вор", "скрытность", "ловушки", "критический_урон"],
    isCustom: false
  },
  {
    id: "skald",
    name: "Скальд",
    icon: "🎭",
    description: "Бард, чья музыка вдохновляет и ранит",
    aiDescription: "Скальд — странствующий бард и поэт. Использует музыку и слово как оружие. Может вдохновлять союзников (+бонусы), деморализовать врагов, очаровывать. Средние характеристики. Знает много легенд и слухов.",
    baseStats: [{ statId: "hp", value: 16 }, { statId: "mana", value: 16 }, { statId: "stamina", value: 80 }],
    startingAbilities: ["inspire", "mock", "charm"],
    startingItems: ["lute"],
    statBonusPerLevel: [{ statId: "hp", value: 2 }, { statId: "mana", value: 3 }],
    tags: ["бард", "музыка", "поддержка", "харизма"],
    isCustom: false
  },
  {
    id: "zverolog",
    name: "Зверолог",
    icon: "🐺",
    description: "Следопыт, друг зверей и птиц",
    aiDescription: "Зверолог — друид и следопыт. Может призывать зверей-компаньонов, общаться с животными, выслеживать добычу. Знает целебные травы. Хорош в дикой местности. Бонус к выживанию в природе.",
    baseStats: [{ statId: "hp", value: 20 }, { statId: "mana", value: 12 }, { statId: "stamina", value: 100 }],
    startingAbilities: ["call_beast", "track", "herbal_heal"],
    startingItems: ["bow", "herbs"],
    statBonusPerLevel: [{ statId: "hp", value: 3 }, { statId: "mana", value: 2 }],
    tags: ["друид", "звери", "природа", "следопыт"],
    isCustom: false
  }
];

// Базовые расы
export const DEFAULT_RACES: RaceDefinition[] = [
  {
    id: "chelovek",
    name: "Человек",
    icon: "👤",
    description: "+2 к любому навыку",
    aiDescription: "Обычный человек. Универсален и адаптивен. Может преуспеть в любом деле. Нет особых слабостей или сильных сторон. Большинство NPC — люди.",
    statModifiers: [],
    innateAbilities: ["adaptability"],
    tags: ["человек", "универсальный"],
    isCustom: false
  },
  {
    id: "leshiy",
    name: "Леший",
    icon: "🌲",
    description: "+4 к скрытности в лесу",
    aiDescription: "Дух леса в человеческом обличье. Может сливаться с деревьями, управлять растениями. Бонус в лесной местности. Слаб к огню. Не любит города.",
    statModifiers: [{ statId: "stamina", value: 10 }],
    innateAbilities: ["forest_meld"],
    tags: ["дух", "лес", "природа", "скрытность"],
    isCustom: false
  },
  {
    id: "domovoy",
    name: "Домовой",
    icon: "🏠",
    description: "+3 к ремеслу и торговле",
    aiDescription: "Домашний дух, маленький и хитрый. Отлично разбирается в ремёслах и торговле. Может становиться невидимым в домах. Слаб физически.",
    statModifiers: [{ statId: "hp", value: -4 }, { statId: "mana", value: 4 }],
    innateAbilities: ["home_invisibility", "craft_bonus"],
    tags: ["дух", "дом", "ремесло", "маленький"],
    isCustom: false
  },
  {
    id: "rusalka",
    name: "Русалка",
    icon: "🧜",
    description: "+4 к магии воды и обаянию",
    aiDescription: "Водный дух, очень красивая. Может дышать под водой, плавает быстро. Сильна в магии воды и очаровании. Слаба к огню. На суше теряет силы со временем.",
    statModifiers: [{ statId: "mana", value: 6 }, { statId: "stamina", value: -10 }],
    innateAbilities: ["water_breathing", "charm_aura"],
    tags: ["дух", "вода", "очарование", "красота"],
    isCustom: false
  },
  {
    id: "polukan",
    name: "Полукан",
    icon: "🐎",
    description: "+3 к силе и выносливости",
    aiDescription: "Получеловек-полуконь (кентавр славянского типа). Очень силён и вынослив. Быстро бегает. Не может лазать по лестницам и входить в маленькие помещения.",
    statModifiers: [{ statId: "hp", value: 6 }, { statId: "stamina", value: 20 }],
    innateAbilities: ["gallop", "trample"],
    tags: ["кентавр", "сила", "скорость", "большой"],
    isCustom: false
  }
];

// ==================== LEGACY СОВМЕСТИМОСТЬ ====================

export type PlayerClass = "vityaz" | "vedmak" | "volhv" | "vor" | "skald" | "zverolog" | string;
export type Race = "chelovek" | "leshiy" | "domovoy" | "rusalka" | "polukan" | string;

// Старые константы для совместимости
export const PLAYER_CLASSES: Record<string, { name: string; icon: string; desc: string; hp: number; mana: number; stat: string; skills: string[] }> = {
  vityaz: { name: "Витязь", icon: "⚔️", desc: "Воин-защитник", hp: 28, mana: 4, stat: "Сила и доблесть", skills: [] },
  vedmak: { name: "Ведьмак", icon: "🗡️", desc: "Охотник на чудовищ", hp: 22, mana: 10, stat: "Знание и рефлексы", skills: [] },
  volhv: { name: "Волхв", icon: "✨", desc: "Мудрец-маг", hp: 14, mana: 24, stat: "Магия и мудрость", skills: [] },
  vor: { name: "Вор", icon: "🗝️", desc: "Мастер скрытности", hp: 16, mana: 6, stat: "Ловкость и хитрость", skills: [] },
  skald: { name: "Скальд", icon: "🎭", desc: "Бард-вдохновитель", hp: 16, mana: 16, stat: "Харизма и обаяние", skills: [] },
  zverolog: { name: "Зверолог", icon: "🐺", desc: "Друг зверей", hp: 20, mana: 12, stat: "Выносливость и чутьё", skills: [] }
};

export const RACES: Record<string, { name: string; icon: string; bonus: string }> = {
  chelovek: { name: "Человек", icon: "👤", bonus: "+2 к любому навыку" },
  leshiy: { name: "Леший", icon: "🌲", bonus: "+4 к скрытности в лесу" },
  domovoy: { name: "Домовой", icon: "🏠", bonus: "+3 к ремеслу и торговле" },
  rusalka: { name: "Русалка", icon: "🧜", bonus: "+4 к магии воды и обаянию" },
  polukan: { name: "Полукан", icon: "🐎", bonus: "+3 к силе и выносливости" }
};

// ==================== ИГРОК ====================

export interface PlayerStat {
  statId: string;
  current: number;
  max: number;
}

export interface ActiveBuff {
  buffId: string;
  remainingDuration: number; // -1 = постоянный
  appliedAt: number; // timestamp
}

export interface InventoryItem {
  id: string;
  itemDefId: string; // ссылка на ItemDefinition
  name: string;
  icon: string;
  iconUrl?: string;
  description: string;
  type: "weapon" | "armor" | "consumable" | "artifact" | "quest" | "misc";
  
  // Текущее состояние
  durability?: number;
  charges?: number;
  equipped?: boolean;
  
  // AI описание
  aiDescription: string;
}

export interface Player {
  id: string;
  name: string;
  
  // Класс и раса (могут быть кастомными)
  classId: string;
  raceId: string;
  
  // Legacy поля для совместимости
  race: Race;
  pclass: PlayerClass;
  
  avatar: string;
  color: string;
  
  // Динамические статы
  stats: PlayerStat[];
  
  // Legacy статы для совместимости
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  
  level: number;
  xp: number;
  gold: number;
  
  // Инвентарь
  inventory: InventoryItem[];
  
  // Активные баффы/дебаффы
  activeBuffs: ActiveBuff[];
  
  // Способности
  abilities: string[]; // ID способностей
  abilityCooldowns: { abilityId: string; remainingCooldown: number }[];
  
  // Legacy поля
  traits: string[];
  status: string[];
  
  connected?: boolean;
  isHost?: boolean;
}

// ==================== ИГРА ====================

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
  hostPassword: string; // пароль для доступа к экрану ведущего
}

// Кастомный контент игры
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
  
  // Кастомный контент
  content: GameContent;
}

// ==================== SOCKET EVENTS ====================

export interface ServerToClientEvents {
  game_state: (state: GameState) => void;
  error: (data: { message: string }) => void;
  player_joined: (data: { player: Player }) => void;
  player_left: (data: { playerId: string }) => void;
  player_reconnected: (data: { playerId: string }) => void;
  turn_started: (data: { turn: number; timeLeft: number }) => void;
  action_submitted: (data: { playerId: string; pending: number; total: number }) => void;
  resolving_started: () => void;
  turn_resolved: (data: { summary: string; imageUrl?: string }) => void;
  room_created: (data: { roomCode: string }) => void;
  room_joined: (data: { roomCode: string; playerId: string }) => void;
  host_authenticated: (data: { success: boolean }) => void;
  icon_generated: (data: { url: string; requestId: string }) => void;
}

export interface ClientToServerEvents {
  create_room: (data: { campaignTitle?: string; hostPassword?: string }) => void;
  join_room: (data: { roomCode: string; playerId?: string }) => void;
  leave_room: () => void;
  authenticate_host: (data: { roomCode: string; password: string }) => void;
  
  add_player: (data: { player: Omit<Player, 'connected'> }) => void;
  remove_player: (data: { playerId: string }) => void;
  
  submit_action: (data: { playerId: string; text: string }) => void;
  
  start_briefing: () => void;
  start_action_phase: () => void;
  resolve_turn: () => void;
  advance_turn: () => void;
  
  update_settings: (data: Partial<GameSettings>) => void;
  reset_game: (data: { campaignTitle?: string }) => void;
  
  // Управление контентом (только для хоста)
  add_custom_class: (data: { classDef: ClassDefinition }) => void;
  add_custom_race: (data: { raceDef: RaceDefinition }) => void;
  add_custom_item: (data: { itemDef: ItemDefinition }) => void;
  add_custom_buff: (data: { buffDef: BuffDebuff }) => void;
  add_custom_stat: (data: { statDef: StatDefinition }) => void;
  add_custom_ability: (data: { abilityDef: AbilityDefinition }) => void;
  
  remove_custom_content: (data: { type: 'class' | 'race' | 'item' | 'buff' | 'stat' | 'ability'; id: string }) => void;
  
  // Генерация иконок через ComfyUI
  generate_icon: (data: { prompt: string; requestId: string }) => void;
  
  // Управление игроком (баффы, статы, предметы)
  modify_player_stat: (data: { playerId: string; statId: string; change: number }) => void;
  add_player_buff: (data: { playerId: string; buffId: string; duration?: number }) => void;
  remove_player_buff: (data: { playerId: string; buffId: string }) => void;
  give_player_item: (data: { playerId: string; itemDefId: string }) => void;
  remove_player_item: (data: { playerId: string; itemId: string }) => void;
  
  add_bot: () => void;
  test_action: () => void;
}
