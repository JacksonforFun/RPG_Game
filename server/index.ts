// ==================== СЕРВЕР "СКАЗОЧНИК" ====================
// Node.js + Express + Socket.io + AI Game Master
// Запуск: npx tsx server/index.ts

import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";

// Импортируем типы и AI модуль
import { 
  GameState, Player, Location, GameSettings, StoryEntry,
  PLAYER_CLASSES, LOCATIONS, PlayerClass, Race,
  ClassDefinition, RaceDefinition, ItemDefinition, BuffDebuff
} from "./types.js";
import { resolveWithAI, applyGameMasterResponse } from "./aiGameMaster.js";

const AVATARS = ["🦊","🐺","🦉","🐻","🐉","🦇","🌿","🔥","🌙","⚡","🪶","🪓","🧿","🕯️"];
const COLORS = ["#f59e0b","#f97316","#eab308","#22c55e","#06b6d4","#8b5cf6","#ec4899","#ef4444","#84cc16","#0ea5e9"];
const BOT_NAMES = ["Варга","Мирин","Зор","Лиске","Броун","Силь","Олеся","Добрыня","Горан","Веда"];

// ==================== ХРАНИЛИЩЕ ====================

interface Room {
  game: GameState;
  hostSocketId: string | null;
  playerSockets: Map<string, string>; // playerId -> socketId
  timerInterval?: NodeJS.Timeout;
}

const rooms = new Map<string, Room>();

// ==================== УТИЛИТЫ ====================

const uid = () => Math.random().toString(36).slice(2, 9);

function createNewGame(campaignTitle?: string, hostPassword?: string): GameState {
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
      hostPassword: hostPassword || ""
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

function getLocation(game: GameState): Location {
  return LOCATIONS[game.locationIndex] || LOCATIONS[0];
}

function timeLeft(game: GameState): number {
  if (!game.timerStartedAt || game.phase !== "action") return 0;
  const elapsed = Math.floor((Date.now() - game.timerStartedAt) / 1000);
  return Math.max(0, game.settings.turnSeconds - elapsed);
}

function allSubmitted(game: GameState): boolean {
  if (game.players.length === 0) return false;
  const connectedPlayers = game.players.filter(p => p.connected !== false);
  return game.pending.length >= connectedPlayers.length;
}

// ==================== EXPRESS + SOCKET.IO ====================

const app = express();
app.use(cors());
app.use(express.json());

// Статика для картинок
app.use('/generated', express.static('generated'));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ==================== REST API (для проверки) ====================

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", rooms: rooms.size });
});

app.get("/api/rooms", (_req, res) => {
  const list = Array.from(rooms.entries()).map(([code, room]) => ({
    code,
    players: room.game.players.length,
    phase: room.game.phase,
    turn: room.game.turn
  }));
  res.json(list);
});

// ==================== SOCKET.IO СОБЫТИЯ ====================

io.on("connection", (socket: Socket) => {
  console.log(`[SOCKET] Connected: ${socket.id}`);
  
  let currentRoom: string | null = null;
  let currentPlayerId: string | null = null;
  let isHost = false;

  // Создание комнаты
  socket.on("create_room", (data: { campaignTitle?: string }) => {
    const game = createNewGame(data.campaignTitle);
    const room: Room = {
      game,
      hostSocketId: socket.id,
      playerSockets: new Map()
    };
    rooms.set(game.roomCode, room);
    currentRoom = game.roomCode;
    isHost = true;
    
    socket.join(game.roomCode);
    socket.emit("room_created", { roomCode: game.roomCode });
    socket.emit("game_state", game);
    
    console.log(`[ROOM] Created: ${game.roomCode} by ${socket.id}`);
  });

  // Присоединение к комнате
  socket.on("join_room", (data: { roomCode: string; playerId?: string }) => {
    const code = data.roomCode.toUpperCase();
    const room = rooms.get(code);
    
    if (!room) {
      socket.emit("error", { message: "Комната не найдена" });
      return;
    }
    
    currentRoom = code;
    socket.join(code);
    
    // Реконнект игрока
    if (data.playerId) {
      const existingPlayer = room.game.players.find(p => p.id === data.playerId);
      if (existingPlayer) {
        currentPlayerId = data.playerId;
        room.playerSockets.set(data.playerId, socket.id);
        existingPlayer.connected = true;
        
        io.to(code).emit("player_reconnected", { playerId: data.playerId });
        io.to(code).emit("game_state", room.game);
        
        console.log(`[ROOM] Player reconnected: ${existingPlayer.name} in ${code}`);
        return;
      }
    }
    
    socket.emit("room_joined", { roomCode: code, playerId: data.playerId || null });
    socket.emit("game_state", room.game);
    
    console.log(`[ROOM] Joined: ${code} by ${socket.id}`);
  });

  // Добавление игрока
  socket.on("add_player", (data: { player: Player }) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    
    // Проверяем, не существует ли игрок
    if (room.game.players.find(p => p.id === data.player.id)) {
      socket.emit("error", { message: "Игрок уже существует" });
      return;
    }
    
    const player: Player = {
      ...data.player,
      connected: true
    };
    
    room.game.players.push(player);
    room.playerSockets.set(player.id, socket.id);
    currentPlayerId = player.id;
    
    // Запись в историю
    room.game.story.push({
      id: uid(),
      turn: room.game.turn,
      type: "system",
      text: `${player.avatar} ${player.name} присоединился к отряду!`
    });
    
    io.to(currentRoom).emit("player_joined", { player });
    io.to(currentRoom).emit("game_state", room.game);
    
    console.log(`[PLAYER] Added: ${player.name} to ${currentRoom}`);
  });

  // Отправка действия
  socket.on("submit_action", (data: { playerId: string; text: string }) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room || room.game.phase !== "action") return;
    
    // Проверяем, не сдал ли уже
    if (room.game.pending.find(a => a.playerId === data.playerId)) {
      return;
    }
    
    const player = room.game.players.find(p => p.id === data.playerId);
    if (!player) return;
    
    room.game.pending.push({
      playerId: data.playerId,
      text: data.text,
      submittedAt: Date.now()
    });
    
    // Запись в историю
    room.game.story.push({
      id: uid(),
      turn: room.game.turn,
      type: "action",
      text: data.text,
      author: player.name,
      authorColor: player.color
    });
    
    io.to(currentRoom).emit("action_submitted", {
      playerId: data.playerId,
      pending: room.game.pending.length,
      total: room.game.players.length
    });
    io.to(currentRoom).emit("game_state", room.game);
    
    console.log(`[ACTION] ${player.name}: "${data.text.slice(0, 50)}..."`);
    
    // Автоматическое разрешение, если все сдали
    if (allSubmitted(room.game)) {
      console.log(`[AUTO] All submitted, resolving turn...`);
      setTimeout(() => resolveTurn(currentRoom!), 1000);
    }
  });

  // Начать брифинг
  socket.on("start_briefing", () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    
    const location = getLocation(room.game);
    const briefingText = generateBriefing(location);
    
    room.game.turn += 1;
    room.game.phase = "briefing";
    room.game.pending = [];
    room.game.story.push({
      id: uid(),
      turn: room.game.turn,
      type: "narrator",
      text: briefingText,
      imagePrompt: location.imagePrompt
    });
    
    io.to(currentRoom).emit("game_state", room.game);
    console.log(`[PHASE] Briefing started for turn ${room.game.turn}`);
  });

  // Начать фазу действий
  socket.on("start_action_phase", () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    
    room.game.phase = "action";
    room.game.timerStartedAt = Date.now();
    room.game.pending = [];
    
    // Запускаем таймер
    if (room.timerInterval) {
      clearInterval(room.timerInterval);
    }
    
    room.timerInterval = setInterval(() => {
      const tl = timeLeft(room.game);
      if (tl <= 0 && room.game.phase === "action") {
        clearInterval(room.timerInterval);
        resolveTurn(currentRoom!);
      }
    }, 1000);
    
    io.to(currentRoom).emit("turn_started", {
      turn: room.game.turn,
      timeLeft: room.game.settings.turnSeconds
    });
    io.to(currentRoom).emit("game_state", room.game);
    
    console.log(`[PHASE] Action phase started`);
  });

  // Разрешить ход (вручную)
  socket.on("resolve_turn", () => {
    if (!currentRoom) return;
    resolveTurn(currentRoom);
  });

  // Следующий ход
  socket.on("advance_turn", () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    
    const nextTurn = room.game.turn + 1;
    
    if (nextTurn > 12) {
      room.game.phase = "finished";
      room.game.story.push({
        id: uid(),
        turn: room.game.turn,
        type: "narrator",
        text: "Так завершилась эта глава великой саги. Герои вписали свои имена в летопись..."
      });
    } else {
      room.game.locationIndex = Math.min(room.game.locationIndex + 1, LOCATIONS.length - 1);
      const location = getLocation(room.game);
      
      room.game.turn = nextTurn;
      room.game.phase = "briefing";
      room.game.pending = [];
      room.game.timerStartedAt = null;
      room.game.story.push({
        id: uid(),
        turn: nextTurn,
        type: "narrator",
        text: generateBriefing(location),
        imagePrompt: location.imagePrompt
      });
    }
    
    io.to(currentRoom).emit("game_state", room.game);
    console.log(`[PHASE] Advanced to turn ${room.game.turn}`);
  });

  // Обновление настроек
  socket.on("update_settings", (data: Partial<GameSettings>) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    
    room.game.settings = { ...room.game.settings, ...data };
    io.to(currentRoom).emit("game_state", room.game);
  });

  // Сброс игры
  socket.on("reset_game", (data: { campaignTitle?: string }) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    
    const oldCode = room.game.roomCode;
    room.game = createNewGame(data.campaignTitle);
    room.game.roomCode = oldCode; // Сохраняем код комнаты
    
    io.to(currentRoom).emit("game_state", room.game);
    console.log(`[ROOM] Reset: ${currentRoom}`);
  });

  // Добавить бота
  socket.on("add_bot", () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    
    const classes = Object.keys(PLAYER_CLASSES) as PlayerClass[];
    const races: Race[] = ["chelovek", "leshiy", "domovoy", "rusalka", "polukan"];
    const pclass = classes[Math.floor(Math.random() * classes.length)];
    const race = races[Math.floor(Math.random() * races.length)];
    const pc = PLAYER_CLASSES[pclass];
    
    const bot: Player = {
      id: "bot_" + uid(),
      name: BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)],
      race,
      pclass,
      avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      hp: pc.hp,
      maxHp: pc.hp,
      mana: pc.mana,
      maxMana: pc.mana,
      level: 1,
      xp: 0,
      gold: 12,
      inventory: [],
      traits: [],
      status: [],
      connected: true,
      isHost: false
    };
    
    room.game.players.push(bot);
    room.game.story.push({
      id: uid(),
      turn: room.game.turn,
      type: "system",
      text: `${bot.avatar} ${bot.name} (бот) присоединился к отряду!`
    });
    
    io.to(currentRoom).emit("game_state", room.game);
    console.log(`[BOT] Added: ${bot.name}`);
  });

  // Тестовое действие
  socket.on("test_action", () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room || room.game.phase !== "action") return;
    
    const actions = [
      "Бросаюсь вперёд и рублю тень сталью, прикрывая союзников!",
      "Шепчу древнее слово — пусть камни заговорят.",
      "Скольжу во мрак, пытаюсь срезать кошель у капитана стражи.",
      "Пою балладу о павших, чтобы вдохновить отряд.",
      "Кидаю дымовую склянку и ухожу вбок по дуге.",
      "Осматриваю руны на алтаре — что они скрывают?"
    ];
    
    // Находим игрока без действия
    for (const player of room.game.players) {
      if (!room.game.pending.find(a => a.playerId === player.id)) {
        const text = actions[Math.floor(Math.random() * actions.length)];
        
        room.game.pending.push({
          playerId: player.id,
          text,
          submittedAt: Date.now()
        });
        
        room.game.story.push({
          id: uid(),
          turn: room.game.turn,
          type: "action",
          text,
          author: player.name,
          authorColor: player.color
        });
        
        io.to(currentRoom).emit("game_state", room.game);
        console.log(`[TEST] Action for ${player.name}`);
        break;
      }
    }
  });

  // ==================== УПРАВЛЕНИЕ КОНТЕНТОМ ====================

  // Добавить кастомный класс
  socket.on("add_custom_class", (data: { classDef: ClassDefinition }) => {
    if (!currentRoom || !isHost) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    
    // Проверяем, нет ли уже такого ID
    if (room.game.content.classes.find(c => c.id === data.classDef.id)) {
      socket.emit("error", { message: "Класс с таким ID уже существует" });
      return;
    }
    
    room.game.content.classes.push(data.classDef);
    io.to(currentRoom).emit("game_state", room.game);
    console.log(`[CONTENT] Added custom class: ${data.classDef.name}`);
  });

  // Добавить кастомную расу
  socket.on("add_custom_race", (data: { raceDef: RaceDefinition }) => {
    if (!currentRoom || !isHost) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    
    if (room.game.content.races.find(r => r.id === data.raceDef.id)) {
      socket.emit("error", { message: "Раса с таким ID уже существует" });
      return;
    }
    
    room.game.content.races.push(data.raceDef);
    io.to(currentRoom).emit("game_state", room.game);
    console.log(`[CONTENT] Added custom race: ${data.raceDef.name}`);
  });

  // Добавить кастомный предмет
  socket.on("add_custom_item", (data: { itemDef: ItemDefinition }) => {
    if (!currentRoom || !isHost) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    
    room.game.content.items.push(data.itemDef);
    io.to(currentRoom).emit("game_state", room.game);
    console.log(`[CONTENT] Added custom item: ${data.itemDef.name}`);
  });

  // Добавить кастомный бафф/дебафф
  socket.on("add_custom_buff", (data: { buffDef: BuffDebuff }) => {
    if (!currentRoom || !isHost) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    
    room.game.content.buffs.push(data.buffDef);
    io.to(currentRoom).emit("game_state", room.game);
    console.log(`[CONTENT] Added custom buff: ${data.buffDef.name}`);
  });

  // ==================== УПРАВЛЕНИЕ ИГРОКАМИ ====================

  // Изменить стат игрока
  socket.on("modify_player_stat", (data: { playerId: string; statId: string; change: number }) => {
    if (!currentRoom || !isHost) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    
    const player = room.game.players.find(p => p.id === data.playerId);
    if (!player) return;
    
    // Legacy статы
    if (data.statId === "hp") {
      player.hp = Math.max(0, Math.min(player.maxHp, player.hp + data.change));
    } else if (data.statId === "mana") {
      player.mana = Math.max(0, Math.min(player.maxMana, player.mana + data.change));
    }
    
    // Новые статы
    if (player.stats) {
      const stat = player.stats.find(s => s.statId === data.statId);
      if (stat) {
        stat.current = Math.max(0, Math.min(stat.max, stat.current + data.change));
      }
    }
    
    io.to(currentRoom).emit("game_state", room.game);
    console.log(`[PLAYER] Modified ${data.statId} for ${player.name}: ${data.change > 0 ? '+' : ''}${data.change}`);
  });

  // Добавить бафф игроку
  socket.on("add_player_buff", (data: { playerId: string; buffId: string; duration?: number }) => {
    if (!currentRoom || !isHost) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    
    const player = room.game.players.find(p => p.id === data.playerId);
    if (!player) return;
    
    // Инициализируем массив, если его нет
    if (!player.activeBuffs) {
      player.activeBuffs = [];
    }
    
    // Проверяем, нет ли уже этого баффа
    const existing = player.activeBuffs.find(b => b.buffId === data.buffId);
    if (existing) {
      existing.remainingDuration = data.duration ?? existing.remainingDuration;
    } else {
      player.activeBuffs.push({
        buffId: data.buffId,
        remainingDuration: data.duration ?? -1,
        appliedAt: Date.now()
      });
    }
    
    // Добавляем в legacy status
    if (!player.status.includes(data.buffId)) {
      player.status.push(data.buffId);
    }
    
    io.to(currentRoom).emit("game_state", room.game);
    console.log(`[PLAYER] Added buff ${data.buffId} to ${player.name}`);
  });

  // Удалить бафф у игрока
  socket.on("remove_player_buff", (data: { playerId: string; buffId: string }) => {
    if (!currentRoom || !isHost) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    
    const player = room.game.players.find(p => p.id === data.playerId);
    if (!player) return;
    
    if (player.activeBuffs) {
      player.activeBuffs = player.activeBuffs.filter(b => b.buffId !== data.buffId);
    }
    player.status = player.status.filter(s => s !== data.buffId);
    
    io.to(currentRoom).emit("game_state", room.game);
    console.log(`[PLAYER] Removed buff ${data.buffId} from ${player.name}`);
  });

  // Дать предмет игроку
  socket.on("give_player_item", (data: { playerId: string; itemDefId: string }) => {
    if (!currentRoom || !isHost) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    
    const player = room.game.players.find(p => p.id === data.playerId);
    if (!player) return;
    
    // Ищем определение предмета
    const itemDef = room.game.content.items.find(i => i.id === data.itemDefId);
    
    const item = {
      id: uid(),
      itemDefId: data.itemDefId,
      name: itemDef?.name || data.itemDefId,
      icon: itemDef?.icon || "📦",
      description: itemDef?.description || "",
      type: (itemDef?.type || "misc") as any,
      aiDescription: itemDef?.aiDescription || ""
    };
    
    player.inventory.push(item);
    
    io.to(currentRoom).emit("game_state", room.game);
    console.log(`[PLAYER] Gave item ${item.name} to ${player.name}`);
  });

  // Генерация иконки через ComfyUI
  socket.on("generate_icon", async (data: { prompt: string; requestId: string }) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room || !room.game.settings.comfyEnabled) {
      socket.emit("error", { message: "ComfyUI не включён" });
      return;
    }
    
    console.log(`[ICON] Generating icon: ${data.prompt}`);
    
    try {
      const url = await generateIconWithComfy(room.game.settings.comfyUrl, data.prompt);
      if (url) {
        socket.emit("icon_generated", { url, requestId: data.requestId });
        console.log(`[ICON] Generated: ${url}`);
      } else {
        socket.emit("error", { message: "Не удалось сгенерировать иконку" });
      }
    } catch (err) {
      console.error("[ICON] Error:", err);
      socket.emit("error", { message: "Ошибка генерации иконки" });
    }
  });

  // Отключение
  socket.on("disconnect", () => {
    console.log(`[SOCKET] Disconnected: ${socket.id}`);
    
    if (currentRoom && currentPlayerId) {
      const room = rooms.get(currentRoom);
      if (room) {
        const player = room.game.players.find(p => p.id === currentPlayerId);
        if (player) {
          player.connected = false;
          io.to(currentRoom).emit("player_left", { playerId: currentPlayerId });
          io.to(currentRoom).emit("game_state", room.game);
        }
      }
    }
    
    // Если хост отключился, комната остаётся (можно переподключиться)
    if (currentRoom && isHost) {
      const room = rooms.get(currentRoom);
      if (room) {
        room.hostSocketId = null;
      }
    }
  });
});

// ==================== РАЗРЕШЕНИЕ ХОДА ====================

async function resolveTurn(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room || room.game.phase !== "action") return;
  
  room.game.phase = "resolve";
  io.to(roomCode).emit("resolving_started");
  io.to(roomCode).emit("game_state", room.game);
  
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
  }
  
  const location = getLocation(room.game);
  console.log(`[RESOLVE] Starting for ${roomCode}...`);
  console.log(`[RESOLVE] Location: ${location.name}, Danger: ${location.danger}`);
  console.log(`[RESOLVE] Actions to resolve: ${room.game.pending.length}`);
  
  try {
    // Используем AI Game Master
    if (room.game.settings.llmEnabled) {
      console.log(`[RESOLVE] Using AI Game Master (${room.game.settings.llmModel})...`);
      
      const aiResponse = await resolveWithAI(
        room.game,
        location,
        room.game.settings.llmUrl,
        room.game.settings.llmModel
      );
      
      // Применяем результаты AI
      room.game = applyGameMasterResponse(room.game, aiResponse, location);
      
      console.log(`[RESOLVE] AI Response applied. Evaluations: ${aiResponse.evaluations.length}`);
      
      // Генерация картинки через ComfyUI
      if (room.game.settings.comfyEnabled && aiResponse.imagePrompt) {
        console.log(`[RESOLVE] Generating image with ComfyUI...`);
        try {
          const imageUrl = await generateImageWithComfy(
            room.game.settings.comfyUrl, 
            aiResponse.imagePrompt + ", dark Slavic fantasy illustration, painterly, dramatic lighting"
          );
          if (imageUrl) {
            const lastEntry = room.game.story[room.game.story.length - 1];
            if (lastEntry) {
              lastEntry.imageUrl = imageUrl;
            }
          }
        } catch (err) {
          console.error("[COMFY] Image generation failed:", err);
        }
      }
      
    } else {
      // Офлайн разрешение (без LLM)
      console.log(`[RESOLVE] Using offline resolver (d20)...`);
      const result = resolveOffline(room.game);
      room.game = result.state;
    }
    
    room.game.phase = "result";
    
    io.to(roomCode).emit("turn_resolved", {
      summary: room.game.lastResultSummary,
      imageUrl: room.game.story[room.game.story.length - 1]?.imageUrl
    });
    io.to(roomCode).emit("game_state", room.game);
    
    console.log(`[RESOLVE] Completed for ${roomCode}`);
    
  } catch (err) {
    console.error("[RESOLVE] Error:", err);
    // При ошибке используем офлайн fallback
    console.log(`[RESOLVE] Falling back to offline resolver...`);
    const result = resolveOffline(room.game);
    room.game = result.state;
    room.game.phase = "result";
    io.to(roomCode).emit("game_state", room.game);
  }
}

// ==================== ОФЛАЙН РАЗРЕШЕНИЕ (d20) ====================

function resolveOffline(game: GameState): { state: GameState; summary: string } {
  const newStory: StoryEntry[] = [];
  const results: string[] = [];
  let newState = { ...game, players: [...game.players] };
  
  for (const action of game.pending) {
    const playerIndex = newState.players.findIndex(p => p.id === action.playerId);
    if (playerIndex === -1) continue;
    const player = { ...newState.players[playerIndex] };
    
    // Бросок d20
    const roll = Math.floor(Math.random() * 20) + 1;
    const classBonus: Record<string, number> = { vityaz: 3, vedmak: 2, volhv: 1, vor: 2, skald: 1, zverolog: 2 };
    const mod = (classBonus[player.pclass] || 0) + Math.floor(player.level / 2);
    const total = roll + mod;
    const dc = 10 + getLocation(game).danger * 2;
    
    let success: string;
    let resultText: string;
    let xpGain = 0;
    let hpChange = 0;
    
    if (roll === 20) {
      success = "КРИТ!";
      resultText = `${player.name} превосходит все ожидания! Действие выполнено мастерски.`;
      xpGain = 15;
    } else if (roll === 1) {
      success = "ПРОВАЛ!";
      resultText = `Катастрофа! ${player.name} терпит сокрушительную неудачу.`;
      hpChange = -Math.floor(Math.random() * 4) - 2;
      xpGain = 2;
    } else if (total >= dc) {
      success = "успех";
      resultText = `${player.name} справляется с задачей. Действие выполнено.`;
      xpGain = 8;
    } else {
      success = "неудача";
      resultText = `${player.name} не справляется. Придётся искать другой путь.`;
      xpGain = 3;
      hpChange = roll < 5 ? -2 : 0;
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
    
    // Обновляем игрока
    const newXp = player.xp + xpGain;
    const xpForLevel = player.level * 35;
    const levelUp = newXp >= xpForLevel;
    
    newState.players[playerIndex] = {
      ...player,
      xp: levelUp ? newXp - xpForLevel : newXp,
      level: levelUp ? player.level + 1 : player.level,
      hp: Math.max(1, Math.min(player.maxHp, player.hp + hpChange)),
      maxHp: levelUp ? player.maxHp + 4 : player.maxHp,
      maxMana: levelUp ? player.maxMana + 2 : player.maxMana
    };
  }
  
  // Итоговое событие
  const location = getLocation(game);
  const summaryText = `Ход ${game.turn} завершён. ${results.join(", ")}. Отряд готовится двигаться дальше от ${location.name}.`;
  
  newStory.push({
    id: uid(),
    turn: game.turn,
    type: "narrator",
    text: summaryText,
    imagePrompt: `${location.imagePrompt}, aftermath of battle, heroes`
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

// Старые функции resolveWithLLM и processLLMResponse удалены
// Теперь используется aiGameMaster.ts с умным AI Game Master

// ==================== COMFYUI ГЕНЕРАЦИЯ ====================

async function generateImageWithComfy(comfyUrl: string, prompt: string): Promise<string | null> {
  try {
    // Простой txt2img workflow для ComfyUI
    const workflow = {
      "3": {
        "class_type": "KSampler",
        "inputs": {
          "seed": Math.floor(Math.random() * 1000000),
          "steps": 20,
          "cfg": 7,
          "sampler_name": "euler",
          "scheduler": "normal",
          "denoise": 1,
          "model": ["4", 0],
          "positive": ["6", 0],
          "negative": ["7", 0],
          "latent_image": ["5", 0]
        }
      },
      "4": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {
          "ckpt_name": "v1-5-pruned-emaonly.safetensors"
        }
      },
      "5": {
        "class_type": "EmptyLatentImage",
        "inputs": {
          "width": 512,
          "height": 512,
          "batch_size": 1
        }
      },
      "6": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "text": prompt,
          "clip": ["4", 1]
        }
      },
      "7": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "text": "ugly, blurry, low quality, text, watermark",
          "clip": ["4", 1]
        }
      },
      "8": {
        "class_type": "VAEDecode",
        "inputs": {
          "samples": ["3", 0],
          "vae": ["4", 2]
        }
      },
      "9": {
        "class_type": "SaveImage",
        "inputs": {
          "filename_prefix": "skazochnik",
          "images": ["8", 0]
        }
      }
    };
    
    // Отправляем запрос в ComfyUI
    const response = await fetch(`${comfyUrl}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: workflow })
    });
    
    if (!response.ok) {
      console.error("[COMFY] Request failed:", response.status);
      return null;
    }
    
    const data = await response.json();
    const promptId = data.prompt_id;
    
    // Ждём завершения генерации
    let attempts = 0;
    while (attempts < 60) {
      await new Promise(r => setTimeout(r, 1000));
      
      const historyRes = await fetch(`${comfyUrl}/history/${promptId}`);
      if (historyRes.ok) {
        const history = await historyRes.json();
        if (history[promptId]?.outputs?.["9"]?.images?.[0]) {
          const img = history[promptId].outputs["9"].images[0];
          return `${comfyUrl}/view?filename=${img.filename}&subfolder=${img.subfolder || ""}&type=${img.type || "output"}`;
        }
      }
      attempts++;
    }
    
    return null;
    
  } catch (err) {
    console.error("[COMFY] Error:", err);
    return null;
  }
}

// ==================== ГЕНЕРАЦИЯ ИКОНОК ====================

async function generateIconWithComfy(comfyUrl: string, prompt: string): Promise<string | null> {
  try {
    // Workflow для генерации маленькой иконки
    const iconPrompt = `${prompt}, icon style, game icon, detailed, centered, single object, clean background, fantasy RPG style`;
    
    const workflow = {
      "3": {
        "class_type": "KSampler",
        "inputs": {
          "seed": Math.floor(Math.random() * 1000000),
          "steps": 25,
          "cfg": 8,
          "sampler_name": "euler",
          "scheduler": "normal",
          "denoise": 1,
          "model": ["4", 0],
          "positive": ["6", 0],
          "negative": ["7", 0],
          "latent_image": ["5", 0]
        }
      },
      "4": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {
          "ckpt_name": "v1-5-pruned-emaonly.safetensors"
        }
      },
      "5": {
        "class_type": "EmptyLatentImage",
        "inputs": {
          "width": 128,
          "height": 128,
          "batch_size": 1
        }
      },
      "6": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "text": iconPrompt,
          "clip": ["4", 1]
        }
      },
      "7": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "text": "ugly, blurry, low quality, text, watermark, multiple objects, busy background",
          "clip": ["4", 1]
        }
      },
      "8": {
        "class_type": "VAEDecode",
        "inputs": {
          "samples": ["3", 0],
          "vae": ["4", 2]
        }
      },
      "9": {
        "class_type": "SaveImage",
        "inputs": {
          "filename_prefix": "icon",
          "images": ["8", 0]
        }
      }
    };
    
    const response = await fetch(`${comfyUrl}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: workflow })
    });
    
    if (!response.ok) {
      console.error("[ICON] Request failed:", response.status);
      return null;
    }
    
    const data = await response.json();
    const promptId = data.prompt_id;
    
    // Ждём завершения
    let attempts = 0;
    while (attempts < 30) {
      await new Promise(r => setTimeout(r, 500));
      
      const historyRes = await fetch(`${comfyUrl}/history/${promptId}`);
      if (historyRes.ok) {
        const history = await historyRes.json();
        if (history[promptId]?.outputs?.["9"]?.images?.[0]) {
          const img = history[promptId].outputs["9"].images[0];
          return `${comfyUrl}/view?filename=${img.filename}&subfolder=${img.subfolder || ""}&type=${img.type || "output"}`;
        }
      }
      attempts++;
    }
    
    return null;
    
  } catch (err) {
    console.error("[ICON] Error:", err);
    return null;
  }
}

// ==================== ГЕНЕРАЦИЯ БРИФИНГА ====================

function generateBriefing(location: Location): string {
  const templates = [
    `Отряд приближается к ${location.name}. ${location.blurb} Что предпримут герои?`,
    `Перед вами ${location.name}. ${location.blurb} Опасность здесь оценивается в ${location.danger} из 5.`,
    `Путь привёл героев к месту, известному как ${location.name}. ${location.blurb}`,
    `${location.name} — именно сюда вела судьба. ${location.blurb} Будьте осторожны.`
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

// ==================== ЗАПУСК СЕРВЕРА ====================

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    🎭 СКАЗОЧНИК СЕРВЕР 🎭                    ║
╠══════════════════════════════════════════════════════════════╣
║  HTTP + WebSocket сервер запущен!                            ║
║                                                              ║
║  Локальный адрес:   http://localhost:${PORT}                   ║
║  API Health:        http://localhost:${PORT}/api/health         ║
║                                                              ║
║  Для доступа из интернета используйте ngrok:                 ║
║  ngrok http ${PORT}                                             ║
║                                                              ║
║  После запуска ngrok скопируйте URL (https://xxx.ngrok.io)   ║
║  и укажите его в настройках клиента.                         ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

export { app, io, httpServer };
