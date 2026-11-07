import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import PracticeNotes from './PracticeNotes';
import IconButton from './ui/IconButton';

interface Props {
  open: boolean;
  onToggle: () => void;
  notes: string;
  onChange: (n: string) => void;
  musicalKeys: string[];
  onKeyToggle: (key: string) => void;
}

/**
 * Right-hand column. Collapses to a slim rail on desktop and to a short bar
 * on small screens; the notes editor itself is shared with the app.
 */
export default function NotesPanel({
  open,
  onToggle,
  notes,
  onChange,
  musicalKeys,
  onKeyToggle,
}: Props) {
  if (!open) {
    return (
      <button
        type="button"
        onClick={onToggle}
        title="Show practice notes"
        aria-label="Show practice notes"
        className={[
          'flex w-full items-center gap-2 rounded-2xl border border-app-border bg-app-surface',
          'text-app-muted transition-colors duration-150 hover:text-app-text',
          'h-14 px-3 lg:h-full lg:w-full lg:flex-col lg:justify-center lg:gap-3 lg:px-0',
        ].join(' ')}
      >
        <ChevronRight className="h-4 w-4 shrink-0 lg:hidden" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] lg:hidden">
          Practice Notes
        </span>
        <span
          className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] lg:block"
          style={{ writingMode: 'vertical-rl' }}
        >
          Practice Notes
        </span>
        <ChevronLeft className="hidden h-4 w-4 shrink-0 lg:block" />
      </button>
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-[var(--app-shadow)]">
      <PracticeNotes
        notes={notes}
        onChange={onChange}
        musicalKeys={musicalKeys}
        onKeyToggle={onKeyToggle}
        headerAction={
          <IconButton label="Hide practice notes" onClick={onToggle} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </IconButton>
        }
      />
    </section>
  );
}
