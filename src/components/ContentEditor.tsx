// ==================== РЕДАКТОР КОНТЕНТА ====================
// Компонент для добавления кастомных классов, рас, предметов, баффов

import { useState } from "react";
import {
  ClassDefinition, RaceDefinition, ItemDefinition, BuffDebuff,
  StatDefinition, DEFAULT_STATS
} from "../game/types";

const uid = () => Math.random().toString(36).slice(2, 9);

// ==================== ОБЩИЕ КОМПОНЕНТЫ ====================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1a1410] border border-amber-900/50 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-amber-900/30">
          <h2 className="display text-lg text-amber-100">{title}</h2>
          <button onClick={onClose} className="text-2xl text-amber-300/70 hover:text-amber-100">×</button>
        </div>
        <div className="p-5 overflow-auto max-h-[calc(90vh-80px)]">
          {children}
        </div>
      </div>
    </div>
  );
}

interface IconPickerProps {
  value: string;
  iconUrl?: string;
  onChange: (icon: string, iconUrl?: string) => void;
  onGenerateIcon?: (prompt: string) => void;
  showGenerate?: boolean;
}

function IconPicker({ value, iconUrl, onChange, onGenerateIcon, showGenerate }: IconPickerProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState("");
  
  const commonEmojis = ["⚔️", "🗡️", "🛡️", "🏹", "✨", "🔥", "❄️", "⚡", "💀", "🐺", "🦊", "🐉", "🧙", "🗝️", "💎", "🧪", "📜", "🎭", "🌲", "🏠", "🧜", "👤", "🐎", "💪", "🧠", "❤️", "🔮", "🌙", "☀️", "💫"];
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {/* Текущая иконка */}
        <div 
          className="w-16 h-16 rounded-xl border-2 border-amber-700/50 bg-black/30 flex items-center justify-center text-3xl cursor-pointer hover:border-amber-500"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        >
          {iconUrl ? (
            <img src={iconUrl} alt="" className="w-full h-full object-cover rounded-lg" />
          ) : (
            value || "?"
          )}
        </div>
        
        {/* Загрузка файла */}
        <div className="flex-1">
          <label className="block text-[12px] text-amber-200/70 mb-1">Загрузить иконку</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                  onChange(value, ev.target?.result as string);
                };
                reader.readAsDataURL(file);
              }
            }}
            className="w-full text-[12px] text-amber-200/70"
          />
        </div>
      </div>
      
      {/* Emoji picker */}
      {showEmojiPicker && (
        <div className="flex flex-wrap gap-1 p-2 bg-black/30 rounded-xl border border-amber-900/30">
          {commonEmojis.map(emoji => (
            <button
              key={emoji}
              onClick={() => { onChange(emoji, undefined); setShowEmojiPicker(false); }}
              className="w-8 h-8 text-xl hover:bg-amber-500/20 rounded"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
      
      {/* Генерация через AI */}
      {showGenerate && onGenerateIcon && (
        <div className="flex gap-2">
          <input
            type="text"
            value={generatePrompt}
            onChange={(e) => setGeneratePrompt(e.target.value)}
            placeholder="Описание для генерации иконки..."
            className="flex-1 px-3 py-2 bg-black/30 border border-amber-800/40 rounded-lg text-[13px] outline-none"
          />
          <button
            onClick={() => {
              if (generatePrompt.trim()) {
                onGenerateIcon(generatePrompt);
              }
            }}
            disabled={!generatePrompt.trim()}
            className="px-4 py-2 bg-violet-600/30 border border-violet-600/50 rounded-lg text-[12px] text-violet-200 hover:bg-violet-600/40 disabled:opacity-40"
          >
            🎨 Создать
          </button>
        </div>
      )}
    </div>
  );
}

interface StatEditorProps {
  stats: { statId: string; value: number }[];
  onChange: (stats: { statId: string; value: number }[]) => void;
  availableStats?: StatDefinition[];
}

function StatEditor({ stats, onChange, availableStats = DEFAULT_STATS }: StatEditorProps) {
  const addStat = () => {
    const availableIds = availableStats.filter(s => !stats.find(st => st.statId === s.id));
    if (availableIds.length > 0) {
      onChange([...stats, { statId: availableIds[0].id, value: availableIds[0].defaultValue }]);
    }
  };
  
  const removeStat = (index: number) => {
    onChange(stats.filter((_, i) => i !== index));
  };
  
  const updateStat = (index: number, field: 'statId' | 'value', value: string | number) => {
    onChange(stats.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };
  
  return (
    <div className="space-y-2">
      {stats.map((stat, index) => {
        return (
          <div key={index} className="flex items-center gap-2">
            <select
              value={stat.statId}
              onChange={(e) => updateStat(index, 'statId', e.target.value)}
              className="flex-1 px-3 py-2 bg-black/30 border border-amber-800/40 rounded-lg text-[13px] outline-none"
            >
              {availableStats.map(s => (
                <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
              ))}
            </select>
            <input
              type="number"
              value={stat.value}
              onChange={(e) => updateStat(index, 'value', parseInt(e.target.value) || 0)}
              className="w-20 px-3 py-2 bg-black/30 border border-amber-800/40 rounded-lg text-[13px] outline-none text-center"
            />
            <button
              onClick={() => removeStat(index)}
              className="w-8 h-8 text-rose-400 hover:bg-rose-500/20 rounded"
            >
              ×
            </button>
          </div>
        );
      })}
      <button
        onClick={addStat}
        className="w-full py-2 border-2 border-dashed border-amber-800/40 rounded-lg text-[12px] text-amber-300/70 hover:border-amber-600/60 hover:text-amber-200"
      >
        + Добавить стат
      </button>
    </div>
  );
}

// ==================== РЕДАКТОР КЛАССА ====================

interface ClassEditorProps {
  initialClass?: ClassDefinition;
  onSave: (classDef: ClassDefinition) => void;
  onCancel: () => void;
  onGenerateIcon?: (prompt: string) => void;
}

export function ClassEditor({ initialClass, onSave, onCancel, onGenerateIcon }: ClassEditorProps) {
  const [classDef, setClassDef] = useState<ClassDefinition>(initialClass || {
    id: "custom_" + uid(),
    name: "",
    icon: "⚔️",
    description: "",
    aiDescription: "",
    baseStats: [
      { statId: "hp", value: 20 },
      { statId: "mana", value: 10 },
      { statId: "stamina", value: 100 }
    ],
    startingAbilities: [],
    startingItems: [],
    statBonusPerLevel: [{ statId: "hp", value: 2 }],
    tags: [],
    isCustom: true
  });
  
  const [tagInput, setTagInput] = useState("");
  
  const updateField = <K extends keyof ClassDefinition>(field: K, value: ClassDefinition[K]) => {
    setClassDef({ ...classDef, [field]: value });
  };
  
  const addTag = () => {
    if (tagInput.trim() && !classDef.tags.includes(tagInput.trim())) {
      updateField('tags', [...classDef.tags, tagInput.trim()]);
      setTagInput("");
    }
  };
  
  const removeTag = (tag: string) => {
    updateField('tags', classDef.tags.filter(t => t !== tag));
  };
  
  const handleSave = () => {
    if (!classDef.name.trim()) {
      alert("Укажите название класса");
      return;
    }
    if (!classDef.aiDescription.trim()) {
      alert("Укажите описание для AI");
      return;
    }
    onSave(classDef);
  };
  
  return (
    <div className="space-y-5">
      {/* Иконка */}
      <div>
        <label className="block text-[13px] text-amber-200 mb-2 font-medium">Иконка класса</label>
        <IconPicker
          value={classDef.icon}
          iconUrl={classDef.iconUrl}
          onChange={(icon, iconUrl) => {
            setClassDef({ ...classDef, icon, iconUrl });
          }}
          onGenerateIcon={onGenerateIcon}
          showGenerate={!!onGenerateIcon}
        />
      </div>
      
      {/* Название */}
      <div>
        <label className="block text-[13px] text-amber-200 mb-1 font-medium">Название класса *</label>
        <input
          type="text"
          value={classDef.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="Например: Берсерк"
          className="w-full px-4 py-3 bg-black/30 border border-amber-800/40 rounded-xl outline-none focus:border-amber-500"
        />
      </div>
      
      {/* Краткое описание */}
      <div>
        <label className="block text-[13px] text-amber-200 mb-1 font-medium">Краткое описание</label>
        <input
          type="text"
          value={classDef.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Безумный воин, сражающийся в ярости"
          className="w-full px-4 py-3 bg-black/30 border border-amber-800/40 rounded-xl outline-none focus:border-amber-500"
        />
      </div>
      
      {/* Описание для AI */}
      <div>
        <label className="block text-[13px] text-amber-200 mb-1 font-medium">Описание для AI-ведущего *</label>
        <textarea
          value={classDef.aiDescription}
          onChange={(e) => updateField('aiDescription', e.target.value)}
          placeholder="Детальное описание класса. AI будет опираться на него при оценке действий. Опишите: сильные и слабые стороны, стиль боя, ограничения, особые способности..."
          rows={4}
          className="w-full px-4 py-3 bg-black/30 border border-amber-800/40 rounded-xl outline-none focus:border-amber-500 resize-none"
        />
        <p className="text-[11px] text-amber-300/50 mt-1">
          Чем подробнее, тем лучше AI поймёт, что может и чего не может этот класс.
        </p>
      </div>
      
      {/* Базовые статы */}
      <div>
        <label className="block text-[13px] text-amber-200 mb-2 font-medium">Базовые статы</label>
        <StatEditor
          stats={classDef.baseStats}
          onChange={(stats) => updateField('baseStats', stats)}
        />
      </div>
      
      {/* Бонусы за уровень */}
      <div>
        <label className="block text-[13px] text-amber-200 mb-2 font-medium">Бонусы за уровень</label>
        <StatEditor
          stats={classDef.statBonusPerLevel}
          onChange={(stats) => updateField('statBonusPerLevel', stats)}
        />
      </div>
      
      {/* Теги */}
      <div>
        <label className="block text-[13px] text-amber-200 mb-2 font-medium">Теги (для AI)</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {classDef.tags.map(tag => (
            <span key={tag} className="px-2 py-1 bg-amber-500/20 border border-amber-600/40 rounded-full text-[12px] flex items-center gap-1">
              {tag}
              <button onClick={() => removeTag(tag)} className="text-amber-300 hover:text-white">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTag()}
            placeholder="воин, ярость, ближний_бой..."
            className="flex-1 px-3 py-2 bg-black/30 border border-amber-800/40 rounded-lg text-[13px] outline-none"
          />
          <button onClick={addTag} className="px-4 py-2 bg-amber-600/30 border border-amber-600/50 rounded-lg text-[12px]">
            Добавить
          </button>
        </div>
      </div>
      
      {/* Кнопки */}
      <div className="flex gap-3 pt-4 border-t border-amber-900/30">
        <button
          onClick={onCancel}
          className="flex-1 py-3 border border-amber-800/40 rounded-xl text-amber-200/80 hover:bg-amber-900/20"
        >
          Отмена
        </button>
        <button
          onClick={handleSave}
          className="flex-1 py-3 bg-amber-500 text-[#1a1206] font-bold rounded-xl hover:bg-amber-400"
        >
          Сохранить класс
        </button>
      </div>
    </div>
  );
}

// ==================== РЕДАКТОР РАСЫ ====================

interface RaceEditorProps {
  initialRace?: RaceDefinition;
  onSave: (raceDef: RaceDefinition) => void;
  onCancel: () => void;
  onGenerateIcon?: (prompt: string) => void;
}

export function RaceEditor({ initialRace, onSave, onCancel, onGenerateIcon }: RaceEditorProps) {
  const [raceDef, setRaceDef] = useState<RaceDefinition>(initialRace || {
    id: "custom_" + uid(),
    name: "",
    icon: "👤",
    description: "",
    aiDescription: "",
    statModifiers: [],
    innateAbilities: [],
    tags: [],
    isCustom: true
  });
  
  const [tagInput, setTagInput] = useState("");
  
  const updateField = <K extends keyof RaceDefinition>(field: K, value: RaceDefinition[K]) => {
    setRaceDef({ ...raceDef, [field]: value });
  };
  
  const addTag = () => {
    if (tagInput.trim() && !raceDef.tags.includes(tagInput.trim())) {
      updateField('tags', [...raceDef.tags, tagInput.trim()]);
      setTagInput("");
    }
  };
  
  const handleSave = () => {
    if (!raceDef.name.trim()) {
      alert("Укажите название расы");
      return;
    }
    if (!raceDef.aiDescription.trim()) {
      alert("Укажите описание для AI");
      return;
    }
    onSave(raceDef);
  };
  
  return (
    <div className="space-y-5">
      {/* Иконка */}
      <div>
        <label className="block text-[13px] text-amber-200 mb-2 font-medium">Иконка расы</label>
        <IconPicker
          value={raceDef.icon}
          iconUrl={raceDef.iconUrl}
          onChange={(icon, iconUrl) => {
            setRaceDef({ ...raceDef, icon, iconUrl });
          }}
          onGenerateIcon={onGenerateIcon}
          showGenerate={!!onGenerateIcon}
        />
      </div>
      
      {/* Название */}
      <div>
        <label className="block text-[13px] text-amber-200 mb-1 font-medium">Название расы *</label>
        <input
          type="text"
          value={raceDef.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="Например: Упырь"
          className="w-full px-4 py-3 bg-black/30 border border-amber-800/40 rounded-xl outline-none focus:border-amber-500"
        />
      </div>
      
      {/* Краткое описание */}
      <div>
        <label className="block text-[13px] text-amber-200 mb-1 font-medium">Краткое описание</label>
        <input
          type="text"
          value={raceDef.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="+5 к силе, слабость к солнцу"
          className="w-full px-4 py-3 bg-black/30 border border-amber-800/40 rounded-xl outline-none focus:border-amber-500"
        />
      </div>
      
      {/* Описание для AI */}
      <div>
        <label className="block text-[13px] text-amber-200 mb-1 font-medium">Описание для AI-ведущего *</label>
        <textarea
          value={raceDef.aiDescription}
          onChange={(e) => updateField('aiDescription', e.target.value)}
          placeholder="Детальное описание расы. Опишите: внешность, способности, слабости, отношение других рас, ограничения..."
          rows={4}
          className="w-full px-4 py-3 bg-black/30 border border-amber-800/40 rounded-xl outline-none focus:border-amber-500 resize-none"
        />
      </div>
      
      {/* Модификаторы статов */}
      <div>
        <label className="block text-[13px] text-amber-200 mb-2 font-medium">Модификаторы статов</label>
        <StatEditor
          stats={raceDef.statModifiers}
          onChange={(stats) => updateField('statModifiers', stats)}
        />
      </div>
      
      {/* Теги */}
      <div>
        <label className="block text-[13px] text-amber-200 mb-2 font-medium">Теги</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {raceDef.tags.map(tag => (
            <span key={tag} className="px-2 py-1 bg-amber-500/20 border border-amber-600/40 rounded-full text-[12px] flex items-center gap-1">
              {tag}
              <button onClick={() => updateField('tags', raceDef.tags.filter(t => t !== tag))} className="text-amber-300">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTag()}
            placeholder="нежить, ночной, сильный..."
            className="flex-1 px-3 py-2 bg-black/30 border border-amber-800/40 rounded-lg text-[13px] outline-none"
          />
          <button onClick={addTag} className="px-4 py-2 bg-amber-600/30 border border-amber-600/50 rounded-lg text-[12px]">
            Добавить
          </button>
        </div>
      </div>
      
      {/* Кнопки */}
      <div className="flex gap-3 pt-4 border-t border-amber-900/30">
        <button onClick={onCancel} className="flex-1 py-3 border border-amber-800/40 rounded-xl text-amber-200/80 hover:bg-amber-900/20">
          Отмена
        </button>
        <button onClick={handleSave} className="flex-1 py-3 bg-amber-500 text-[#1a1206] font-bold rounded-xl hover:bg-amber-400">
          Сохранить расу
        </button>
      </div>
    </div>
  );
}

// ==================== РЕДАКТОР ПРЕДМЕТА ====================

interface ItemEditorProps {
  initialItem?: ItemDefinition;
  onSave: (itemDef: ItemDefinition) => void;
  onCancel: () => void;
  onGenerateIcon?: (prompt: string) => void;
}

export function ItemEditor({ initialItem, onSave, onCancel, onGenerateIcon }: ItemEditorProps) {
  const [itemDef, setItemDef] = useState<ItemDefinition>(initialItem || {
    id: "item_" + uid(),
    name: "",
    icon: "📦",
    type: "misc",
    description: "",
    aiDescription: "",
    rarity: "common",
    stats: [],
    tags: []
  });
  
  const [tagInput, setTagInput] = useState("");
  
  const updateField = <K extends keyof ItemDefinition>(field: K, value: ItemDefinition[K]) => {
    setItemDef({ ...itemDef, [field]: value });
  };
  
  const handleSave = () => {
    if (!itemDef.name.trim() || !itemDef.aiDescription.trim()) {
      alert("Заполните название и описание для AI");
      return;
    }
    onSave(itemDef);
  };
  
  return (
    <div className="space-y-5">
      {/* Иконка */}
      <div>
        <label className="block text-[13px] text-amber-200 mb-2 font-medium">Иконка предмета</label>
        <IconPicker
          value={itemDef.icon}
          iconUrl={itemDef.iconUrl}
          onChange={(icon, iconUrl) => setItemDef({ ...itemDef, icon, iconUrl })}
          onGenerateIcon={onGenerateIcon}
          showGenerate={!!onGenerateIcon}
        />
      </div>
      
      {/* Название и тип */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[13px] text-amber-200 mb-1 font-medium">Название *</label>
          <input
            type="text"
            value={itemDef.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="Меч пламени"
            className="w-full px-4 py-3 bg-black/30 border border-amber-800/40 rounded-xl outline-none"
          />
        </div>
        <div>
          <label className="block text-[13px] text-amber-200 mb-1 font-medium">Тип</label>
          <select
            value={itemDef.type}
            onChange={(e) => updateField('type', e.target.value as any)}
            className="w-full px-4 py-3 bg-black/30 border border-amber-800/40 rounded-xl outline-none"
          >
            <option value="weapon">Оружие</option>
            <option value="armor">Броня</option>
            <option value="consumable">Расходник</option>
            <option value="artifact">Артефакт</option>
            <option value="quest">Квестовый</option>
            <option value="misc">Прочее</option>
          </select>
        </div>
      </div>
      
      {/* Редкость и прочность */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-[13px] text-amber-200 mb-1 font-medium">Редкость</label>
          <select
            value={itemDef.rarity}
            onChange={(e) => updateField('rarity', e.target.value as any)}
            className="w-full px-4 py-3 bg-black/30 border border-amber-800/40 rounded-xl outline-none"
          >
            <option value="common">Обычный</option>
            <option value="uncommon">Необычный</option>
            <option value="rare">Редкий</option>
            <option value="epic">Эпический</option>
            <option value="legendary">Легендарный</option>
          </select>
        </div>
        <div>
          <label className="block text-[13px] text-amber-200 mb-1 font-medium">Прочность</label>
          <input
            type="number"
            value={itemDef.maxDurability || ""}
            onChange={(e) => updateField('maxDurability', parseInt(e.target.value) || undefined)}
            placeholder="100"
            className="w-full px-4 py-3 bg-black/30 border border-amber-800/40 rounded-xl outline-none"
          />
        </div>
        <div>
          <label className="block text-[13px] text-amber-200 mb-1 font-medium">Заряды</label>
          <input
            type="number"
            value={itemDef.charges || ""}
            onChange={(e) => updateField('charges', parseInt(e.target.value) || undefined)}
            placeholder="∞"
            className="w-full px-4 py-3 bg-black/30 border border-amber-800/40 rounded-xl outline-none"
          />
        </div>
      </div>
      
      {/* Описание для AI */}
      <div>
        <label className="block text-[13px] text-amber-200 mb-1 font-medium">Описание для AI *</label>
        <textarea
          value={itemDef.aiDescription}
          onChange={(e) => updateField('aiDescription', e.target.value)}
          placeholder="Детальное описание: что делает предмет, как использовать, бонусы, ограничения..."
          rows={3}
          className="w-full px-4 py-3 bg-black/30 border border-amber-800/40 rounded-xl outline-none resize-none"
        />
      </div>
      
      {/* Статы предмета */}
      <div>
        <label className="block text-[13px] text-amber-200 mb-2 font-medium">Бонусы к статам</label>
        <StatEditor
          stats={itemDef.stats}
          onChange={(stats) => updateField('stats', stats)}
        />
      </div>
      
      {/* Теги */}
      <div>
        <label className="block text-[13px] text-amber-200 mb-2 font-medium">Теги</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {itemDef.tags.map(tag => (
            <span key={tag} className="px-2 py-1 bg-amber-500/20 border border-amber-600/40 rounded-full text-[12px] flex items-center gap-1">
              {tag}
              <button onClick={() => updateField('tags', itemDef.tags.filter(t => t !== tag))} className="text-amber-300">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="огонь, двуручное, проклятый..."
            className="flex-1 px-3 py-2 bg-black/30 border border-amber-800/40 rounded-lg text-[13px] outline-none"
          />
          <button 
            onClick={() => {
              if (tagInput.trim()) {
                updateField('tags', [...itemDef.tags, tagInput.trim()]);
                setTagInput("");
              }
            }} 
            className="px-4 py-2 bg-amber-600/30 border border-amber-600/50 rounded-lg text-[12px]"
          >
            +
          </button>
        </div>
      </div>
      
      {/* Кнопки */}
      <div className="flex gap-3 pt-4 border-t border-amber-900/30">
        <button onClick={onCancel} className="flex-1 py-3 border border-amber-800/40 rounded-xl text-amber-200/80">
          Отмена
        </button>
        <button onClick={handleSave} className="flex-1 py-3 bg-amber-500 text-[#1a1206] font-bold rounded-xl">
          Сохранить
        </button>
      </div>
    </div>
  );
}

// ==================== РЕДАКТОР БАФФА/ДЕБАФФА ====================

interface BuffEditorProps {
  initialBuff?: BuffDebuff;
  onSave: (buffDef: BuffDebuff) => void;
  onCancel: () => void;
  onGenerateIcon?: (prompt: string) => void;
}

export function BuffEditor({ initialBuff, onSave, onCancel, onGenerateIcon }: BuffEditorProps) {
  const [buffDef, setBuffDef] = useState<BuffDebuff>(initialBuff || {
    id: "buff_" + uid(),
    name: "",
    icon: "✨",
    isDebuff: false,
    description: "",
    aiDescription: "",
    duration: 3,
    statModifiers: [],
    tags: []
  });
  
  const [tagInput, setTagInput] = useState("");
  
  const updateField = <K extends keyof BuffDebuff>(field: K, value: BuffDebuff[K]) => {
    setBuffDef({ ...buffDef, [field]: value });
  };
  
  const handleSave = () => {
    if (!buffDef.name.trim() || !buffDef.aiDescription.trim()) {
      alert("Заполните название и описание для AI");
      return;
    }
    onSave(buffDef);
  };
  
  return (
    <div className="space-y-5">
      {/* Иконка */}
      <div>
        <label className="block text-[13px] text-amber-200 mb-2 font-medium">Иконка</label>
        <IconPicker
          value={buffDef.icon}
          iconUrl={buffDef.iconUrl}
          onChange={(icon, iconUrl) => setBuffDef({ ...buffDef, icon, iconUrl })}
          onGenerateIcon={onGenerateIcon}
          showGenerate={!!onGenerateIcon}
        />
      </div>
      
      {/* Название и тип */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[13px] text-amber-200 mb-1 font-medium">Название *</label>
          <input
            type="text"
            value={buffDef.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="Каменная кожа"
            className="w-full px-4 py-3 bg-black/30 border border-amber-800/40 rounded-xl outline-none"
          />
        </div>
        <div>
          <label className="block text-[13px] text-amber-200 mb-1 font-medium">Тип</label>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => updateField('isDebuff', false)}
              className={`flex-1 py-2 rounded-lg border ${!buffDef.isDebuff ? "bg-emerald-500/30 border-emerald-500" : "border-amber-800/40"}`}
            >
              ✨ Бафф
            </button>
            <button
              onClick={() => updateField('isDebuff', true)}
              className={`flex-1 py-2 rounded-lg border ${buffDef.isDebuff ? "bg-rose-500/30 border-rose-500" : "border-amber-800/40"}`}
            >
              💀 Дебафф
            </button>
          </div>
        </div>
      </div>
      
      {/* Длительность */}
      <div>
        <label className="block text-[13px] text-amber-200 mb-1 font-medium">Длительность (ходов)</label>
        <div className="flex items-center gap-4">
          <input
            type="number"
            value={buffDef.duration === -1 ? "" : buffDef.duration}
            onChange={(e) => updateField('duration', parseInt(e.target.value) || 0)}
            placeholder="3"
            className="w-24 px-4 py-3 bg-black/30 border border-amber-800/40 rounded-xl outline-none"
          />
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={buffDef.duration === -1}
              onChange={(e) => updateField('duration', e.target.checked ? -1 : 3)}
            />
            Постоянный (увечье, проклятие)
          </label>
        </div>
      </div>
      
      {/* Описание для AI */}
      <div>
        <label className="block text-[13px] text-amber-200 mb-1 font-medium">Описание для AI *</label>
        <textarea
          value={buffDef.aiDescription}
          onChange={(e) => updateField('aiDescription', e.target.value)}
          placeholder="Детальное описание: что происходит с персонажем, как влияет на действия, как снять эффект..."
          rows={3}
          className="w-full px-4 py-3 bg-black/30 border border-amber-800/40 rounded-xl outline-none resize-none"
        />
      </div>
      
      {/* Модификаторы статов */}
      <div>
        <label className="block text-[13px] text-amber-200 mb-2 font-medium">Модификаторы статов</label>
        <StatEditor
          stats={buffDef.statModifiers}
          onChange={(stats) => updateField('statModifiers', stats)}
        />
      </div>
      
      {/* Теги */}
      <div>
        <label className="block text-[13px] text-amber-200 mb-2 font-medium">Теги</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {buffDef.tags.map(tag => (
            <span key={tag} className="px-2 py-1 bg-amber-500/20 border border-amber-600/40 rounded-full text-[12px] flex items-center gap-1">
              {tag}
              <button onClick={() => updateField('tags', buffDef.tags.filter(t => t !== tag))} className="text-amber-300">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="защита, магия, яд..."
            className="flex-1 px-3 py-2 bg-black/30 border border-amber-800/40 rounded-lg text-[13px] outline-none"
          />
          <button 
            onClick={() => {
              if (tagInput.trim()) {
                updateField('tags', [...buffDef.tags, tagInput.trim()]);
                setTagInput("");
              }
            }} 
            className="px-4 py-2 bg-amber-600/30 border border-amber-600/50 rounded-lg text-[12px]"
          >
            +
          </button>
        </div>
      </div>
      
      {/* Кнопки */}
      <div className="flex gap-3 pt-4 border-t border-amber-900/30">
        <button onClick={onCancel} className="flex-1 py-3 border border-amber-800/40 rounded-xl text-amber-200/80">
          Отмена
        </button>
        <button onClick={handleSave} className="flex-1 py-3 bg-amber-500 text-[#1a1206] font-bold rounded-xl">
          Сохранить
        </button>
      </div>
    </div>
  );
}

// ==================== ЭКСПОРТ МОДАЛА ====================

export { Modal };
