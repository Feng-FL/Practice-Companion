import React, { useState, useEffect } from 'react';
import AudioPlayer from './components/AudioPlayer';
import SheetViewer from './components/SheetViewer';
import PracticeNotes from './components/PracticeNotes';
import { Music2, ChevronDown, Save, Plus } from 'lucide-react';
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
    <div className="min-h-screen bg-[#F9F7F2] text-[#1A1A1A] font-sans selection:bg-[#1A1A1A] selection:text-[#F9F7F2] flex flex-col lg:h-screen lg:overflow-hidden">
      <header className="border-b border-[#1A1A1A] px-6 lg:px-8 py-5 lg:py-6 flex items-end justify-between shrink-0 bg-[#F9F7F2] relative z-50">
        <div>
          <h1 className="text-[10px] sm:text-xs uppercase tracking-[0.3em] font-bold text-[#1A1A1A] opacity-40 mb-1 flex items-center gap-2">
            <Music2 className="w-4 h-4" />
            Practice Companion
          </h1>
          
          <div className="relative">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-3xl sm:text-5xl font-serif italic tracking-tight flex items-center gap-2 hover:opacity-70 transition-opacity"
            >
              {currentItem ? currentItem.name : "New Session"}
              <ChevronDown className="w-6 h-6 mt-2 opacity-50" />
            </button>
            
            {isMenuOpen && (
              <div className="absolute top-full left-0 mt-4 w-72 bg-white border border-[#1A1A1A] shadow-xl text-left">
                <button 
                  onClick={handleNew}
                  className="w-full px-6 py-4 flex items-center gap-3 border-b border-[#EEE] hover:bg-[#F9F7F2] transition-colors text-left"
                >
                   <Plus className="w-4 h-4 opacity-50" />
                   <span className="font-serif italic text-lg">New Session</span>
                </button>
                <div className="max-h-64 overflow-y-auto">
                  {items.map(item => (
                    <button 
                      key={item.id}
                      onClick={() => loadItem(item.id)}
                      className="w-full px-6 py-3 flex flex-col hover:bg-[#F9F7F2] transition-colors border-b border-[#EEE] text-left"
                    >
                      <span className="font-serif">{item.name}</span>
                      <span className="text-[10px] opacity-40 font-mono tracking-widest uppercase mt-1">
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
          <div className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-2">Status</div>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-2 px-4 py-2 border border-[#1A1A1A] transition-colors ${isSaving ? 'bg-[#1A1A1A] text-white' : 'bg-transparent hover:bg-[#1A1A1A] hover:text-white'}`}
          >
            <Save className="w-4 h-4" />
            <span className="text-xs uppercase tracking-widest font-bold">
              {isSaving ? 'Saved.' : 'Save'}
            </span>
          </button>
        </div>
      </header>

      <main className="flex-1 w-full mx-auto flex flex-col lg:h-[calc(100vh-101px)] lg:overflow-hidden">
        <div className="flex flex-col lg:flex-row w-full h-full lg:overflow-hidden">
          <div className="lg:flex-1 h-[65vh] lg:h-full border-b lg:border-b-0 lg:border-r border-[#1A1A1A] relative flex flex-col z-0">
            <SheetViewer sheetFile={sheetFile} onLoadFile={setSheetFile} />
          </div>

          <div className="lg:w-[320px] xl:w-[360px] shrink-0 flex flex-col bg-white relative z-0">
            <div className="shrink-0">
              <AudioPlayer audioFile={audioFile} onLoadFile={setAudioFile} />
            </div>
            <div className="flex-1 flex flex-col border-t border-[#1A1A1A] lg:border-t-0 min-h-[400px] lg:min-h-0 lg:overflow-hidden">
              <PracticeNotes notes={notes} onChange={setNotes} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
