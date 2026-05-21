import React, { useState, useEffect } from 'react';
import AudioPlayer from './components/AudioPlayer';
import SheetViewer from './components/SheetViewer';
import PracticeNotes from './components/PracticeNotes';
import { Music, ChevronDown, Save, Plus } from 'lucide-react';
import { Store, RepertoireItem } from './lib/store';

export default function App() {
  const [items, setItems] = useState<RepertoireItem[]>([]);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  
  const [sheetFile, setSheetFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    Store.getAllItems().then(setItems);
  }, []);

  const loadItem = async (id: string) => {
    setIsMenuOpen(false);
    const item = await Store.getItem(id);
    if (item) {
      setCurrentItemId(item.id);
      setSheetFile(item.sheetFile || null);
      setAudioFile(item.audioFile || null);
      setNotes(item.notes || '');
    }
  };

  const handleNew = () => {
    setIsMenuOpen(false);
    setCurrentItemId(null);
    setSheetFile(null);
    setAudioFile(null);
    setNotes('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    let id = currentItemId;
    let name = '';
    
    if (!id) {
      const suggestedName = sheetFile?.name.replace(/\.[^/.]+$/, "") || audioFile?.name.replace(/\.[^/.]+$/, "") || "Untitled Score";
      const inputName = prompt("Enter a name for this piece:", suggestedName);
      if (!inputName) {
        setIsSaving(false);
        return;
      }
      name = inputName;
      id = Date.now().toString();
    } else {
      const existing = items.find(i => i.id === id);
      name = existing?.name || "Untitled Score";
    }

    const newItem: RepertoireItem = {
      id,
      name,
      audioFile: audioFile || undefined,
      sheetFile: sheetFile || undefined,
      notes,
      updatedAt: Date.now()
    };

    await Store.saveItem(newItem);
    const newItems = await Store.getAllItems();
    setItems(newItems);
    setCurrentItemId(id);
    
    setTimeout(() => setIsSaving(false), 800);
  };

  const currentItem = items.find(i => i.id === currentItemId);

  return (
    <div className="min-h-screen bg-[var(--color-retro-bg)] text-[var(--color-retro-text)] font-sans flex flex-col lg:h-screen lg:overflow-hidden p-4 lg:p-6 gap-6 relative">
      <header className="rounded-2xl bg-[var(--color-retro-surface)] px-6 lg:px-8 py-4 lg:py-5 flex items-center justify-between shrink-0 shadow-lg border-l-[12px] border-[var(--color-retro-brown)] relative z-50">
        <div className="flex flex-col">
          <h1 className="text-[10px] sm:text-xs uppercase font-sans tracking-[0.3em] font-bold text-[var(--color-retro-brown)] mb-1 flex items-center gap-2">
            <Music className="w-4 h-4" />
            Practice Companion
          </h1>
          
          <div className="relative">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-2xl sm:text-4xl font-display tracking-wide flex items-center gap-3 text-[var(--color-retro-text)] hover:text-[var(--color-retro-brown)] transition-colors mt-1"
            >
              {currentItem ? currentItem.name : "New Session"}
              <ChevronDown className={`w-6 h-6 opacity-50 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isMenuOpen && (
              <div className="absolute top-full left-0 mt-4 w-72 bg-[var(--color-retro-surface)] rounded-xl border-2 border-[var(--color-retro-brown)] shadow-xl text-left overflow-hidden z-50">
                <button 
                  onClick={handleNew}
                  className="w-full px-6 py-4 flex items-center gap-3 bg-[var(--color-retro-brown)] text-[var(--color-retro-text)] hover:brightness-110 transition-all text-left font-display text-xl"
                >
                   <Plus className="w-5 h-5" />
                   New Session
                </button>
                <div className="max-h-64 overflow-y-auto">
                  {items.map(item => (
                    <button 
                      key={item.id}
                      onClick={() => loadItem(item.id)}
                      className="w-full px-6 py-4 flex flex-col hover:bg-[var(--color-retro-brown)]/20 transition-colors border-b border-white/5 text-left group"
                    >
                      <span className="font-bold text-lg font-sans">{item.name}</span>
                      <span className="text-[10px] opacity-60 font-mono tracking-widest uppercase mt-1 group-hover:opacity-100">
                        {new Date(item.updatedAt).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                  {items.length === 0 && (
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

      <main className="flex-1 w-full mx-auto flex flex-col lg:flex-row gap-6 lg:min-h-0 lg:overflow-hidden relative z-0">
        <div className="lg:flex-1 h-[65vh] lg:h-full rounded-2xl bg-[var(--color-retro-surface)] shadow-xl border-l-[12px] border-[var(--color-retro-teal)] flex flex-col z-0 overflow-hidden relative">
          <SheetViewer sheetFile={sheetFile} onLoadFile={setSheetFile} />
        </div>

        <div className="lg:w-[320px] xl:w-[360px] shrink-0 flex flex-col gap-6 relative z-0 h-full">
          <div className="shrink-0 rounded-2xl bg-[var(--color-retro-surface)] shadow-lg border-l-[12px] border-[var(--color-retro-red)] flex flex-col overflow-hidden relative">
            <AudioPlayer audioFile={audioFile} onLoadFile={setAudioFile} />
          </div>
          <div className="flex-1 rounded-2xl bg-[var(--color-retro-surface)] shadow-lg border-l-[12px] border-[var(--color-retro-orange)] flex flex-col overflow-hidden min-h-[300px] relative">
            <PracticeNotes notes={notes} onChange={setNotes} />
          </div>
        </div>
      </main>
    </div>
  );
}
