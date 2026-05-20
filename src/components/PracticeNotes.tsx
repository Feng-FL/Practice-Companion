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
    <div className="p-8 flex-1 flex flex-col bg-white h-full relative">
      <div className="flex justify-between items-center mb-4">
        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#1A1A1A]">Practice Notes</span>
      </div>

      <div className="flex-1 border-t border-[#EEE] pt-4 relative flex flex-col h-full">
        <textarea
          value={notes}
          onChange={handleChange}
          spellCheck={false}
          placeholder="Start typing notes..."
          className="w-full flex-1 bg-transparent text-[#444] placeholder:opacity-40 placeholder:italic font-serif leading-relaxed text-sm resize-none focus:outline-none"
        />
      </div>
    </div>
  );
}
