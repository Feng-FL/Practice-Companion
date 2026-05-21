import React, { useState, useEffect, useRef } from 'react';
import AudioPlayer from './components/AudioPlayer';
import SheetViewer from './components/SheetViewer';
import PracticeNotes from './components/PracticeNotes';
import { Music, ChevronDown, Save, Plus, Edit2 } from 'lucide-react';
import { Store, RepertoireItem } from './lib/store';

export default function App() {
  const [items, setItems] = useState<RepertoireItem[]>([]);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  
  const [sheetFile, setSheetFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [practiceDays, setPracticeDays] = useState<number[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFilterDay, setSelectedFilterDay] = useState<number | null>(null);
  
  const [sessionName, setSessionName] = useState("New Session");
  const [isEditingName, setIsEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Store.getAllItems().then(setItems);
  }, []);

  const loadItem = async (id: string) => {
    setIsMenuOpen(false);
    const item = await Store.getItem(id);
    if (item) {
      setCurrentItemId(item.id);
      setSessionName(item.name);
      setSheetFile(item.sheetFile || null);
      setAudioFile(item.audioFile || null);
      setNotes(item.notes || '');
      setPracticeDays(item.practiceDays || []);
    }
  };

  const handleNew = () => {
    setIsMenuOpen(false);
    setCurrentItemId(null);
    setSessionName("New Session");
    setSheetFile(null);
    setAudioFile(null);
    setNotes('');
    setPracticeDays([]);
  };

  const handleSave = async () => {
    setIsSaving(true);
    let id = currentItemId;
    let nameToSave = sessionName;
    
    if (!id) {
      if (sessionName === "New Session") {
        const suggestedName = sheetFile?.name.replace(/\.[^/.]+$/, "") || audioFile?.name.replace(/\.[^/.]+$/, "") || "Untitled Score";
        const inputName = prompt("Enter a name for this piece:", suggestedName);
        if (!inputName) {
          setIsSaving(false);
          return;
        }
        nameToSave = inputName;
        setSessionName(inputName);
      }
      id = Date.now().toString();
    }

    const newItem: RepertoireItem = {
      id: id,
      name: nameToSave,
      audioFile: audioFile || undefined,
      sheetFile: sheetFile || undefined,
      notes,
      practiceDays,
      updatedAt: Date.now()
    };

    await Store.saveItem(newItem);
    const newItems = await Store.getAllItems();
    setItems(newItems);
    setCurrentItemId(id);
    
    setTimeout(() => setIsSaving(false), 800);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setIsEditingName(false);
    }
  };

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isEditingName]);

  const currentItem = items.find(i => i.id === currentItemId);

  const filteredItems = selectedFilterDay === null 
    ? items 
    : items.filter(i => i.practiceDays?.includes(selectedFilterDay));

  const togglePracticeDay = (day: number) => {
    setPracticeDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  return (
    <div className="min-h-screen bg-[var(--color-retro-bg)] text-[var(--color-retro-text)] font-sans flex flex-col lg:h-screen lg:overflow-hidden p-4 lg:p-6 gap-6 relative">
      <header className="rounded-2xl bg-[var(--color-retro-surface)] px-6 lg:px-8 py-4 lg:py-5 flex items-center justify-between shrink-0 shadow-lg border-l-[12px] border-[var(--color-retro-brown)] relative z-50">
        <div className="flex flex-col flex-1">
          <h1 className="text-[10px] sm:text-xs uppercase font-sans tracking-[0.3em] font-bold text-[var(--color-retro-brown)] mb-1 flex items-center gap-2">
            <Music className="w-4 h-4" />
            Practice Companion
          </h1>
          
          <div className="relative flex items-center gap-3">
            {isEditingName ? (
              <input
                ref={nameInputRef}
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={handleNameKeyDown}
                className="text-2xl sm:text-4xl font-display tracking-wide outline-none bg-transparent border-b-2 border-[var(--color-retro-brown)] text-[var(--color-retro-text)] mb-0 w-full max-w-sm"
              />
            ) : (
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-2xl sm:text-4xl font-display tracking-wide flex items-center gap-3 text-[var(--color-retro-text)] hover:text-[var(--color-retro-brown)] transition-colors mt-1 truncate max-w-full"
                title="Change Session"
              >
                <span className="truncate">{sessionName}</span>
                <ChevronDown className={`w-6 h-6 opacity-50 shrink-0 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
              </button>
            )}
            
            {!isEditingName && (
              <button 
                onClick={() => setIsEditingName(true)}
                className="mt-1 opacity-50 hover:opacity-100 hover:text-[var(--color-retro-brown)] transition-colors shrink-0"
                title="Rename Piece"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            )}
            
            {isMenuOpen && !isEditingName && (
              <div className="absolute top-full left-0 mt-4 w-[340px] bg-[var(--color-retro-surface)] rounded-xl border-2 border-[var(--color-retro-brown)] shadow-xl text-left overflow-hidden z-50 flex flex-col">
                <div className="p-4 border-b border-white/5 bg-black/10">
                   <div className="text-[10px] uppercase font-sans tracking-widest font-bold text-white/40 mb-3">Filter by Practice Day</div>
                   <div className="flex gap-1.5">
                      <button
                        onClick={() => setSelectedFilterDay(null)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-colors ${
                          selectedFilterDay === null ? 'bg-[var(--color-retro-teal)] text-[var(--color-retro-bg)]' : 'bg-white/5 text-white/50 hover:bg-white/10'
                        }`}
                      >
                        All
                      </button>
                      {[1,2,3,4,5,6,0].map(day => (
                        <button
                          key={day}
                          onClick={() => setSelectedFilterDay(day === selectedFilterDay ? null : day)}
                          className={`w-7 h-7 rounded-full text-[10px] font-bold font-sans flex items-center justify-center transition-colors ${
                            selectedFilterDay === day ? 'bg-[var(--color-retro-orange)] text-[var(--color-retro-bg)]' : 'bg-white/5 text-white/50 hover:bg-white/10'
                          }`}
                        >
                          {['S','M','T','W','T','F','S'][day]}
                        </button>
                      ))}
                   </div>
                </div>

                <button 
                  onClick={handleNew}
                  className="w-full px-6 py-4 flex items-center gap-3 bg-[var(--color-retro-brown)] text-[var(--color-retro-text)] hover:brightness-110 transition-all text-left font-display text-xl shrink-0"
                >
                   <Plus className="w-5 h-5" />
                   New Session
                </button>
                <div className="max-h-64 overflow-y-auto">
                  {filteredItems.map(item => (
                    <button 
                      key={item.id}
                      onClick={() => loadItem(item.id)}
                      className="w-full px-6 py-4 flex flex-col hover:bg-[var(--color-retro-brown)]/20 transition-colors border-b border-white/5 text-left group"
                    >
                      <span className="font-bold text-lg font-sans flex items-center gap-2">
                        {item.name}
                        {item.practiceDays && item.practiceDays.length > 0 && (
                           <div className="flex gap-0.5 ml-auto opacity-60">
                              {item.practiceDays.map(d => (
                                 <span key={d} className="w-4 h-4 rounded bg-white/10 text-[8px] flex items-center justify-center font-bold">
                                   {['S','M','T','W','T','F','S'][d]}
                                 </span>
                              ))}
                           </div>
                        )}
                      </span>
                      <span className="text-[10px] opacity-60 font-mono tracking-widest uppercase mt-1 group-hover:opacity-100">
                        {new Date(item.updatedAt).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                  {filteredItems.length === 0 && (
                     <div className="px-6 py-8 text-center text-xs opacity-40 font-mono uppercase tracking-widest">
                       No saved scores
                     </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="text-right flex flex-col items-end">
          <div className="text-[10px] uppercase font-sans tracking-widest font-bold text-[var(--color-retro-brown)] mb-2">Status</div>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full transition-all outline-none font-bold text-sm uppercase tracking-widest shadow-lg ${isSaving ? 'bg-[var(--color-retro-brown)] text-[var(--color-retro-bg)]' : 'bg-[var(--color-retro-bg)] border hover:-translate-y-0.5 border-white/5 text-[var(--color-retro-text)] hover:bg-[var(--color-retro-brown)]'}`}
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saved.' : 'Save'}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 w-full mx-auto flex flex-col gap-4 lg:gap-6 lg:min-h-0 lg:overflow-hidden relative z-0">
        {/* Top/Middle Row: Sheet Viewer + Practice Notes */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 flex-1 lg:min-h-0 lg:overflow-hidden relative z-0">
          <div className="lg:flex-1 h-[65vh] lg:h-full rounded-2xl bg-[var(--color-retro-surface)] shadow-xl border-l-[12px] border-[var(--color-retro-teal)] flex flex-col z-0 overflow-hidden relative">
            <SheetViewer sheetFile={sheetFile} onLoadFile={setSheetFile} />
          </div>

          <div className="lg:flex-1 h-[40vh] lg:h-full rounded-2xl bg-[var(--color-retro-surface)] shadow-xl border-l-[12px] border-[var(--color-retro-orange)] flex flex-col z-0 overflow-hidden relative">
            <PracticeNotes notes={notes} onChange={setNotes} practiceDays={practiceDays} onDayToggle={togglePracticeDay} />
          </div>
        </div>

        {/* Bottom Row: Audio Player */}
        <div className="shrink-0 rounded-2xl bg-[var(--color-retro-surface)] shadow-xl border-l-[12px] border-[var(--color-retro-red)] flex flex-col relative z-0">
          <AudioPlayer audioFile={audioFile} onLoadFile={setAudioFile} />
        </div>
      </main>
    </div>
  );
}
