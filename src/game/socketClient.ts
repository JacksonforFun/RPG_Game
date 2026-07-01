// ==================== SOCKET.IO КЛИЕНТ ====================

import { io, Socket } from "socket.io-client";
import { GameState, GameSettings, Player, ServerToClientEvents, ClientToServerEvents } from "./types";

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// Состояние соединения
interface ConnectionState {
  socket: TypedSocket | null;
  connected: boolean;
  roomCode: string | null;
  playerId: string | null;
  serverUrl: string;
}

const state: ConnectionState = {
  socket: null,
  connected: false,
  roomCode: null,
  playerId: null,
  serverUrl: getServerUrl()
};

// ==================== ОПРЕДЕЛЕНИЕ URL СЕРВЕРА ====================

function getServerUrl(): string {
  // Проверяем localStorage на наличие кастомного URL
  const savedUrl = localStorage.getItem("skazochnik_server_url");
  if (savedUrl) return savedUrl;
  
  // В продакшене используем тот же хост
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    const host = window.location.hostname;
    
    // Если это localhost — используем порт 3001
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:3001";
    }
    
    // Если ngrok или другой туннель — используем тот же хост
    return `${protocol}//${host}:3001`;
  }
  
  return "http://localhost:3001";
}

// ==================== ПОДКЛЮЧЕНИЕ ====================

export function connect(
  serverUrl?: string,
  callbacks?: {
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: { message: string }) => void;
    onGameState?: (state: GameState) => void;
    onRoomCreated?: (data: { roomCode: string }) => void;
    onRoomJoined?: (data: { roomCode: string; playerId: string }) => void;
    onPlayerJoined?: (data: { player: Player }) => void;
    onPlayerLeft?: (data: { playerId: string }) => void;
    onPlayerReconnected?: (data: { playerId: string }) => void;
    onTurnStarted?: (data: { turn: number; timeLeft: number }) => void;
    onActionSubmitted?: (data: { playerId: string; pending: number; total: number }) => void;
    onResolvingStarted?: () => void;
    onTurnResolved?: (data: { summary: string; imageUrl?: string }) => void;
  }
): TypedSocket {
  // Если уже подключены — отключаемся
  if (state.socket) {
    state.socket.disconnect();
  }
  
  const url = serverUrl || state.serverUrl;
  state.serverUrl = url;
  localStorage.setItem("skazochnik_server_url", url);
  
  console.log(`[SOCKET] Connecting to ${url}...`);
  
  const socket: TypedSocket = io(url, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000
  });
  
  state.socket = socket;
  
  // Базовые события
  socket.on("connect", () => {
    console.log("[SOCKET] Connected!");
    state.connected = true;
    
    // Автоматический реконнект к комнате
    const savedRoom = localStorage.getItem("skazochnik_room");
    const savedPlayerId = localStorage.getItem("skazochnik_player_id");
    
    if (savedRoom && savedPlayerId) {
      console.log(`[SOCKET] Auto-reconnecting to room ${savedRoom} as ${savedPlayerId}`);
      socket.emit("join_room", { roomCode: savedRoom, playerId: savedPlayerId });
    }
    
    callbacks?.onConnect?.();
  });
  
  socket.on("disconnect", () => {
    console.log("[SOCKET] Disconnected");
    state.connected = false;
    callbacks?.onDisconnect?.();
  });
  
  socket.on("connect_error", (error: Error) => {
    console.error("[SOCKET] Connection error:", error);
    callbacks?.onError?.({ message: `Ошибка подключения: ${error.message}` });
  });
  
  // Игровые события
  socket.on("error", (data: { message: string }) => {
    console.error("[SOCKET] Error:", data.message);
    callbacks?.onError?.(data);
  });
  
  socket.on("game_state", (gameState: GameState) => {
    console.log("[SOCKET] Game state received:", gameState.phase, gameState.turn);
    callbacks?.onGameState?.(gameState);
  });
  
  socket.on("room_created", (data: { roomCode: string }) => {
    console.log("[SOCKET] Room created:", data.roomCode);
    state.roomCode = data.roomCode;
    localStorage.setItem("skazochnik_room", data.roomCode);
    callbacks?.onRoomCreated?.(data);
  });
  
  socket.on("room_joined", (data: { roomCode: string; playerId: string }) => {
    console.log("[SOCKET] Room joined:", data.roomCode);
    state.roomCode = data.roomCode;
    localStorage.setItem("skazochnik_room", data.roomCode);
    if (data.playerId) {
      state.playerId = data.playerId;
      localStorage.setItem("skazochnik_player_id", data.playerId);
    }
    callbacks?.onRoomJoined?.(data);
  });
  
  socket.on("player_joined", (data: { player: Player }) => {
    console.log("[SOCKET] Player joined:", data.player.name);
    callbacks?.onPlayerJoined?.(data);
  });
  
  socket.on("player_left", (data: { playerId: string }) => {
    console.log("[SOCKET] Player left:", data.playerId);
    callbacks?.onPlayerLeft?.(data);
  });
  
  socket.on("player_reconnected", (data: { playerId: string }) => {
    console.log("[SOCKET] Player reconnected:", data.playerId);
    callbacks?.onPlayerReconnected?.(data);
  });
  
  socket.on("turn_started", (data: { turn: number; timeLeft: number }) => {
    console.log("[SOCKET] Turn started:", data.turn);
    callbacks?.onTurnStarted?.(data);
  });
  
  socket.on("action_submitted", (data: { playerId: string; pending: number; total: number }) => {
    console.log("[SOCKET] Action submitted:", data.pending, "/", data.total);
    callbacks?.onActionSubmitted?.(data);
  });
  
  socket.on("resolving_started", () => {
    console.log("[SOCKET] Resolving started");
    callbacks?.onResolvingStarted?.();
  });
  
  socket.on("turn_resolved", (data: { summary: string; imageUrl?: string }) => {
    console.log("[SOCKET] Turn resolved:", data.summary);
    callbacks?.onTurnResolved?.(data);
  });
  
  return socket;
}

// ==================== ДЕЙСТВИЯ ====================

export function createRoom(campaignTitle?: string): void {
  if (!state.socket) {
    console.error("[SOCKET] Not connected");
    return;
  }
  state.socket.emit("create_room", { campaignTitle });
}

export function joinRoom(roomCode: string, playerId?: string): void {
  if (!state.socket) {
    console.error("[SOCKET] Not connected");
    return;
  }
  state.socket.emit("join_room", { roomCode: roomCode.toUpperCase(), playerId });
}

export function addPlayer(player: Player): void {
  if (!state.socket) {
    console.error("[SOCKET] Not connected");
    return;
  }
  state.playerId = player.id;
  localStorage.setItem("skazochnik_player_id", player.id);
  state.socket.emit("add_player", { player });
}

export function submitAction(playerId: string, text: string): void {
  if (!state.socket) {
    console.error("[SOCKET] Not connected");
    return;
  }
  state.socket.emit("submit_action", { playerId, text });
}

export function startBriefing(): void {
  if (!state.socket) {
    console.error("[SOCKET] Not connected");
    return;
  }
  state.socket.emit("start_briefing");
}

export function startActionPhase(): void {
  if (!state.socket) {
    console.error("[SOCKET] Not connected");
    return;
  }
  state.socket.emit("start_action_phase");
}

export function resolveTurn(): void {
  if (!state.socket) {
    console.error("[SOCKET] Not connected");
    return;
  }
  state.socket.emit("resolve_turn");
}

export function advanceTurn(): void {
  if (!state.socket) {
    console.error("[SOCKET] Not connected");
    return;
  }
  state.socket.emit("advance_turn");
}

export function updateSettings(settings: Partial<GameSettings>): void {
  if (!state.socket) {
    console.error("[SOCKET] Not connected");
    return;
  }
  state.socket.emit("update_settings", settings);
}

export function resetGame(campaignTitle?: string): void {
  if (!state.socket) {
    console.error("[SOCKET] Not connected");
    return;
  }
  state.socket.emit("reset_game", { campaignTitle });
}

export function addBot(): void {
  if (!state.socket) {
    console.error("[SOCKET] Not connected");
    return;
  }
  state.socket.emit("add_bot");
}

export function testAction(): void {
  if (!state.socket) {
    console.error("[SOCKET] Not connected");
    return;
  }
  state.socket.emit("test_action");
}

export function leaveRoom(): void {
  if (!state.socket) return;
  state.socket.emit("leave_room");
  state.roomCode = null;
  state.playerId = null;
  localStorage.removeItem("skazochnik_room");
  localStorage.removeItem("skazochnik_player_id");
}

export function disconnect(): void {
  if (state.socket) {
    state.socket.disconnect();
    state.socket = null;
  }
  state.connected = false;
}

// ==================== УТИЛИТЫ ====================

export function getSocket(): TypedSocket | null {
  return state.socket;
}

export function isConnected(): boolean {
  return state.connected && state.socket?.connected === true;
}

export function getConnectionState(): ConnectionState {
  return { ...state };
}

export function getStoredPlayerId(): string | null {
  return localStorage.getItem("skazochnik_player_id");
}

export function getStoredRoom(): string | null {
  return localStorage.getItem("skazochnik_room");
}

export function setServerUrl(url: string): void {
  state.serverUrl = url;
  localStorage.setItem("skazochnik_server_url", url);
}

export function getServerUrlFromStorage(): string {
  return localStorage.getItem("skazochnik_server_url") || "http://localhost:3001";
}
