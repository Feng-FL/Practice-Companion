import React, { useState, useEffect } from 'react';

export default function PracticeNotes({ 
  notes, 
  onChange,
  musicalKeys = [],
  onKeyToggle
}: { 
  notes: string;
  onChange: (n: string) => void;
  musicalKeys?: string[];
  onKeyToggle?: (key: string) => void;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'bB', 'bA', '#F', '#C', 'bE'];

  return (
    <div className="p-5 sm:p-6 flex-1 flex flex-col h-full relative text-[var(--color-retro-text)]">
      <div className="flex justify-between items-center mb-3 sm:mb-4">
        <span className="text-[10px] font-sans uppercase tracking-[0.2em] font-bold text-[var(--color-retro-orange)] shrink-0">Practice Notes</span>
        
        {onKeyToggle && (
          <div className="flex flex-wrap gap-1 bg-black/20 p-1.5 rounded-xl ml-2 justify-end">
            {KEYS.map(k => {
              const isActive = musicalKeys.includes(k);
              return (
                <button 
                  key={k}
                  onClick={() => onKeyToggle(k)}
                  className={`min-w-[24px] h-6 px-1 sm:h-7 rounded text-[10px] sm:text-xs font-bold font-sans flex items-center justify-center transition-all ${
                    isActive 
                      ? 'bg-[var(--color-retro-orange)] text-[var(--color-retro-bg)] shadow-[0_0_10px_rgba(222,109,56,0.6)] scale-105' 
                      : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/80'
                  }`}
                  title={k}
                >
                  {k}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1 relative flex flex-col h-full bg-[var(--color-retro-bg)]/50 rounded-xl border border-white/5 p-4 sm:p-6 shadow-inner">
        <textarea
          value={notes}
          onChange={handleChange}
          spellCheck={false}
          placeholder="Start typing notes..."
          className="w-full flex-1 bg-transparent text-[var(--color-retro-text)] placeholder:opacity-30 placeholder:italic font-sans font-medium leading-relaxed text-base resize-none focus:outline-none"
        />
      </div>
    </div>
  );
}
