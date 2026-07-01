// ==================== УТИЛИТЫ ДЛЯ РАБОТЫ С ИГРОКАМИ ====================

import {
  Player, PlayerStat, InventoryItem,
  ClassDefinition, RaceDefinition, DEFAULT_CLASSES, DEFAULT_RACES,
  DEFAULT_STATS, GameContent
} from "./types";

const uid = () => Math.random().toString(36).slice(2, 9);

// ==================== СОЗДАНИЕ НОВОГО ИГРОКА ====================

export interface CreatePlayerOptions {
  id?: string;
  name: string;
  classId: string;
  raceId: string;
  avatar: string;
  color: string;
  customContent?: GameContent;
}

export function createPlayer(options: CreatePlayerOptions): Player {
  const { name, classId, raceId, avatar, color, customContent } = options;
  const id = options.id || "p_" + uid();
  
  // Находим определение класса
  const classDef = findClass(classId, customContent);
  const raceDef = findRace(raceId, customContent);
  
  // Создаём базовые статы
  const stats: PlayerStat[] = DEFAULT_STATS.map(statDef => {
    // Базовое значение
    let baseValue = statDef.defaultValue;
    let maxValue = statDef.defaultValue;
    
    // Применяем бонусы класса
    const classStatBonus = classDef?.baseStats.find(s => s.statId === statDef.id);
    if (classStatBonus) {
      baseValue = classStatBonus.value;
      maxValue = classStatBonus.value;
    }
    
    // Применяем модификаторы расы
    const raceStatMod = raceDef?.statModifiers.find(s => s.statId === statDef.id);
    if (raceStatMod) {
      baseValue += raceStatMod.value;
      maxValue += raceStatMod.value;
    }
    
    return {
      statId: statDef.id,
      current: Math.max(statDef.minValue, baseValue),
      max: Math.max(statDef.minValue, maxValue)
    };
  });
  
  // Находим HP и Mana для legacy полей
  const hpStat = stats.find(s => s.statId === "hp");
  const manaStat = stats.find(s => s.statId === "mana");
  
  return {
    id,
    name,
    classId,
    raceId,
    race: raceId as any,
    pclass: classId as any,
    avatar,
    color,
    stats,
    hp: hpStat?.current || 20,
    maxHp: hpStat?.max || 20,
    mana: manaStat?.current || 10,
    maxMana: manaStat?.max || 10,
    level: 1,
    xp: 0,
    gold: 18,
    inventory: [],
    activeBuffs: [],
    abilities: classDef?.startingAbilities || [],
    abilityCooldowns: [],
    traits: [],
    status: [],
    connected: true
  };
}

// ==================== ПОИСК КЛАССОВ И РАС ====================

export function findClass(classId: string, customContent?: GameContent): ClassDefinition | undefined {
  // Сначала ищем в кастомном контенте
  if (customContent?.classes) {
    const custom = customContent.classes.find(c => c.id === classId);
    if (custom) return custom;
  }
  
  // Затем в базовых
  return DEFAULT_CLASSES.find(c => c.id === classId);
}

export function findRace(raceId: string, customContent?: GameContent): RaceDefinition | undefined {
  if (customContent?.races) {
    const custom = customContent.races.find(r => r.id === raceId);
    if (custom) return custom;
  }
  
  return DEFAULT_RACES.find(r => r.id === raceId);
}

export function getAllClasses(customContent?: GameContent): ClassDefinition[] {
  const customs = customContent?.classes || [];
  return [...DEFAULT_CLASSES, ...customs];
}

export function getAllRaces(customContent?: GameContent): RaceDefinition[] {
  const customs = customContent?.races || [];
  return [...DEFAULT_RACES, ...customs];
}

// ==================== УПРАВЛЕНИЕ СТАТАМИ ====================

export function getPlayerStat(player: Player, statId: string): PlayerStat | undefined {
  return player.stats.find(s => s.statId === statId);
}

export function modifyPlayerStat(player: Player, statId: string, change: number): Player {
  const newStats = player.stats.map(stat => {
    if (stat.statId !== statId) return stat;
    
    const newCurrent = Math.max(0, Math.min(stat.max, stat.current + change));
    return { ...stat, current: newCurrent };
  });
  
  // Обновляем legacy поля
  const hpStat = newStats.find(s => s.statId === "hp");
  const manaStat = newStats.find(s => s.statId === "mana");
  
  return {
    ...player,
    stats: newStats,
    hp: hpStat?.current || player.hp,
    mana: manaStat?.current || player.mana
  };
}

// ==================== УПРАВЛЕНИЕ БАФФАМИ ====================

export function addBuff(player: Player, buffId: string, duration: number = -1): Player {
  // Проверяем, нет ли уже такого баффа
  const existing = player.activeBuffs.find(b => b.buffId === buffId);
  if (existing) {
    // Обновляем длительность
    return {
      ...player,
      activeBuffs: player.activeBuffs.map(b =>
        b.buffId === buffId ? { ...b, remainingDuration: Math.max(b.remainingDuration, duration) } : b
      )
    };
  }
  
  return {
    ...player,
    activeBuffs: [...player.activeBuffs, {
      buffId,
      remainingDuration: duration,
      appliedAt: Date.now()
    }]
  };
}

export function removeBuff(player: Player, buffId: string): Player {
  return {
    ...player,
    activeBuffs: player.activeBuffs.filter(b => b.buffId !== buffId)
  };
}

export function tickBuffs(player: Player): Player {
  // Уменьшаем длительность всех баффов и удаляем истёкшие
  const newBuffs = player.activeBuffs
    .map(buff => ({
      ...buff,
      remainingDuration: buff.remainingDuration === -1 ? -1 : buff.remainingDuration - 1
    }))
    .filter(buff => buff.remainingDuration === -1 || buff.remainingDuration > 0);
  
  return { ...player, activeBuffs: newBuffs };
}

// ==================== УПРАВЛЕНИЕ ИНВЕНТАРЁМ ====================

export function addItem(player: Player, item: InventoryItem): Player {
  return {
    ...player,
    inventory: [...player.inventory, { ...item, id: item.id || uid() }]
  };
}

export function removeItem(player: Player, itemId: string): Player {
  return {
    ...player,
    inventory: player.inventory.filter(i => i.id !== itemId)
  };
}

export function useItem(player: Player, itemId: string): Player {
  const item = player.inventory.find(i => i.id === itemId);
  if (!item) return player;
  
  // Если это расходник с зарядами
  if (item.type === "consumable" && item.charges !== undefined) {
    if (item.charges <= 1) {
      // Удаляем предмет
      return removeItem(player, itemId);
    } else {
      // Уменьшаем заряды
      return {
        ...player,
        inventory: player.inventory.map(i =>
          i.id === itemId ? { ...i, charges: (i.charges || 1) - 1 } : i
        )
      };
    }
  }
  
  return player;
}

// ==================== ГЕНЕРАЦИЯ ОПИСАНИЯ ДЛЯ AI ====================

export function generatePlayerContextForAI(player: Player, customContent?: GameContent): string {
  const classDef = findClass(player.classId, customContent);
  const raceDef = findRace(player.raceId, customContent);
  
  const statsText = player.stats.map(s => {
    const statDef = DEFAULT_STATS.find(d => d.id === s.statId);
    return `${statDef?.name || s.statId}: ${s.current}/${s.max}`;
  }).join(", ");
  
  const buffsText = player.activeBuffs.length > 0
    ? `Активные эффекты: ${player.activeBuffs.map(b => b.buffId).join(", ")}`
    : "Нет активных эффектов";
  
  const itemsText = player.inventory.length > 0
    ? `Инвентарь: ${player.inventory.map(i => `${i.name}${i.equipped ? " (экипирован)" : ""}`).join(", ")}`
    : "Инвентарь пуст";
  
  return `
${player.name} (${classDef?.name || player.classId}, ${raceDef?.name || player.raceId}, ур.${player.level})
${classDef?.aiDescription || ""}
${raceDef?.aiDescription || ""}
Статы: ${statsText}
${buffsText}
${itemsText}
`.trim();
}
