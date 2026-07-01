// ==================== AI GAME MASTER ====================
// Умный ведущий с памятью, оценкой действий и персональными ответами

import { GameState, Player, StoryEntry, Location, PendingAction } from "./types.js";

// ==================== ТИПЫ ====================

interface ActionEvaluation {
  playerId: string;
  playerName: string;
  originalAction: string;
  
  // Оценка LLM
  feasibility: number;        // 0-100 — насколько действие возможно в данной ситуации
  creativity: number;         // 0-100 — насколько креативно/интересно
  relevance: number;          // 0-100 — насколько релевантно текущей сцене
  
  // Модифицированная сложность
  baseDC: number;             // Базовая сложность от локации
  modifiedDC: number;         // Итоговая сложность с учётом оценки
  
  // Результат броска
  roll: number;
  modifier: number;
  total: number;
  success: boolean;
  criticalSuccess: boolean;
  criticalFailure: boolean;
  
  // Нарратив от LLM
  dmResponse: string;         // Ответ мастера игроку
  narrativeResult: string;    // Описание результата для всех
  
  // Награды/последствия
  xpGained: number;
  hpChange: number;
  manaChange: number;
  itemsGained: string[];
  statusEffects: string[];
}

interface GameMasterResponse {
  // Общий нарратив сцены
  sceneNarrative: string;
  
  // Оценка каждого действия
  evaluations: ActionEvaluation[];
  
  // Итог хода
  turnSummary: string;
  
  // Промпт для генерации картинки
  imagePrompt: string;
  
  // Подсказки для следующего хода
  hints: string[];
}

// ==================== СИСТЕМНЫЙ ПРОМПТ ====================

const SYSTEM_PROMPT = `Ты — опытный мастер славянского фэнтези RPG "Сказочник". Твоя задача — вести игру как живой, харизматичный ведущий.

ТВОИ ПРИНЦИПЫ:
1. ОЦЕНИВАЙ ОСМЫСЛЕННОСТЬ — если игрок пишет бессмыслицу или действие невозможно в данной ситуации, не игнорируй это. Укажи на нелепость с юмором и дай очень низкий шанс успеха.

2. ПОМНИ КОНТЕКСТ — учитывай всё, что произошло раньше. Если игрок ранен — он не может бегать как здоровый. Если у него нет меча — он не может им рубить.

3. ПЕРСОНАЛЬНЫЕ ОТВЕТЫ — обращайся к каждому игроку по имени, учитывай его класс, расу, характер.

4. БУДЬ ЖИВЫМ — шути, драматизируй, удивляй. Не будь скучным автоматом.

5. ПОСЛЕДОВАТЕЛЬНОСТЬ — если игрок потратил ману, она уменьшается. Если получил рану — она влияет на следующие ходы.

6. СПРАВЕДЛИВОСТЬ — даже глупые действия могут сработать с натуральной 20, но шанс минимален. Умные действия получают бонусы.

ФОРМАТ ОЦЕНКИ ДЕЙСТВИЯ:
- feasibility (0-100): Возможно ли это физически/магически в данной ситуации?
  * 0-20: Абсолютно невозможно ("хочу полететь" без крыльев и магии)
  * 21-40: Крайне маловероятно ("убью дракона одним ударом" на 1 уровне)
  * 41-60: Сложно, но реально ("перепрыгну пропасть")
  * 61-80: Вполне возможно ("атакую гоблина мечом")
  * 81-100: Очевидно выполнимо ("открою незапертую дверь")

- relevance (0-100): Имеет ли смысл в текущей сцене?
  * 0-20: Полная бессмыслица ("танцую" во время боя с драконом)
  * 21-40: Странно, но возможно есть план
  * 41-60: Понятно, зачем это делать
  * 61-80: Логичное действие
  * 81-100: Идеальное решение для ситуации

РАСЧЁТ СЛОЖНОСТИ (DC):
базовыйDC = опасностьЛокации * 3 + 5
модификатор = (100 - feasibility) / 10 + (100 - relevance) / 20
итоговыйDC = базовыйDC + модификатор

Пример: локация с опасностью 3, feasibility=30, relevance=20
DC = 14 + 7 + 4 = 25 (почти невозможно без крита)

СТИЛЬ ОТВЕТОВ (обращайся к игроку по имени):
- Если действие бессмысленно: "Эээ... [ИМЯ], ты уверен? Посреди горящего леса ты решил... считать звёзды? Что ж, попробуй..."
- Если действие умное: "[ИМЯ], отличная идея! Используя тени..."
- При критическом провале: "О нет, [ИМЯ]! Кубики богов жестоки..."
- При критическом успехе: "НЕВЕРОЯТНО! [ИМЯ] совершает невозможное!"

Отвечай ТОЛЬКО валидным JSON без markdown-разметки.`;

// ==================== УТИЛИТЫ ====================

function buildContextPrompt(game: GameState, location: Location): string {
  // Собираем последние N записей истории для контекста
  const recentHistory = game.story.slice(-30).map(s => {
    if (s.author) {
      return `[Ход ${s.turn}] ${s.author}: "${s.text}"${s.rolls ? ` → ${s.rolls[0]?.success}` : ''}`;
    }
    return `[Ход ${s.turn}] Нарратор: ${s.text}`;
  }).join('\n');

  // Состояние игроков
  const playersState = game.players.map(p => {
    const status = p.status.length > 0 ? `, статусы: ${p.status.join(', ')}` : '';
    const items = p.inventory.length > 0 ? `, предметы: ${p.inventory.map(i => i.name).join(', ')}` : '';
    return `- ${p.name} (${p.pclass}, ${p.race}): HP ${p.hp}/${p.maxHp}, Мана ${p.mana}/${p.maxMana}, Ур.${p.level}${status}${items}`;
  }).join('\n');

  // Текущие действия
  const currentActions = game.pending.map(a => {
    const player = game.players.find(p => p.id === a.playerId);
    return `- ${player?.name || 'Неизвестный'}: "${a.text}"`;
  }).join('\n');

  return `
=== ТЕКУЩАЯ СИТУАЦИЯ ===
Кампания: "${game.campaignTitle}"
Ход: ${game.turn} из 12
Локация: ${location.name}
Описание: ${location.blurb}
Опасность: ${location.danger}/5
Теги: ${location.tags.join(', ')}

=== СОСТОЯНИЕ ОТРЯДА ===
${playersState}

=== НЕДАВНЯЯ ИСТОРИЯ ===
${recentHistory || 'Приключение только начинается...'}

=== ДЕЙСТВИЯ ЭТОГО ХОДА ===
${currentActions}

=== ЗАДАЧА ===
Оцени КАЖДОЕ действие игрока и сгенерируй результаты.
Учитывай контекст, историю, состояние персонажей.
Если действие бессмысленно — скажи об этом прямо, но с юмором.
`;
}

function buildResponseSchema(): string {
  return `
Ответь СТРОГО в формате JSON:
{
  "sceneNarrative": "Краткое описание общей сцены (1-2 предложения)",
  "evaluations": [
    {
      "playerId": "ID игрока",
      "playerName": "Имя игрока",
      "originalAction": "Что игрок написал",
      "feasibility": число 0-100,
      "creativity": число 0-100,
      "relevance": число 0-100,
      "dmResponse": "Твой прямой ответ игроку как мастер (2-3 предложения, обращайся по имени)",
      "narrativeResult": "Описание результата действия для всех (2-3 предложения)",
      "xpGained": число 0-20,
      "hpChange": число (отрицательное = урон),
      "manaChange": число,
      "itemsGained": ["название предмета"] или [],
      "statusEffects": ["эффект"] или []
    }
  ],
  "turnSummary": "Итог хода одним предложением",
  "imagePrompt": "Промпт для генерации картинки на английском, dark slavic fantasy style",
  "hints": ["подсказка для следующего хода"]
}`;
}

// ==================== ОСНОВНАЯ ФУНКЦИЯ ====================

export async function resolveWithAI(
  game: GameState,
  location: Location,
  llmUrl: string,
  llmModel: string
): Promise<GameMasterResponse> {
  
  const contextPrompt = buildContextPrompt(game, location);
  const responseSchema = buildResponseSchema();
  
  const fullPrompt = `${contextPrompt}\n\n${responseSchema}`;
  
  console.log('[AI GM] Отправляем запрос в LLM...');
  console.log('[AI GM] Модель:', llmModel);
  console.log('[AI GM] Действий для оценки:', game.pending.length);
  
  try {
    let response: Response;
    let llmText: string;
    
    // Определяем тип API
    if (llmUrl.includes('11434')) {
      // Ollama API
      response = await fetch(`${llmUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: llmModel,
          system: SYSTEM_PROMPT,
          prompt: fullPrompt,
          stream: false,
          options: {
            temperature: 0.8,
            top_p: 0.9,
            num_predict: 2000
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status}`);
      }
      
      const data = await response.json();
      llmText = data.response || '';
      
    } else {
      // OpenAI-compatible API (LM Studio, etc.)
      response = await fetch(`${llmUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY || 'lm-studio'}`
        },
        body: JSON.stringify({
          model: llmModel,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: fullPrompt }
          ],
          temperature: 0.8,
          max_tokens: 2000
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      llmText = data.choices?.[0]?.message?.content || '';
    }
    
    console.log('[AI GM] Получен ответ, парсим JSON...');
    
    // Пытаемся извлечь JSON из ответа
    const jsonMatch = llmText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[AI GM] Не удалось найти JSON в ответе');
      console.error('[AI GM] Ответ LLM:', llmText.substring(0, 500));
      return fallbackResolve(game, location);
    }
    
    const parsed = JSON.parse(jsonMatch[0]) as GameMasterResponse;
    
    // Валидация и дополнение данных
    return validateAndEnhance(parsed, game, location);
    
  } catch (error) {
    console.error('[AI GM] Ошибка:', error);
    return fallbackResolve(game, location);
  }
}

// ==================== ВАЛИДАЦИЯ И ДОПОЛНЕНИЕ ====================

function validateAndEnhance(
  response: GameMasterResponse,
  game: GameState,
  location: Location
): GameMasterResponse {
  
  // Убеждаемся, что для каждого действия есть оценка
  const enhanced: GameMasterResponse = {
    sceneNarrative: response.sceneNarrative || `События разворачиваются в ${location.name}...`,
    evaluations: [],
    turnSummary: response.turnSummary || 'Ход завершён.',
    imagePrompt: response.imagePrompt || `${location.imagePrompt}, dramatic scene, heroes`,
    hints: response.hints || []
  };
  
  for (const action of game.pending) {
    const player = game.players.find(p => p.id === action.playerId);
    if (!player) continue;
    
    // Ищем оценку от LLM
    let evaluation = response.evaluations?.find(
      e => e.playerId === action.playerId || e.playerName === player.name
    );
    
    if (!evaluation) {
      // Если LLM не оценил — создаём базовую оценку
      evaluation = createBasicEvaluation(player, action, location);
    } else {
      // Дополняем оценку бросками кубиков
      evaluation = calculateRolls(evaluation, player, location);
    }
    
    enhanced.evaluations.push(evaluation);
  }
  
  return enhanced;
}

function createBasicEvaluation(
  player: Player,
  action: PendingAction,
  location: Location
): ActionEvaluation {
  // Базовая оценка, если LLM не справился
  const feasibility = 60;
  const relevance = 50;
  const creativity = 40;
  
  const baseDC = location.danger * 3 + 5;
  const modifier = Math.floor((100 - feasibility) / 10 + (100 - relevance) / 20);
  const modifiedDC = baseDC + modifier;
  
  const roll = Math.floor(Math.random() * 20) + 1;
  const playerMod = getPlayerModifier(player);
  const total = roll + playerMod;
  
  const criticalSuccess = roll === 20;
  const criticalFailure = roll === 1;
  const success = criticalSuccess || (!criticalFailure && total >= modifiedDC);
  
  return {
    playerId: player.id,
    playerName: player.name,
    originalAction: action.text,
    feasibility,
    creativity,
    relevance,
    baseDC,
    modifiedDC,
    roll,
    modifier: playerMod,
    total,
    success,
    criticalSuccess,
    criticalFailure,
    dmResponse: success 
      ? `${player.name}, твоё действие удалось!`
      : `${player.name}, увы, на этот раз не вышло.`,
    narrativeResult: success
      ? `${player.name} успешно выполняет задуманное.`
      : `Попытка ${player.name} не увенчалась успехом.`,
    xpGained: success ? 8 : 3,
    hpChange: criticalFailure ? -Math.floor(Math.random() * 4) - 1 : 0,
    manaChange: 0,
    itemsGained: [],
    statusEffects: []
  };
}

function calculateRolls(
  evaluation: Partial<ActionEvaluation>,
  player: Player,
  location: Location
): ActionEvaluation {
  const feasibility = evaluation.feasibility ?? 50;
  const relevance = evaluation.relevance ?? 50;
  
  const baseDC = location.danger * 3 + 5;
  const modifier = Math.floor((100 - feasibility) / 10 + (100 - relevance) / 20);
  const modifiedDC = Math.min(30, baseDC + modifier); // Максимум DC 30
  
  const roll = Math.floor(Math.random() * 20) + 1;
  const playerMod = getPlayerModifier(player);
  const total = roll + playerMod;
  
  const criticalSuccess = roll === 20;
  const criticalFailure = roll === 1;
  const success = criticalSuccess || (!criticalFailure && total >= modifiedDC);
  
  // Корректируем XP на основе успеха
  let xpGained = evaluation.xpGained ?? 5;
  if (criticalSuccess) xpGained = Math.max(xpGained, 15);
  if (criticalFailure) xpGained = Math.min(xpGained, 2);
  if (!success && !criticalFailure) xpGained = Math.min(xpGained, 5);
  
  // Корректируем HP при критическом провале
  let hpChange = evaluation.hpChange ?? 0;
  if (criticalFailure && hpChange >= 0) {
    hpChange = -Math.floor(Math.random() * 4) - 1;
  }
  
  return {
    playerId: evaluation.playerId || player.id,
    playerName: evaluation.playerName || player.name,
    originalAction: evaluation.originalAction || '',
    feasibility,
    creativity: evaluation.creativity ?? 50,
    relevance,
    baseDC,
    modifiedDC,
    roll,
    modifier: playerMod,
    total,
    success,
    criticalSuccess,
    criticalFailure,
    dmResponse: evaluation.dmResponse || (success ? 'Успех!' : 'Неудача.'),
    narrativeResult: evaluation.narrativeResult || '',
    xpGained,
    hpChange,
    manaChange: evaluation.manaChange ?? 0,
    itemsGained: evaluation.itemsGained ?? [],
    statusEffects: evaluation.statusEffects ?? []
  };
}

function getPlayerModifier(player: Player): number {
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

// ==================== FALLBACK (офлайн) ====================

function fallbackResolve(game: GameState, location: Location): GameMasterResponse {
  console.log('[AI GM] Используем fallback (офлайн режим)');
  
  const evaluations: ActionEvaluation[] = [];
  
  for (const action of game.pending) {
    const player = game.players.find(p => p.id === action.playerId);
    if (!player) continue;
    
    evaluations.push(createBasicEvaluation(player, action, location));
  }
  
  const successes = evaluations.filter(e => e.success).length;
  const total = evaluations.length;
  
  return {
    sceneNarrative: `В ${location.name} отряд сталкивается с испытаниями.`,
    evaluations,
    turnSummary: `Ход ${game.turn} завершён. Успехов: ${successes}/${total}.`,
    imagePrompt: `${location.imagePrompt}, fantasy heroes, dramatic lighting`,
    hints: ['Используйте сильные стороны своих персонажей', 'Работайте в команде']
  };
}

// ==================== ПРИМЕНЕНИЕ РЕЗУЛЬТАТОВ ====================

export function applyGameMasterResponse(
  game: GameState,
  response: GameMasterResponse,
  location: Location
): GameState {
  const newStory: StoryEntry[] = [];
  let newPlayers = [...game.players];
  
  // Общий нарратив сцены
  newStory.push({
    id: uid(),
    turn: game.turn,
    type: 'narrator',
    text: response.sceneNarrative
  });
  
  // Обрабатываем каждую оценку
  for (const evaluation of response.evaluations) {
    const playerIndex = newPlayers.findIndex(p => p.id === evaluation.playerId);
    if (playerIndex === -1) continue;
    
    const player = { ...newPlayers[playerIndex] };
    
    // Запись броска
    newStory.push({
      id: uid(),
      turn: game.turn,
      type: 'dice',
      text: `${player.name}: 🎲 ${evaluation.roll}+${evaluation.modifier}=${evaluation.total} vs DC${evaluation.modifiedDC} (feasibility: ${evaluation.feasibility}%, relevance: ${evaluation.relevance}%)`,
      author: player.name,
      authorColor: player.color,
      rolls: [{
        roll: evaluation.roll,
        mod: evaluation.modifier,
        total: evaluation.total,
        dc: evaluation.modifiedDC,
        success: evaluation.criticalSuccess ? 'КРИТ!' : evaluation.criticalFailure ? 'ПРОВАЛ!' : evaluation.success ? 'успех' : 'неудача'
      }]
    });
    
    // Ответ мастера
    newStory.push({
      id: uid(),
      turn: game.turn,
      type: evaluation.success ? 'result' : 'combat',
      text: evaluation.dmResponse,
      author: '🎭 Мастер',
      authorColor: '#fbbf24'
    });
    
    // Нарратив результата
    if (evaluation.narrativeResult) {
      newStory.push({
        id: uid(),
        turn: game.turn,
        type: 'narrator',
        text: evaluation.narrativeResult
      });
    }
    
    // Обновляем статы игрока
    const newXp = player.xp + evaluation.xpGained;
    const xpForLevel = player.level * 35;
    const levelUp = newXp >= xpForLevel;
    
    player.xp = levelUp ? newXp - xpForLevel : newXp;
    player.level = levelUp ? player.level + 1 : player.level;
    player.hp = Math.max(1, Math.min(player.maxHp, player.hp + evaluation.hpChange));
    player.mana = Math.max(0, Math.min(player.maxMana, player.mana + evaluation.manaChange));
    
    if (levelUp) {
      player.maxHp += 4;
      player.maxMana += 2;
      newStory.push({
        id: uid(),
        turn: game.turn,
        type: 'event',
        text: `🎉 ${player.name} достигает ${player.level} уровня!`
      });
    }
    
    // Предметы
    for (const itemName of evaluation.itemsGained) {
      const item = {
        id: uid(),
        name: itemName,
        icon: '✨',
        description: 'Добытый предмет',
        type: 'misc' as const
      };
      player.inventory.push(item);
      newStory.push({
        id: uid(),
        turn: game.turn,
        type: 'loot',
        text: `${player.name} получает: ${itemName}`
      });
    }
    
    // Статус-эффекты
    for (const effect of evaluation.statusEffects) {
      if (!player.status.includes(effect)) {
        player.status.push(effect);
      }
    }
    
    newPlayers[playerIndex] = player;
  }
  
  // Итог хода
  newStory.push({
    id: uid(),
    turn: game.turn,
    type: 'narrator',
    text: response.turnSummary,
    imagePrompt: response.imagePrompt
  });
  
  // Подсказки
  if (response.hints.length > 0) {
    newStory.push({
      id: uid(),
      turn: game.turn,
      type: 'system',
      text: `💡 ${response.hints.join(' • ')}`
    });
  }
  
  return {
    ...game,
    players: newPlayers,
    story: [...game.story, ...newStory],
    lastResultSummary: response.turnSummary,
    phase: 'result'
  };
}

// ==================== УТИЛИТА ====================

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

// ==================== ЭКСПОРТ ТИПОВ ====================

export type { ActionEvaluation, GameMasterResponse };
