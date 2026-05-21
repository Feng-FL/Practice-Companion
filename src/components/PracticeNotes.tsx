import React, { useState, useEffect } from 'react';

export default function PracticeNotes({ 
  notes, 
  onChange 
}: { 
  notes: string;
  onChange: (n: string) => void;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="p-5 sm:p-6 flex-1 flex flex-col h-full relative text-[var(--color-retro-text)]">
      <div className="flex justify-between items-center mb-3 sm:mb-4">
        <span className="text-[10px] font-sans uppercase tracking-[0.2em] font-bold text-[var(--color-retro-orange)]">Practice Notes</span>
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
