import React from 'react';
import { MUSICAL_KEYS } from '../lib/keys';

export default function PracticeNotes({
  notes,
  onChange,
  musicalKeys = [],
  onKeyToggle,
  headerAction,
}: {
  notes: string;
  onChange: (n: string) => void;
  musicalKeys?: string[];
  onKeyToggle?: (key: string) => void;
  /** Extra control rendered on the far right of the title row. */
  headerAction?: React.ReactNode;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="flex h-full min-h-0 flex-col p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-3">
        <h2 className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text">
          Practice Notes
        </h2>
        <div className="h-px flex-1 bg-app-border-soft" />
        {headerAction}
      </div>

      {onKeyToggle && (
        <div className="pc-scroll -mx-1 mb-3 flex gap-1 overflow-x-auto px-1 pb-1">
          {MUSICAL_KEYS.map((k) => {
            const isActive = musicalKeys.includes(k);
            return (
              <button
                key={k}
                onClick={() => onKeyToggle(k)}
                title={k}
                aria-pressed={isActive}
                className={[
                  'inline-flex h-7 min-w-[28px] shrink-0 items-center justify-center rounded-lg px-2',
                  'text-[11px] font-semibold leading-none transition-colors duration-150 outline-none',
                  'focus-visible:ring-2 focus-visible:ring-app-accent',
                  isActive
                    ? 'bg-app-accent text-app-on-accent'
                    : 'bg-app-sunken text-app-muted hover:text-app-text',
                ].join(' ')}
              >
                {k}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-app-border bg-app-sunken p-3 sm:p-4">
        <textarea
          value={notes}
          onChange={handleChange}
          spellCheck={false}
          placeholder="Start typing notes..."
          aria-label="Practice notes"
          className="min-h-0 w-full flex-1 resize-none bg-transparent text-sm leading-relaxed text-app-text outline-none placeholder:italic placeholder:text-app-muted"
        />
      </div>
    </div>
  );
}
