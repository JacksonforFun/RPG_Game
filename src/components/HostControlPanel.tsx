// ==================== ПАНЕЛЬ УПРАВЛЕНИЯ ХОСТА ====================
// Управление игрой, игроками, контентом

import { useState } from "react";
import {
  GameState, ClassDefinition, RaceDefinition,
  ItemDefinition, BuffDebuff, DEFAULT_BUFFS, DEFAULT_ITEMS
} from "../game/types";
import { ClassEditor, RaceEditor, ItemEditor, BuffEditor, Modal } from "./ContentEditor";

interface HostControlPanelProps {
  game: GameState;
  connected: boolean;
  onCreateRoom: () => void;
  onStartBriefing: () => void;
  onStartAction: () => void;
  onResolve: () => void;
  onAdvanceTurn: () => void;
  onAddBot: () => void;
  onTestAction: () => void;
  onAddCustomClass: (classDef: ClassDefinition) => void;
  onAddCustomRace: (raceDef: RaceDefinition) => void;
  onAddCustomItem: (itemDef: ItemDefinition) => void;
  onAddCustomBuff: (buffDef: BuffDebuff) => void;
  onModifyPlayerStat: (playerId: string, statId: string, change: number) => void;
  onAddPlayerBuff: (playerId: string, buffId: string, duration?: number) => void;
  onRemovePlayerBuff: (playerId: string, buffId: string) => void;
  onGivePlayerItem: (playerId: string, itemDefId: string) => void;
  onGenerateIcon?: (prompt: string, callback: (url: string) => void) => void;
  resolving: boolean;
  timeLeft: number;
  allSubmitted: boolean;
}

export function HostControlPanel({
  game,
  connected,
  onCreateRoom,
  onStartBriefing,
  onStartAction,
  onResolve,
  onAdvanceTurn,
  onAddBot,
  onTestAction,
  onAddCustomClass,
  onAddCustomRace,
  onAddCustomItem,
  onAddCustomBuff,
  onModifyPlayerStat,
  onAddPlayerBuff,
  onRemovePlayerBuff,
  onGivePlayerItem,
  onGenerateIcon,
  resolving,
  timeLeft,
  allSubmitted
}: HostControlPanelProps) {
  const [activeTab, setActiveTab] = useState<"game" | "players" | "content">("game");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  
  // Модалки
  const [showClassEditor, setShowClassEditor] = useState(false);
  const [showRaceEditor, setShowRaceEditor] = useState(false);
  const [showItemEditor, setShowItemEditor] = useState(false);
  const [showBuffEditor, setShowBuffEditor] = useState(false);
  
  // Получаем все баффы и предметы
  const allBuffs = [...DEFAULT_BUFFS, ...(game.content.buffs || [])];
  const allItems = [...DEFAULT_ITEMS, ...(game.content.items || [])];
  
  const selectedPlayer = game.players.find(p => p.id === selectedPlayerId);
  
  return (
    <div className="space-y-4">
      {/* Табы */}
      <div className="flex rounded-xl border border-amber-900/40 bg-black/20 p-1">
        {[
          { id: "game", label: "⚔️ Игра" },
          { id: "players", label: "👥 Игроки" },
          { id: "content", label: "📦 Контент" }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2 px-3 rounded-lg text-[13px] transition-all
              ${activeTab === tab.id ? "bg-amber-500 text-[#1a1206] font-bold" : "text-amber-200/70 hover:text-amber-100"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* TAB: Игра */}
      {activeTab === "game" && (
        <div className="space-y-4">
          {/* Код комнаты */}
          <div className="paper rounded-2xl px-4 py-4 text-center ink">
            <div className="text-[11px] tracking-widest text-[#8a6740]">КОД КОМНАТЫ</div>
            <div className="display text-[44px] tracking-wider">{game.roomCode}</div>
          </div>
          
          {/* Статус */}
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="px-3 py-2 rounded-xl bg-black/25 border border-amber-900/30">
              <div className="text-amber-300/70 text-[10px] uppercase">Фаза</div>
              <div className="font-[700]">{game.phase}</div>
            </div>
            <div className="px-3 py-2 rounded-xl bg-black/25 border border-amber-900/30">
              <div className="text-amber-300/70 text-[10px] uppercase">Ход</div>
              <div className="font-[700]">{game.turn} / 12</div>
            </div>
          </div>
          
          {/* Управление */}
          <div className="space-y-3">
            {!connected && (
              <button onClick={onCreateRoom} className="w-full py-3 rounded-xl bg-amber-600 text-white font-bold">
                Создать комнату
              </button>
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
              <>
                <div className="text-center">
                  <div className="text-[12px] text-amber-300/80">Осталось</div>
                  <div className="display text-[34px] text-amber-100">{timeLeft}s</div>
                </div>
                <div className="text-[12px] text-amber-200/80">
                  Сдали: {game.pending.length} / {game.players.length}
                </div>
                <button
                  disabled={(!allSubmitted && timeLeft > 5) || resolving}
                  onClick={onResolve}
                  className="w-full py-3 rounded-xl bg-emerald-600 text-white font-[760] disabled:opacity-40"
                >
                  {resolving ? "Мастер думает…" : "Разрешить ход"}
                </button>
              </>
            )}
            
            {connected && game.phase === "result" && (
              <button onClick={onAdvanceTurn} className="w-full py-3 rounded-xl bg-amber-500 text-[#1f1206] font-[800]">
                Следующий ход →
              </button>
            )}
          </div>
          
          {/* Быстрые действия */}
          <div className="pt-3 border-t border-amber-900/30">
            <div className="text-[12px] text-amber-300 mb-2">Тестирование</div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={onAddBot} disabled={!connected} className="px-3 py-2 rounded-lg bg-black/30 border border-amber-900/30 text-[12px] disabled:opacity-40">
                + Бот
              </button>
              <button onClick={onTestAction} disabled={!connected || game.phase !== "action"} className="px-3 py-2 rounded-lg bg-black/30 border border-amber-900/30 text-[12px] disabled:opacity-40">
                Тест-действие
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* TAB: Игроки */}
      {activeTab === "players" && (
        <div className="space-y-3">
          {/* Список игроков */}
          <div className="space-y-2">
            {game.players.map(player => (
              <button
                key={player.id}
                onClick={() => setSelectedPlayerId(player.id === selectedPlayerId ? null : player.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all
                  ${selectedPlayerId === player.id ? "border-amber-500 bg-amber-500/10" : "border-amber-900/30 bg-black/20"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{player.avatar}</div>
                  <div className="flex-1">
                    <div className="font-bold" style={{ color: player.color }}>{player.name}</div>
                    <div className="text-[11px] text-amber-200/60">
                      {player.pclass} • ур.{player.level}
                    </div>
                  </div>
                  <div className="text-right text-[11px]">
                    <div className="text-rose-300">HP {player.hp}/{player.maxHp}</div>
                    <div className="text-sky-300">MP {player.mana}/{player.maxMana}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          {/* Редактор выбранного игрока */}
          {selectedPlayer && (
            <div className="p-4 rounded-xl border border-amber-800/40 bg-black/30 space-y-4">
              <h3 className="font-bold text-amber-200">{selectedPlayer.avatar} {selectedPlayer.name}</h3>
              
              {/* Статы */}
              <div>
                <div className="text-[12px] text-amber-300 mb-2">Статы</div>
                <div className="grid grid-cols-2 gap-2">
                  {selectedPlayer.stats.map(stat => (
                    <div key={stat.statId} className="flex items-center gap-2">
                      <span className="text-[12px] text-amber-200/70 flex-1">{stat.statId}</span>
                      <button
                        onClick={() => onModifyPlayerStat(selectedPlayer.id, stat.statId, -1)}
                        className="w-6 h-6 rounded bg-rose-500/20 text-rose-300 text-[14px]"
                      >−</button>
                      <span className="w-12 text-center text-[12px]">{stat.current}/{stat.max}</span>
                      <button
                        onClick={() => onModifyPlayerStat(selectedPlayer.id, stat.statId, 1)}
                        className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-300 text-[14px]"
                      >+</button>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Баффы */}
              <div>
                <div className="text-[12px] text-amber-300 mb-2">Баффы/Дебаффы</div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {selectedPlayer.activeBuffs.map(buff => {
                    const buffDef = allBuffs.find(b => b.id === buff.buffId);
                    return (
                      <span key={buff.buffId} className={`px-2 py-1 rounded-full text-[11px] flex items-center gap-1 ${buffDef?.isDebuff ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-300"}`}>
                        {buffDef?.icon} {buffDef?.name || buff.buffId}
                        <button onClick={() => onRemovePlayerBuff(selectedPlayer.id, buff.buffId)} className="hover:text-white">×</button>
                      </span>
                    );
                  })}
                </div>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      onAddPlayerBuff(selectedPlayer.id, e.target.value);
                      e.target.value = "";
                    }
                  }}
                  className="w-full px-3 py-2 bg-black/30 border border-amber-800/40 rounded-lg text-[12px]"
                >
                  <option value="">+ Добавить эффект...</option>
                  {allBuffs.map(buff => (
                    <option key={buff.id} value={buff.id}>
                      {buff.icon} {buff.name} {buff.isDebuff ? "(дебафф)" : "(бафф)"}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Предметы */}
              <div>
                <div className="text-[12px] text-amber-300 mb-2">Инвентарь</div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {selectedPlayer.inventory.map(item => (
                    <span key={item.id} className="px-2 py-1 bg-amber-500/20 rounded-lg text-[11px]">
                      {item.icon} {item.name}
                    </span>
                  ))}
                </div>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      onGivePlayerItem(selectedPlayer.id, e.target.value);
                      e.target.value = "";
                    }
                  }}
                  className="w-full px-3 py-2 bg-black/30 border border-amber-800/40 rounded-lg text-[12px]"
                >
                  <option value="">+ Дать предмет...</option>
                  {allItems.map(item => (
                    <option key={item.id} value={item.id}>{item.icon} {item.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* TAB: Контент */}
      {activeTab === "content" && (
        <div className="space-y-4">
          {/* Классы */}
          <div className="p-3 rounded-xl border border-amber-900/30 bg-black/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] text-amber-200 font-medium">⚔️ Классы</span>
              <button
                onClick={() => setShowClassEditor(true)}
                className="px-3 py-1 bg-amber-600/30 border border-amber-600/50 rounded-lg text-[11px]"
              >
                + Создать
              </button>
            </div>
            <div className="text-[11px] text-amber-200/60">
              Базовых: 6 • Кастомных: {game.content.classes?.length || 0}
            </div>
          </div>
          
          {/* Расы */}
          <div className="p-3 rounded-xl border border-amber-900/30 bg-black/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] text-amber-200 font-medium">👤 Расы</span>
              <button
                onClick={() => setShowRaceEditor(true)}
                className="px-3 py-1 bg-amber-600/30 border border-amber-600/50 rounded-lg text-[11px]"
              >
                + Создать
              </button>
            </div>
            <div className="text-[11px] text-amber-200/60">
              Базовых: 5 • Кастомных: {game.content.races?.length || 0}
            </div>
          </div>
          
          {/* Предметы */}
          <div className="p-3 rounded-xl border border-amber-900/30 bg-black/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] text-amber-200 font-medium">🎒 Предметы</span>
              <button
                onClick={() => setShowItemEditor(true)}
                className="px-3 py-1 bg-amber-600/30 border border-amber-600/50 rounded-lg text-[11px]"
              >
                + Создать
              </button>
            </div>
            <div className="text-[11px] text-amber-200/60">
              Базовых: 3 • Кастомных: {game.content.items?.length || 0}
            </div>
          </div>
          
          {/* Баффы/дебаффы */}
          <div className="p-3 rounded-xl border border-amber-900/30 bg-black/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] text-amber-200 font-medium">✨ Баффы/Дебаффы</span>
              <button
                onClick={() => setShowBuffEditor(true)}
                className="px-3 py-1 bg-amber-600/30 border border-amber-600/50 rounded-lg text-[11px]"
              >
                + Создать
              </button>
            </div>
            <div className="text-[11px] text-amber-200/60">
              Базовых: 8 • Кастомных: {game.content.buffs?.length || 0}
            </div>
          </div>
        </div>
      )}
      
      {/* Модалки */}
      <Modal isOpen={showClassEditor} onClose={() => setShowClassEditor(false)} title="Новый класс">
        <ClassEditor
          onSave={(c) => { onAddCustomClass(c); setShowClassEditor(false); }}
          onCancel={() => setShowClassEditor(false)}
          onGenerateIcon={onGenerateIcon ? (p) => onGenerateIcon(p, console.log) : undefined}
        />
      </Modal>
      
      <Modal isOpen={showRaceEditor} onClose={() => setShowRaceEditor(false)} title="Новая раса">
        <RaceEditor
          onSave={(r) => { onAddCustomRace(r); setShowRaceEditor(false); }}
          onCancel={() => setShowRaceEditor(false)}
          onGenerateIcon={onGenerateIcon ? (p) => onGenerateIcon(p, console.log) : undefined}
        />
      </Modal>
      
      <Modal isOpen={showItemEditor} onClose={() => setShowItemEditor(false)} title="Новый предмет">
        <ItemEditor
          onSave={(i) => { onAddCustomItem(i); setShowItemEditor(false); }}
          onCancel={() => setShowItemEditor(false)}
          onGenerateIcon={onGenerateIcon ? (p) => onGenerateIcon(p, console.log) : undefined}
        />
      </Modal>
      
      <Modal isOpen={showBuffEditor} onClose={() => setShowBuffEditor(false)} title="Новый эффект">
        <BuffEditor
          onSave={(b) => { onAddCustomBuff(b); setShowBuffEditor(false); }}
          onCancel={() => setShowBuffEditor(false)}
          onGenerateIcon={onGenerateIcon ? (p) => onGenerateIcon(p, console.log) : undefined}
        />
      </Modal>
    </div>
  );
}

export default HostControlPanel;
