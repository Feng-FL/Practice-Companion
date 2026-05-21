import React, { useState, useEffect } from 'react';

export default function PracticeNotes({ 
  notes, 
  onChange,
  practiceDays = [],
  onDayToggle
}: { 
  notes: string;
  onChange: (n: string) => void;
  practiceDays?: number[];
  onDayToggle?: (day: number) => void;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const DAYS = [
    { id: 1, label: 'Mon' },
    { id: 2, label: 'Tue' },
    { id: 3, label: 'Wed' },
    { id: 4, label: 'Thu' },
    { id: 5, label: 'Fri' },
    { id: 6, label: 'Sat' },
    { id: 0, label: 'Sun' },
  ];

  return (
    <div className="p-5 sm:p-6 flex-1 flex flex-col h-full relative text-[var(--color-retro-text)]">
      <div className="flex justify-between items-center mb-3 sm:mb-4">
        <span className="text-[10px] font-sans uppercase tracking-[0.2em] font-bold text-[var(--color-retro-orange)]">Practice Notes</span>
        
        {onDayToggle && (
          <div className="flex gap-1 bg-black/20 p-1.5 rounded-full">
            {DAYS.map(d => {
              const isActive = practiceDays.includes(d.id);
              return (
                <button 
                  key={d.id}
                  onClick={() => onDayToggle(d.id)}
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full text-[9px] font-bold font-sans flex items-center justify-center transition-all ${
                    isActive 
                      ? 'bg-[var(--color-retro-orange)] text-[var(--color-retro-bg)] shadow-[0_0_10px_rgba(222,109,56,0.6)] scale-110' 
                      : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/80'
                  }`}
                  title={d.label}
                >
                  {d.label[0]}
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
