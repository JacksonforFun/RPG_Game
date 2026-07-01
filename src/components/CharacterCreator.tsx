// ==================== СОЗДАНИЕ ПЕРСОНАЖА ====================
// Отдельный экран для создания персонажа с кастомными классами/расами

import { useState } from "react";
import {
  Player, ClassDefinition, RaceDefinition,
  DEFAULT_CLASSES, DEFAULT_RACES, GameContent
} from "../game/types";
import { createPlayer } from "../game/playerUtils";
import { ClassEditor, RaceEditor, Modal } from "./ContentEditor";

const uid = () => Math.random().toString(36).slice(2, 9);

const AVATARS = ["🦊","🐺","🦉","🐻","🐉","🦇","🌿","🔥","🌙","⚡","🪶","🪓","🧿","🕯️","🗡️","⚔️","🛡️","🏹","✨","💀"];
const COLORS = ["#f59e0b","#f97316","#eab308","#22c55e","#06b6d4","#8b5cf6","#ec4899","#ef4444","#84cc16","#0ea5e9","#14b8a6","#f43f5e"];

interface CharacterCreatorProps {
  gameContent: GameContent;
  onCreateCharacter: (player: Player) => void;
  onAddCustomClass?: (classDef: ClassDefinition) => void;
  onAddCustomRace?: (raceDef: RaceDefinition) => void;
  onGenerateIcon?: (prompt: string, callback: (url: string) => void) => void;
  existingPlayerId?: string;
}

export function CharacterCreator({
  gameContent,
  onCreateCharacter,
  onAddCustomClass,
  onAddCustomRace,
  onGenerateIcon
}: CharacterCreatorProps) {
  // Состояние формы
  const [step, setStep] = useState<"class" | "race" | "details">("class");
  const [selectedClassId, setSelectedClassId] = useState<string>("vityaz");
  const [selectedRaceId, setSelectedRaceId] = useState<string>("chelovek");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [color, setColor] = useState(COLORS[0]);
  
  // Модалки для создания кастомного контента
  const [showClassEditor, setShowClassEditor] = useState(false);
  const [showRaceEditor, setShowRaceEditor] = useState(false);
  
  // Получаем все классы и расы
  const allClasses = [...DEFAULT_CLASSES, ...(gameContent.classes || [])];
  const allRaces = [...DEFAULT_RACES, ...(gameContent.races || [])];
  
  // Выбранный класс и раса
  const selectedClass = allClasses.find(c => c.id === selectedClassId);
  const selectedRace = allRaces.find(r => r.id === selectedRaceId);
  
  // Создание персонажа
  const handleCreate = () => {
    if (!name.trim()) {
      alert("Введите имя персонажа");
      return;
    }
    
    const player = createPlayer({
      id: "p_" + uid(),
      name: name.trim(),
      classId: selectedClassId,
      raceId: selectedRaceId,
      avatar,
      color,
      customContent: gameContent
    });
    
    onCreateCharacter(player);
  };
  
  // Сохранение кастомного класса
  const handleSaveCustomClass = (classDef: ClassDefinition) => {
    onAddCustomClass?.(classDef);
    setSelectedClassId(classDef.id);
    setShowClassEditor(false);
  };
  
  // Сохранение кастомной расы
  const handleSaveCustomRace = (raceDef: RaceDefinition) => {
    onAddCustomRace?.(raceDef);
    setSelectedRaceId(raceDef.id);
    setShowRaceEditor(false);
  };
  
  return (
    <div className="min-h-screen bg-[#0f0b09] text-stone-200 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Прогресс */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {["class", "race", "details"].map((s, i) => (
            <div key={s} className="flex items-center">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                  ${step === s ? "bg-amber-500 text-[#1a1206]" : 
                    (["class", "race", "details"].indexOf(step) > i) ? "bg-emerald-500/30 text-emerald-300" : "bg-amber-900/30 text-amber-300/50"}`}
              >
                {i + 1}
              </div>
              {i < 2 && <div className="w-8 h-0.5 bg-amber-900/30 mx-1"></div>}
            </div>
          ))}
        </div>
        
        <div className="rounded-3xl border border-amber-900/40 bg-[#15100d] overflow-hidden shadow-2xl">
          {/* Заголовок */}
          <div className="px-6 py-5 border-b border-amber-900/30 bg-gradient-to-r from-[#1f1812] to-[#15100d]">
            <h1 className="display text-2xl text-amber-100">
              {step === "class" && "Выбери класс"}
              {step === "race" && "Выбери расу"}
              {step === "details" && "Детали персонажа"}
            </h1>
            <p className="text-amber-200/60 text-sm mt-1">
              {step === "class" && "Класс определяет твои способности и стиль игры"}
              {step === "race" && "Раса даёт уникальные бонусы и особенности"}
              {step === "details" && "Последние штрихи перед приключением"}
            </p>
          </div>
          
          <div className="p-6">
            {/* ШАГ 1: Выбор класса */}
            {step === "class" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {allClasses.map(cls => (
                    <button
                      key={cls.id}
                      onClick={() => setSelectedClassId(cls.id)}
                      className={`text-left p-4 rounded-xl border transition-all
                        ${selectedClassId === cls.id 
                          ? "border-amber-500 bg-amber-500/15 shadow-lg shadow-amber-500/10" 
                          : "border-amber-900/40 bg-black/20 hover:border-amber-700/60"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">
                          {cls.iconUrl ? (
                            <img src={cls.iconUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                          ) : (
                            cls.icon
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-amber-100 flex items-center gap-2">
                            {cls.name}
                            {cls.isCustom && <span className="text-[10px] px-1.5 py-0.5 bg-violet-500/30 rounded text-violet-300">Кастом</span>}
                          </div>
                          <div className="text-xs text-amber-200/60">{cls.description}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                  
                  {/* Кнопка создания своего класса */}
                  {onAddCustomClass && (
                    <button
                      onClick={() => setShowClassEditor(true)}
                      className="p-4 rounded-xl border-2 border-dashed border-amber-800/40 bg-black/10 hover:border-amber-600/60 hover:bg-black/20 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-3xl opacity-50">➕</div>
                        <div>
                          <div className="font-bold text-amber-300/80">Создать свой класс</div>
                          <div className="text-xs text-amber-200/50">Уникальный герой</div>
                        </div>
                      </div>
                    </button>
                  )}
                </div>
                
                {/* Описание выбранного класса */}
                {selectedClass && (
                  <div className="mt-4 p-4 rounded-xl bg-black/30 border border-amber-900/30">
                    <h3 className="font-bold text-amber-200 mb-2">{selectedClass.icon} {selectedClass.name}</h3>
                    <p className="text-sm text-amber-200/70 leading-relaxed">{selectedClass.aiDescription}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selectedClass.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-amber-500/10 border border-amber-600/30 rounded-full text-[11px] text-amber-300">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => setStep("race")}
                    className="px-8 py-3 bg-amber-500 text-[#1a1206] font-bold rounded-xl hover:bg-amber-400"
                  >
                    Далее →
                  </button>
                </div>
              </div>
            )}
            
            {/* ШАГ 2: Выбор расы */}
            {step === "race" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {allRaces.map(race => (
                    <button
                      key={race.id}
                      onClick={() => setSelectedRaceId(race.id)}
                      className={`text-left p-4 rounded-xl border transition-all
                        ${selectedRaceId === race.id 
                          ? "border-amber-500 bg-amber-500/15 shadow-lg shadow-amber-500/10" 
                          : "border-amber-900/40 bg-black/20 hover:border-amber-700/60"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">
                          {race.iconUrl ? (
                            <img src={race.iconUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                          ) : (
                            race.icon
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-amber-100 flex items-center gap-2">
                            {race.name}
                            {race.isCustom && <span className="text-[10px] px-1.5 py-0.5 bg-violet-500/30 rounded text-violet-300">Кастом</span>}
                          </div>
                          <div className="text-xs text-amber-200/60">{race.description}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                  
                  {/* Кнопка создания своей расы */}
                  {onAddCustomRace && (
                    <button
                      onClick={() => setShowRaceEditor(true)}
                      className="p-4 rounded-xl border-2 border-dashed border-amber-800/40 bg-black/10 hover:border-amber-600/60 hover:bg-black/20 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-3xl opacity-50">➕</div>
                        <div>
                          <div className="font-bold text-amber-300/80">Создать свою расу</div>
                          <div className="text-xs text-amber-200/50">Уникальное существо</div>
                        </div>
                      </div>
                    </button>
                  )}
                </div>
                
                {/* Описание выбранной расы */}
                {selectedRace && (
                  <div className="mt-4 p-4 rounded-xl bg-black/30 border border-amber-900/30">
                    <h3 className="font-bold text-amber-200 mb-2">{selectedRace.icon} {selectedRace.name}</h3>
                    <p className="text-sm text-amber-200/70 leading-relaxed">{selectedRace.aiDescription}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selectedRace.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-amber-500/10 border border-amber-600/30 rounded-full text-[11px] text-amber-300">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between pt-4">
                  <button
                    onClick={() => setStep("class")}
                    className="px-6 py-3 border border-amber-800/40 text-amber-200/80 rounded-xl hover:bg-amber-900/20"
                  >
                    ← Назад
                  </button>
                  <button
                    onClick={() => setStep("details")}
                    className="px-8 py-3 bg-amber-500 text-[#1a1206] font-bold rounded-xl hover:bg-amber-400"
                  >
                    Далее →
                  </button>
                </div>
              </div>
            )}
            
            {/* ШАГ 3: Детали персонажа */}
            {step === "details" && (
              <div className="space-y-5">
                {/* Превью персонажа */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-black/30 border border-amber-900/30">
                  <div className="text-5xl">{avatar}</div>
                  <div>
                    <div className="text-lg font-bold" style={{ color }}>{name || "Безымянный герой"}</div>
                    <div className="text-sm text-amber-200/70">
                      {selectedClass?.icon} {selectedClass?.name} • {selectedRace?.icon} {selectedRace?.name}
                    </div>
                  </div>
                </div>
                
                {/* Имя */}
                <div>
                  <label className="block text-sm text-amber-200 mb-2 font-medium">Имя героя *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Введи имя..."
                    maxLength={20}
                    className="w-full px-4 py-3 bg-black/30 border border-amber-800/40 rounded-xl outline-none focus:border-amber-500 text-lg"
                  />
                </div>
                
                {/* Аватар */}
                <div>
                  <label className="block text-sm text-amber-200 mb-2 font-medium">Аватар</label>
                  <div className="flex flex-wrap gap-2">
                    {AVATARS.map(a => (
                      <button
                        key={a}
                        onClick={() => setAvatar(a)}
                        className={`w-12 h-12 rounded-xl text-2xl border transition-all
                          ${avatar === a ? "border-amber-500 bg-amber-500/20" : "border-amber-900/40 bg-black/20 hover:border-amber-700/60"}`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Цвет */}
                <div>
                  <label className="block text-sm text-amber-200 mb-2 font-medium">Цвет имени</label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        style={{ background: c }}
                        className={`w-10 h-10 rounded-full border-2 transition-all
                          ${color === c ? "border-white scale-110" : "border-black/30"}`}
                      />
                    ))}
                  </div>
                </div>
                
                {/* Кнопки */}
                <div className="flex justify-between pt-4">
                  <button
                    onClick={() => setStep("race")}
                    className="px-6 py-3 border border-amber-800/40 text-amber-200/80 rounded-xl hover:bg-amber-900/20"
                  >
                    ← Назад
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!name.trim()}
                    className="px-8 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 disabled:opacity-40"
                  >
                    Создать героя! ⚔️
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Модалки */}
      <Modal
        isOpen={showClassEditor}
        onClose={() => setShowClassEditor(false)}
        title="Создание своего класса"
      >
        <ClassEditor
          onSave={handleSaveCustomClass}
          onCancel={() => setShowClassEditor(false)}
          onGenerateIcon={onGenerateIcon ? (prompt) => {
            onGenerateIcon(prompt, (url) => {
              // Здесь можно обновить иконку в редакторе
              console.log("Generated icon:", url);
            });
          } : undefined}
        />
      </Modal>
      
      <Modal
        isOpen={showRaceEditor}
        onClose={() => setShowRaceEditor(false)}
        title="Создание своей расы"
      >
        <RaceEditor
          onSave={handleSaveCustomRace}
          onCancel={() => setShowRaceEditor(false)}
          onGenerateIcon={onGenerateIcon ? (prompt) => {
            onGenerateIcon(prompt, (url) => {
              console.log("Generated icon:", url);
            });
          } : undefined}
        />
      </Modal>
    </div>
  );
}

export default CharacterCreator;
