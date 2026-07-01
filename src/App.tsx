import { useEffect, useMemo, useState, useCallback } from "react";
import {
  GameState, Player, PlayerClass, Race,
  PLAYER_CLASSES, RACES
} from "./game/types";
import { createNewGame, getLocation, timeLeft, allSubmitted } from "./game/engine";
import { createPlayer } from "./game/playerUtils";
import * as socket from "./game/socketClient";

const uid = () => Math.random().toString(36).slice(2,9);
const AVATARS = ["🦊","🐺","🦉","🐻","🐉","🦇","🌿","🔥","🌙","⚡","🪶","🪓","🧿","🕯️"];
const COLORS = ["#f59e0b","#f97316","#eab308","#22c55e","#06b6d4","#8b5cf6","#ec4899","#ef4444","#84cc16","#0ea5e9"];

export default function App() {
  const [mode, setMode] = useState<"host"|"player">("host");
  const [game, setGame] = useState<GameState>(createNewGame());
  const [playerId, setPlayerId] = useState<string>(socket.getStoredPlayerId() || "");
  const [resolving, setResolving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [serverUrl, setServerUrl] = useState(socket.getServerUrlFromStorage());
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Подключение к серверу
  const connectToServer = useCallback(() => {
    setConnectionError(null);
    
    socket.connect(serverUrl, {
      onConnect: () => {
        setConnected(true);
        setConnectionError(null);
        
        // Проверяем, есть ли сохранённая комната
        const savedRoom = socket.getStoredRoom();
        const savedPlayerId = socket.getStoredPlayerId();
        
        if (savedRoom) {
          // Пытаемся переподключиться
          socket.joinRoom(savedRoom, savedPlayerId || undefined);
        }
      },
      onDisconnect: () => {
        setConnected(false);
      },
      onError: (err) => {
        setConnectionError(err.message);
      },
      onGameState: (state) => {
        setGame(state);
        setResolving(state.phase === "resolve");
      },
      onRoomCreated: (data) => {
        console.log("Room created:", data.roomCode);
      },
      onRoomJoined: (data) => {
        console.log("Room joined:", data.roomCode);
        if (data.playerId) {
          setPlayerId(data.playerId);
        }
      },
      onResolvingStarted: () => {
        setResolving(true);
      },
      onTurnResolved: () => {
        setResolving(false);
      }
    });
  }, [serverUrl]);

  // Автоподключение при загрузке
  useEffect(() => {
    connectToServer();
    return () => socket.disconnect();
  }, [connectToServer]);

  // Тикер таймера (локальный, для UI)
  useEffect(() => {
    if (game.phase !== "action") return;
    const t = setInterval(() => {
      setGame(g => ({...g})); // force re-render
    }, 1000);
    return () => clearInterval(t);
  }, [game.phase]);

  const me: Player | undefined = useMemo(
    () => game.players.find(p => p.id === playerId), 
    [game.players, playerId]
  );
  
  const tl = timeLeft(game);

  // Действия хоста
  const handleCreateRoom = () => {
    socket.createRoom(game.campaignTitle);
  };

  const handleStartBriefing = () => {
    socket.startBriefing();
  };

  const handleStartAction = () => {
    socket.startActionPhase();
  };

  const handleResolve = () => {
    socket.resolveTurn();
  };

  const handleAdvanceTurn = () => {
    socket.advanceTurn();
  };

  const handleUpdateSettings = (settings: Partial<GameState['settings']>) => {
    socket.updateSettings(settings);
  };

  const handleResetGame = () => {
    socket.resetGame(game.campaignTitle);
  };

  return (
    <div className="min-h-screen bg-[#0f0b09] text-stone-200" style={{fontFamily:"Manrope, system-ui, sans-serif"}}>
      <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Unbounded:wght@600;700;800&family=PT+Serif:ital,wght@0,400;0,700;1,400&display=swap');
      .display { font-family: "Unbounded", Manrope, sans-serif; }
      .serif { font-family: "PT Serif", Georgia, serif; }
      .parch { background: radial-gradient(1200px 600px at 40% -15%, rgba(255,228,169,0.06), transparent 60%), #14100e; }
      .paper { background: linear-gradient(#fdf5e2,#f6e8c7); color:#2b2016; }
      .ink { color:#2a1a0f; }
      .glow { box-shadow: 0 0 40px rgba(255,171,64,0.09), inset 0 1px 0 rgba(255,255,255,.04); }
      `}</style>

      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-amber-900/30 bg-[#120e0b]/90 backdrop-blur">
        <div className="mx-auto max-w-[1320px] px-4 sm:px-8 py-3 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-[#1b120b] font-black display">С</div>
            <div>
              <div className="display text-[15px] sm:text-[17px] tracking-wide">СКАЗОЧНИК</div>
              <div className="text-[11px] text-amber-300/70 -mt-[2px]">Мультиплеер RPG • WebSocket</div>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-2 text-[12px] text-amber-200/70">
            <span className={`px-2 py-1 rounded flex items-center gap-1.5 ${connected ? "bg-emerald-500/20 border border-emerald-600/40 text-emerald-300" : "bg-rose-500/20 border border-rose-600/40 text-rose-300"}`}>
              <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400" : "bg-rose-400"}`}></span>
              {connected ? "Онлайн" : "Офлайн"}
            </span>
            <span className="px-2 py-1 rounded bg-amber-500/10 border border-amber-600/30">Комната {game.roomCode}</span>
            <span className="opacity-70">•</span>
            <span>{game.campaignTitle}</span>
            <span className="opacity-70">•</span>
            <span>Ход {game.turn} / 12</span>
          </div>
          
          <div className="ml-auto flex items-center gap-2">
            <div className="flex rounded-full border border-amber-700/40 bg-black/30 p-1 text-[13px]">
              <button
                onClick={()=>setMode("host")}
                className={`px-3 py-1.5 rounded-full transition ${mode==="host" ? "bg-amber-500 text-[#201306] font-[700]" : "text-amber-200/80 hover:text-amber-100"}`}
              >Экран ведущего</button>
              <button
                onClick={()=>setMode("player")}
                className={`px-3 py-1.5 rounded-full transition ${mode==="player" ? "bg-amber-500 text-[#201306] font-[700]" : "text-amber-200/80 hover:text-amber-100"}`}
              >Телефон игрока</button>
            </div>
            <button onClick={()=>setSettingsOpen(v=>!v)} className="px-3 py-2 rounded-xl text-[12px] border border-amber-800/40 hover:bg-amber-900/20">⚙️</button>
          </div>
        </div>
      </header>

      {/* Connection Error */}
      {connectionError && (
        <div className="bg-rose-950/50 border-b border-rose-800/50 py-3 px-4 text-center">
          <span className="text-rose-300 text-[13px]">⚠️ {connectionError}</span>
          <button 
            onClick={connectToServer} 
            className="ml-3 px-3 py-1 rounded bg-rose-600/30 border border-rose-600/50 text-rose-200 text-[12px] hover:bg-rose-600/40"
          >
            Переподключиться
          </button>
        </div>
      )}

      {/* Settings drawer */}
      {settingsOpen && (
        <div className="border-b border-amber-900/30 bg-[#15100c]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-8 py-5 grid md:grid-cols-4 gap-6 text-[13px]">
            {/* Server Connection */}
            <div className="space-y-3">
              <div className="text-amber-300 font-[700] text-[13px] uppercase tracking-wider">🌐 Сервер</div>
              <input
                className="w-full bg-black/40 border border-amber-800/40 rounded-lg px-3 py-2 outline-none text-[12px]"
                value={serverUrl}
                onChange={e => setServerUrl(e.target.value)}
                placeholder="http://localhost:3001"
              />
              <div className="flex gap-2">
                <button 
                  onClick={connectToServer}
                  className="text-[12px] px-3 py-1.5 rounded bg-amber-600/20 border border-amber-600/40 hover:bg-amber-600/30"
                >
                  Подключиться
                </button>
                <button 
                  onClick={handleCreateRoom}
                  disabled={!connected}
                  className="text-[12px] px-3 py-1.5 rounded bg-emerald-600/20 border border-emerald-600/40 hover:bg-emerald-600/30 disabled:opacity-40"
                >
                  Создать комнату
                </button>
              </div>
              <p className="text-[11px] text-amber-200/60 leading-relaxed">
                Статус: {connected ? <span className="text-emerald-400">подключено</span> : <span className="text-rose-400">отключено</span>}<br/>
                Комната: <b className="text-amber-100">{game.roomCode}</b><br/>
                Игроков: {game.players.length}
              </p>
            </div>

            {/* ComfyUI */}
            <div className="space-y-3">
              <div className="text-amber-300 font-[700] text-[13px] uppercase tracking-wider">🎨 ComfyUI</div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={game.settings.comfyEnabled}
                  onChange={e => handleUpdateSettings({ comfyEnabled: e.target.checked })}
                />
                <span>Генерировать арты</span>
              </label>
              <input
                className="w-full bg-black/40 border border-amber-800/40 rounded-lg px-3 py-2 outline-none"
                value={game.settings.comfyUrl}
                onChange={e => handleUpdateSettings({ comfyUrl: e.target.value })}
                placeholder="http://localhost:8188"
              />
              <p className="text-[11px] text-amber-200/60 leading-relaxed">
                ComfyUI работает на сервере (хост-ПК).<br/>
                Запустите с <code>--enable-cors-header</code>.
              </p>
            </div>

            {/* LLM */}
            <div className="space-y-3">
              <div className="text-amber-300 font-[700] text-[13px] uppercase tracking-wider">🤖 LLM Мастер</div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={game.settings.llmEnabled}
                  onChange={e => handleUpdateSettings({ llmEnabled: e.target.checked })}
                />
                <span>Использовать LLM</span>
              </label>
              <input
                className="w-full bg-black/40 border border-amber-800/40 rounded-lg px-3 py-2 outline-none"
                value={game.settings.llmUrl}
                onChange={e => handleUpdateSettings({ llmUrl: e.target.value })}
                placeholder="http://localhost:11434"
              />
              <input
                className="w-full bg-black/40 border border-amber-800/40 rounded-lg px-3 py-2 outline-none"
                value={game.settings.llmModel}
                onChange={e => handleUpdateSettings({ llmModel: e.target.value })}
                placeholder="llama3.1:8b"
              />
              <p className="text-[11px] text-amber-200/60 leading-relaxed">
                Поддерживается Ollama и OpenAI API.<br/>
                LLM работает на сервере хоста.
              </p>
            </div>

            {/* Game Settings */}
            <div className="space-y-3">
              <div className="text-amber-300 font-[700] text-[13px] uppercase tracking-wider">⚔️ Игра</div>
              <div className="flex items-center gap-3">
                <span>Время хода (сек)</span>
                <input type="number" min={30} max={180}
                  value={game.settings.turnSeconds}
                  onChange={e => handleUpdateSettings({ turnSeconds: parseInt(e.target.value) || 75 })}
                  className="w-20 bg-black/40 border border-amber-800/40 rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={handleResetGame}
                  className="px-3 py-2 rounded-lg bg-rose-900/30 border border-rose-700/40 text-rose-200 text-[12px]"
                >Сбросить игру</button>
                <button
                  onClick={() => {
                    const title = prompt("Название кампании:", game.campaignTitle) || game.campaignTitle;
                    socket.resetGame(title);
                  }}
                  className="px-3 py-2 rounded-lg bg-amber-900/25 border border-amber-700/40 text-amber-200 text-[12px]"
                >Переименовать</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === "host" ? (
        <HostScreen
          game={game}
          connected={connected}
          onCreateRoom={handleCreateRoom}
          onStartBriefing={handleStartBriefing}
          onStartAction={handleStartAction}
          onResolve={handleResolve}
          onAdvanceTurn={handleAdvanceTurn}
          resolving={resolving}
          timeLeft={tl}
          allSubmitted={allSubmitted(game)}
        />
      ) : (
        <PlayerScreen
          game={game}
          me={me}
          playerId={playerId}
          setPlayerId={(id) => {
            setPlayerId(id);
            localStorage.setItem("skazochnik_player_id", id);
          }}
          connected={connected}
          timeLeft={tl}
        />
      )}

      <footer className="border-t border-amber-950 mt-12 py-8 text-center text-[11px] text-amber-200/50">
        Сказочник RPG • Мультиплеер через WebSocket • Node.js + Socket.io + ComfyUI + LLM • 2026
      </footer>
    </div>
  );
}

// ==================== HOST SCREEN ====================

interface HostScreenProps {
  game: GameState;
  connected: boolean;
  onCreateRoom: () => void;
  onStartBriefing: () => void;
  onStartAction: () => void;
  onResolve: () => void;
  onAdvanceTurn: () => void;
  resolving: boolean;
  timeLeft: number;
  allSubmitted: boolean;
}

function HostScreen({ game, connected, onCreateRoom, onStartBriefing, onStartAction, onResolve, onAdvanceTurn, resolving, timeLeft: tl, allSubmitted: allSub }: HostScreenProps) {
  const location = getLocation(game);
  const lastImg = [...game.story].reverse().find(s => s.imageUrl)?.imageUrl;
  
  return (
    <div className="mx-auto max-w-[1320px] px-4 sm:px-8 py-6 sm:py-9 grid grid-cols-12 gap-5">
      {/* Left party panel */}
      <aside className="col-span-12 xl:col-span-3 space-y-4">
        <div className="rounded-[22px] border border-amber-900/35 bg-[#1a140f]/90 glow p-4">
          <div className="flex items-center justify-between">
            <div className="display text-[15px] text-amber-200">Отряд</div>
            <div className="text-[11px] text-amber-300/70">{game.players.length} игроков</div>
          </div>
          <div className="mt-3 space-y-2.5">
            {game.players.length === 0 && (
              <div className="text-[13px] text-amber-200/70">
                Никого нет. Игроки подключаются по коду <b className="text-amber-100">{game.roomCode}</b>.
              </div>
            )}
            {game.players.map(p => (
              <div key={p.id} className={`flex items-center gap-3 rounded-xl border px-3 py-[10px] ${p.connected ? "border-amber-900/30 bg-black/25" : "border-rose-900/30 bg-rose-950/20 opacity-60"}`}>
                <div className="text-[22px]">{p.avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-[650] flex items-center gap-2" style={{color: p.color}}>
                    {p.name}
                    {!p.connected && <span className="text-[10px] text-rose-400">отключён</span>}
                  </div>
                  <div className="text-[11px] text-stone-400">{PLAYER_CLASSES[p.pclass].name} • {RACES[p.race].name} • ур.{p.level}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-rose-300">{p.hp}/{p.maxHp} ♥</div>
                  <div className="text-[10px] text-sky-300">{p.mana}/{p.maxMana} ✦</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[22px] border border-amber-900/35 bg-[#17120f] p-4">
          <div className="display text-[14px] text-amber-200">Локация</div>
          <div className="mt-2 text-[17px] font-[700] text-amber-100">{location.name}</div>
          <div className="text-[12px] text-amber-200/70 mt-1 serif italic">{location.blurb}</div>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
            {location.tags.map(t => (
              <span key={t} className="px-2 py-[3px] rounded-full bg-amber-950/70 border border-amber-800/30 text-amber-300/90">{t}</span>
            ))}
            <span className="px-2 py-[3px] rounded-full bg-rose-950/40 border border-rose-800/30 text-rose-300">опасность {location.danger}</span>
          </div>
        </div>

        <div className="rounded-[22px] border border-amber-900/35 bg-[#17120f] p-4 text-[12.5px] leading-relaxed text-amber-200/80">
          <div className="font-[700] text-amber-200 mb-1">Как играть (Мультиплеер)</div>
          <ol className="list-decimal pl-4 space-y-1">
            <li>Хост создаёт комнату и запускает сервер.</li>
            <li>Игроки заходят с телефонов по URL сервера.</li>
            <li>Вводят код комнаты <b className="text-amber-100">{game.roomCode}</b>.</li>
            <li>Создают персонажа и отправляют действия.</li>
            <li>AI-мастер (LLM) разрешает ходы на сервере.</li>
            <li>ComfyUI генерирует иллюстрации.</li>
          </ol>
        </div>
      </aside>

      {/* Center story */}
      <main className="col-span-12 xl:col-span-6 space-y-4">
        <div className="rounded-[26px] border border-amber-800/35 overflow-hidden bg-[#15100d] glow">
          <div className="relative">
            <div
              className="h-[244px] sm:h-[300px] w-full"
              style={{
                background: lastImg
                  ? `url(${lastImg}) center/cover no-repeat`
                  : "linear-gradient(120deg,#221712,#17100c 55%, #0f0b09)",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#15100d] via-[#15100d]/45 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="text-[11px] tracking-widest text-amber-300/80 uppercase">Кампания</div>
              <div className="display text-[24px] sm:text-[30px] text-amber-100">{game.campaignTitle}</div>
              <div className="text-[12.5px] text-amber-200/70">Глава {Math.max(1, game.turn)} • {location.name}</div>
            </div>
            <div className="absolute top-4 right-4 text-[11px] px-3 py-1 rounded-full bg-black/55 border border-amber-700/30 text-amber-200">
              {game.phase === "lobby" ? "Лобби" : 
               game.phase === "briefing" ? "Брифинг" : 
               game.phase === "action" ? `Ход • ${tl}s` : 
               game.phase === "resolve" ? "Разрешение..." : 
               game.phase === "result" ? "Итоги" : "Финал"}
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-amber-900/35 bg-[#17120f] p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="display text-[15px] text-amber-200">Хроника</div>
            <div className="text-[11px] text-amber-300/70">{game.story.length} записей</div>
          </div>
          <div className="space-y-[14px] max-h-[520px] overflow-auto pr-2">
            {game.story.slice(-80).map((s) => (
              <StoryRow key={s.id} s={s} />
            ))}
          </div>
        </div>
      </main>

      {/* Right control */}
      <aside className="col-span-12 xl:col-span-3 space-y-4">
        <div className="rounded-[22px] border border-amber-800/35 bg-[#1b1510] p-4">
          <div className="display text-[15px] text-amber-200">Комната</div>
          <div className="mt-3 paper rounded-2xl px-4 py-4 text-center ink">
            <div className="text-[11px] tracking-widest text-[#8a6740]">КОД ДЛЯ ТЕЛЕФОНОВ</div>
            <div className="display text-[44px] tracking-wider">{game.roomCode}</div>
            <div className="text-[12px] text-[#785434]">Подключение через сокеты</div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
            <div className="px-3 py-2 rounded-xl bg-black/25 border border-amber-900/30">
              <div className="text-amber-300/70 text-[10px] uppercase">Фаза</div>
              <div className="font-[700]">{game.phase}</div>
            </div>
            <div className="px-3 py-2 rounded-xl bg-black/25 border border-amber-900/30">
              <div className="text-amber-300/70 text-[10px] uppercase">Ход</div>
              <div className="font-[700]">{game.turn} / 12</div>
            </div>
          </div>
        </div>

        <div className="rounded-[22px] border border-amber-900/35 bg-[#17120f] p-4">
          <div className="display text-[15px] text-amber-200 mb-3">Управление ходом</div>
          
          {!connected && (
            <div className="text-center py-4">
              <div className="text-rose-300 text-[13px] mb-2">Нет подключения к серверу</div>
              <button onClick={onCreateRoom} className="px-4 py-2 rounded-xl bg-amber-600 text-white text-[13px]">
                Создать комнату
              </button>
            </div>
          )}
          
          {connected && game.phase === "lobby" && (
            <button onClick={onStartBriefing} className="w-full py-3 rounded-xl bg-amber-500 text-[#1f1206] font-[800] hover:bg-amber-400">
              Начать экспедицию
            </button>
          )}
          
          {connected && game.phase === "briefing" && (
            <button onClick={onStartAction} className="w-full py-3 rounded-xl bg-amber-500 text-[#1f1206] font-[800] hover:bg-amber-400">
              Открыть ввод действий
            </button>
          )}
          
          {connected && game.phase === "action" && (
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-[12px] text-amber-300/80">Осталось</div>
                <div className="display text-[34px] text-amber-100">{tl}s</div>
              </div>
              <div className="text-[12px] text-amber-200/80">
                Сдали: {game.pending.length} / {game.players.length}
                <div className="mt-2 space-y-1">
                  {game.players.map(pl => {
                    const ok = !!game.pending.find(a => a.playerId === pl.id);
                    return (
                      <div key={pl.id} className="flex justify-between">
                        <span style={{color: pl.color}}>{pl.avatar} {pl.name}</span>
                        <span className={ok ? "text-emerald-400" : "text-amber-400"}>{ok ? "готово" : "печатает…"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <button
                disabled={(!allSub && tl > 5) || resolving}
                onClick={onResolve}
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-[760] disabled:opacity-40 hover:bg-emerald-500"
              >
                {resolving ? "Мастер думает…" : allSub ? "Разрешить ход" : "Принудительно разрешить"}
              </button>
            </div>
          )}
          
          {connected && game.phase === "resolve" && (
            <div className="text-center py-4">
              <div className="text-amber-300 animate-pulse">🎲 Мастер разрешает ход...</div>
            </div>
          )}
          
          {connected && game.phase === "result" && (
            <div className="space-y-3">
              <div className="text-[13px] text-amber-200/90 serif italic">«{game.lastResultSummary}»</div>
              <button onClick={onAdvanceTurn} className="w-full py-3 rounded-xl bg-amber-500 text-[#1f1206] font-[800] hover:bg-amber-400">
                Следующий ход →
              </button>
            </div>
          )}
          
          {game.phase === "finished" && (
            <div className="text-center text-amber-200 py-4">Кампания завершена. Новая игра?</div>
          )}

          <div className="mt-4 pt-4 border-t border-amber-900/30 text-[11.5px] text-amber-300/70 leading-relaxed">
            Сервер: {connected ? <b className="text-emerald-300">подключён</b> : <b className="text-rose-400">отключён</b>}<br/>
            LLM: {game.settings.llmEnabled ? <b className="text-emerald-300">включён</b> : "офлайн d20"}<br/>
            ComfyUI: {game.settings.comfyEnabled ? <b className="text-amber-300">включён</b> : "выкл"}
          </div>
        </div>

        <div className="rounded-[22px] border border-amber-900/35 bg-[#17120f] p-4 text-[12px]">
          <div className="font-[700] text-amber-200 mb-2">Быстрые действия</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => socket.addBot()}
              disabled={!connected}
              className="px-3 py-2 rounded-lg bg-black/30 border border-amber-900/30 hover:bg-black/45 disabled:opacity-40"
            >+ Бот игрок</button>
            <button
              onClick={() => socket.testAction()}
              disabled={!connected || game.phase !== "action"}
              className="px-3 py-2 rounded-lg bg-black/30 border border-amber-900/30 hover:bg-black/45 disabled:opacity-40"
            >Тест-действие</button>
          </div>
        </div>
      </aside>
    </div>
  );
}

// ==================== STORY ROW ====================

function StoryRow({ s }: { s: GameState['story'][0] }) {
  const colorMap: Record<string, string> = {
    narrator: "text-amber-100",
    action: "text-stone-200",
    dice: "text-sky-300",
    result: "text-emerald-300",
    event: "text-amber-300",
    loot: "text-violet-300",
    combat: "text-rose-300",
    system: "text-stone-400"
  };
  
  return (
    <div className="text-[14px] leading-[1.55]">
      <div className={`${colorMap[s.type] ?? "text-stone-200"}`}>
        {s.author && (
          <span className="font-[700] mr-2" style={{color: s.authorColor || undefined}}>{s.author}:</span>
        )}
        <span className={s.type === "narrator" ? "serif italic" : ""}>{s.text}</span>
      </div>
      {s.rolls && s.rolls.length > 0 && (
        <div className="mt-1 text-[11px] text-sky-300/80">
          {s.rolls.map((r, i) => (
            <span key={i} className="mr-3">🎲 {r.roll}+{r.mod}={r.total} vs {r.dc} • {r.success}</span>
          ))}
        </div>
      )}
      {s.imageUrl && (
        <img src={s.imageUrl} alt="" className="mt-2 rounded-xl border border-amber-900/30 max-h-[220px] object-cover"/>
      )}
    </div>
  );
}

// ==================== PLAYER SCREEN ====================

interface PlayerScreenProps {
  game: GameState;
  me?: Player;
  playerId: string;
  setPlayerId: (id: string) => void;
  connected: boolean;
  timeLeft: number;
}

function PlayerScreen({ game, me, playerId, setPlayerId, connected, timeLeft: tl }: PlayerScreenProps) {
  const [joinCode, setJoinCode] = useState(game.roomCode);
  const [draft, setDraft] = useState("");
  const [name, setName] = useState("");
  const [pclass, setPclass] = useState<PlayerClass>("vityaz");
  const [race, setRace] = useState<Race>("chelovek");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [color, setColor] = useState(COLORS[0]);

  const submitted = me ? !!game.pending.find(p => p.playerId === me.id) : false;

  // Присоединение к комнате
  const handleJoinRoom = () => {
    if (!connected) return;
    socket.joinRoom(joinCode.toUpperCase());
  };

  // Создание персонажа
  const handleCreateCharacter = () => {
    if (!connected || !name.trim()) return;
    
    const id = playerId || "p_" + uid();
    setPlayerId(id);
    
    // Используем новую функцию createPlayer
    const newPlayer = createPlayer({
      id,
      name: name.trim(),
      classId: pclass,
      raceId: race,
      avatar,
      color,
      customContent: game.content
    });
    
    socket.addPlayer(newPlayer);
  };

  // Отправка действия
  const handleSubmitAction = () => {
    if (!me || !draft.trim()) return;
    socket.submitAction(me.id, draft.trim());
  };

  if (!me) {
    // Join / Create character screen
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[430px] rounded-[28px] border border-amber-900/35 bg-[#15100d] shadow-[0_25px_80px_rgba(0,0,0,.55)] overflow-hidden">
          <div className="px-5 pt-5 pb-4">
            <div className="text-[12px] text-amber-300/80 tracking-wider uppercase">Телефон игрока</div>
            <div className="display text-[22px] text-amber-100 mt-1">Вход в Сказочник</div>
            {!connected && (
              <div className="mt-2 text-[12px] text-rose-400">⚠️ Нет подключения к серверу</div>
            )}
          </div>
          
          <div className="px-5 pb-5 space-y-5">
            <div>
              <div className="text-[12px] text-amber-200/80 mb-2">Код комнаты</div>
              <div className="flex gap-2">
                <input 
                  value={joinCode} 
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  className="flex-1 text-center tracking-[0.35em] text-[22px] py-3 rounded-2xl bg-black/35 border border-amber-800/40 outline-none text-amber-100"
                  placeholder="XXXX"
                  maxLength={6}
                />
                <button
                  onClick={handleJoinRoom}
                  disabled={!connected || joinCode.length < 4}
                  className="px-4 py-3 rounded-2xl bg-amber-600 text-white font-[700] disabled:opacity-40"
                >
                  →
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[12px] text-amber-200/80 mb-1">Имя героя</div>
                <input 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  className="w-full rounded-xl bg-black/35 border border-amber-800/40 px-3 py-[10px] outline-none"
                  placeholder="Ильмар"
                  maxLength={18}
                />
              </div>
              <div>
                <div className="text-[12px] text-amber-200/80 mb-1">Аватар</div>
                <div className="flex gap-1.5 flex-wrap">
                  {AVATARS.slice(0, 8).map(a => (
                    <button 
                      key={a} 
                      onClick={() => setAvatar(a)}
                      className={`w-9 h-9 rounded-lg border text-[18px] ${avatar === a ? "border-amber-400 bg-amber-500/15" : "border-amber-900/40 bg-black/20"}`}
                    >{a}</button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="text-[12px] text-amber-200/80 mb-1">Класс</div>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(PLAYER_CLASSES) as PlayerClass[]).map(k => {
                  const c = PLAYER_CLASSES[k];
                  return (
                    <button 
                      key={k} 
                      onClick={() => setPclass(k)}
                      className={`text-left rounded-xl px-3 py-[10px] border transition ${pclass === k ? "border-amber-400 bg-amber-500/10" : "border-amber-900/35 bg-black/20 hover:bg-black/30"}`}
                    >
                      <div className="text-[15px]">{c.icon} <b>{c.name}</b></div>
                      <div className="text-[11px] text-amber-200/70">{c.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-[12px] text-amber-200/80 mb-1">Раса</div>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(RACES) as Race[]).map(r => {
                  const rc = RACES[r];
                  return (
                    <button 
                      key={r} 
                      onClick={() => setRace(r)}
                      className={`px-3 py-[8px] rounded-full text-[12px] border ${race === r ? "border-amber-400 bg-amber-500/15 text-amber-100" : "border-amber-900/35 bg-black/25 text-amber-200/85"}`}
                    >
                      {rc.icon} {rc.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-[12px] text-amber-200/80 mb-2">Цвет имени</div>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button 
                    key={c} 
                    onClick={() => setColor(c)} 
                    style={{background: c}}
                    className={`w-7 h-7 rounded-full border-2 ${color === c ? "border-white" : "border-black/40"}`}
                  />
                ))}
              </div>
            </div>

            <button
              disabled={!name.trim() || !connected}
              onClick={handleCreateCharacter}
              className="w-full py-[14px] rounded-2xl bg-amber-500 text-[#1b1206] font-[800] text-[16px] disabled:opacity-45"
            >
              Войти в отряд
            </button>

            <div className="text-[11px] text-amber-200/60 text-center leading-relaxed">
              Мультиплеер через WebSocket.<br/>
              Подключение: {connected ? <span className="text-emerald-400">активно</span> : <span className="text-rose-400">отсутствует</span>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Player in-game
  const loc = getLocation(game);
  
  return (
    <div className="mx-auto max-w-[520px] px-4 py-7 sm:py-10">
      <div className="rounded-[30px] border border-amber-900/40 bg-[#17120f] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 bg-gradient-to-b from-[#241a14] to-[#17120f] border-b border-amber-900/30">
          <div className="flex items-center gap-3">
            <div className="text-[30px]">{me.avatar}</div>
            <div className="flex-1">
              <div className="text-[18px] font-[750]" style={{color: me.color}}>{me.name}</div>
              <div className="text-[12px] text-amber-200/70">{PLAYER_CLASSES[me.pclass].name} • {RACES[me.race].name} • ур.{me.level}</div>
            </div>
            <div className="text-right text-[11px]">
              <div className="text-rose-300">{me.hp}/{me.maxHp} ♥</div>
              <div className="text-sky-300">{me.mana}/{me.maxMana} ✦</div>
              <div className="text-amber-300">{me.gold} 🪙</div>
            </div>
          </div>
          <div className="mt-3 h-[6px] rounded-full bg-black/40 overflow-hidden">
            <div className="h-full bg-emerald-500" style={{width: `${Math.max(4, (me.xp % (me.level * 35)) / (me.level * 35) * 100)}%`}}/>
          </div>
          <div className="text-[10px] text-amber-300/70 mt-1">XP {me.xp} / {me.level * 35}</div>
        </div>

        <div className="px-5 py-4 border-b border-amber-900/25 bg-black/20">
          <div className="text-[11px] uppercase tracking-wider text-amber-300/80">{loc.name}</div>
          <div className="text-[13px] text-amber-200/75 serif italic">{loc.blurb}</div>
        </div>

        {/* Phase content */}
        <div className="px-5 py-5 space-y-4">
          {game.phase === "lobby" && (
            <div className="text-center py-6">
              <div className="text-[15px] text-amber-200">Ждём старта экспедиции</div>
              <div className="text-[12px] text-amber-300/70 mt-1">Ведущий запустит приключение с большого экрана.</div>
              <div className="mt-4 text-[11px]">Игроков в лобби: {game.players.length}</div>
            </div>
          )}

          {game.phase === "briefing" && (
            <div className="py-2 text-[14px] leading-relaxed">
              {game.story.slice(-1)[0]?.text}
              <div className="mt-4 text-center text-amber-300 text-[13px]">Готовься. Скоро ввод действий.</div>
            </div>
          )}

          {game.phase === "action" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-amber-200 text-[14px] font-[600]">Твой ход</div>
                <div className={`text-[13px] px-2.5 py-1 rounded-full border ${tl < 15 ? "border-rose-700 text-rose-300 bg-rose-950/30" : "border-amber-700 text-amber-200 bg-amber-950/30"}`}>
                  ⏳ {tl}s
                </div>
              </div>
              <div className="text-[12.5px] text-amber-200/80">
                Опиши действие <b>одним предложением</b>. Мастер бросит d20.
              </div>
              <textarea
                value={submitted ? (game.pending.find(p => p.playerId === me.id)?.text ?? draft) : draft}
                onChange={e => setDraft(e.target.value)}
                disabled={submitted}
                maxLength={240}
                rows={4}
                placeholder="Например: бросаюсь к алтарю, срываю амулет и читаю вслух старое имя…"
                className="w-full rounded-2xl bg-[#0f0b09] border border-amber-800/40 px-4 py-3 text-[15px] outline-none focus:border-amber-500 disabled:opacity-70"
              />
              <div className="flex items-center justify-between text-[11px] text-amber-300/70">
                <span>{draft.length}/240</span>
                <span>{submitted ? "сдано ✓" : "не сдано"}</span>
              </div>
              {!submitted ? (
                <button
                  onClick={handleSubmitAction}
                  disabled={!draft.trim()}
                  className="w-full py-[13px] rounded-2xl bg-emerald-600 text-white font-[750] text-[15px] disabled:opacity-40"
                >
                  Отправить действие
                </button>
              ) : (
                <div className="text-center text-emerald-300 text-[13px] py-2">
                  Действие сдано. Ждём остальных… {game.pending.length}/{game.players.length}
                </div>
              )}

              <div className="pt-2 border-t border-amber-900/30 text-[12px] text-amber-200/70 leading-relaxed">
                Подсказки: <i>атаковать, колдовать, лечить, красться, убеждать, осматривать</i>
              </div>
            </div>
          )}

          {game.phase === "resolve" && (
            <div className="text-center py-8">
              <div className="text-[16px] text-amber-300 animate-pulse">🎲 Мастер разрешает ход...</div>
            </div>
          )}

          {game.phase === "result" && (
            <div className="space-y-3">
              <div className="text-[13px] text-amber-300">Ход разрешён</div>
              <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
                {game.story.filter(s => s.turn === game.turn).map(s => (
                  <div key={s.id} className="text-[13.5px]">
                    <span className="text-amber-200/90">{s.text}</span>
                  </div>
                ))}
              </div>
              <div className="text-[12px] text-amber-300/80">Жди следующего хода от ведущего.</div>
            </div>
          )}

          {game.phase === "finished" && (
            <div className="text-center py-6">
              <div className="display text-[20px] text-amber-100">Кампания завершена</div>
              <div className="mt-2 text-[13px] text-amber-200/80">Спасибо за игру, {me.name}!</div>
            </div>
          )}
        </div>

        {/* Inventory */}
        <div className="px-5 py-4 border-t border-amber-900/30 bg-black/15">
          <div className="text-[11px] text-amber-300/80 mb-2 uppercase tracking-wide">Инвентарь</div>
          {me.inventory.length === 0 ? (
            <div className="text-[12px] text-amber-200/60">Пусто. Добыча приходит за смелые ходы.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {me.inventory.map(it => (
                <div key={it.id} title={it.description} className="px-3 py-[7px] rounded-xl text-[12px] bg-black/35 border border-amber-900/35">
                  {it.icon} {it.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent log */}
      <div className="mt-5 rounded-[22px] border border-amber-900/30 bg-[#15110e] p-4">
        <div className="text-[12px] text-amber-300 mb-2 uppercase tracking-wider">Хроника отряда</div>
        <div className="space-y-[10px] text-[13px] max-h-[300px] overflow-auto">
          {game.story.slice(-14).map(s => (
            <div key={s.id} className="text-stone-300">
              {s.author && <b style={{color: s.authorColor || undefined}} className="mr-1">{s.author}:</b>}
              {s.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
