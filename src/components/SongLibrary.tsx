import React, { useMemo, useState } from 'react';
import { Search, Plus, Trash2, X, Music4 } from 'lucide-react';
import Button from './ui/Button';
import Chip from './ui/Chip';
import IconButton from './ui/IconButton';
import { MUSICAL_KEYS } from '../lib/keys';
import type { LoadedItem } from '../lib/types';

interface Props {
  items: LoadedItem[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (item: LoadedItem) => void;
  /** Closes the mobile drawer. */
  onClose?: () => void;
}

export default function SongLibrary({
  items,
  currentId,
  onSelect,
  onNew,
  onDelete,
  onClose,
}: Props) {
  const [query, setQuery] = useState('');
  const [filterKey, setFilterKey] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filterKey && !item.musicalKeys?.includes(filterKey)) return false;
      if (!q) return true;
      return item.name.toLowerCase().includes(q);
    });
  }, [items, query, filterKey]);

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-[var(--app-shadow)]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-app-border-soft px-4 py-3">
        <Music4 className="h-4 w-4 shrink-0 text-app-accent" />
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text">Library</h2>
        <span className="font-mono text-[10px] text-app-muted">{items.length}</span>
        {onClose && (
          <IconButton label="Close library" onClick={onClose} className="ml-auto lg:hidden">
            <X className="h-4 w-4" />
          </IconButton>
        )}
      </div>

      {/* Search */}
      <div className="px-4 pt-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pieces"
            aria-label="Search pieces"
            className="h-10 w-full rounded-xl border border-app-border bg-app-sunken pl-9 pr-3 text-sm text-app-text outline-none transition-colors placeholder:text-app-muted focus:border-app-accent focus:bg-app-raised"
          />
        </div>
      </div>

      {/* Key filter */}
      <div className="px-4 pt-3">
        <div className="flex items-center gap-2 pb-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-app-muted">Key</span>
          <div className="h-px flex-1 bg-app-border-soft" />
        </div>
        <div className="pc-scroll -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
          <Chip
            active={filterKey === null}
            onClick={() => setFilterKey(null)}
            className="shrink-0 px-2.5"
          >
            All
          </Chip>
          {MUSICAL_KEYS.map((key) => (
            <Chip
              key={key}
              active={filterKey === key}
              onClick={() => setFilterKey(filterKey === key ? null : key)}
              className="shrink-0"
            >
              {key}
            </Chip>
          ))}
        </div>
      </div>

      {/* New */}
      <div className="px-4 pt-4">
        <Button variant="primary" onClick={onNew} className="w-full" tracked={false}>
          <Plus className="h-4 w-4" />
          <span className="font-semibold">New Session</span>
        </Button>
      </div>

      {/* List */}
      <div className="pc-scroll mt-3 min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {visible.map((item) => {
          const active = item.id === currentId;
          return (
            <div
              key={item.id}
              className={[
                'group flex items-stretch rounded-xl transition-colors duration-150',
                active ? 'bg-app-accent-soft' : 'hover:bg-app-sunken',
              ].join(' ')}
            >
              <button
                onClick={() => onSelect(item.id)}
                className="min-w-0 flex-1 px-3 py-2.5 text-left outline-none"
                aria-current={active ? 'true' : undefined}
              >
                <span
                  className={[
                    'flex items-center gap-2 text-sm font-medium',
                    active ? 'text-app-accent' : 'text-app-text',
                  ].join(' ')}
                >
                  <span className="truncate">{item.name}</span>
                  {item.musicalKeys && item.musicalKeys.length > 0 && (
                    <span className="ml-auto flex shrink-0 gap-1">
                      {item.musicalKeys.map((k) => (
                        <span
                          key={k}
                          className="rounded bg-app-sunken px-1 text-[9px] font-semibold leading-4 text-app-muted"
                        >
                          {k}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.1em] text-app-muted">
                  {new Date(item.updatedAt).toLocaleDateString()}
                </span>
              </button>
              <button
                onClick={() => onDelete(item)}
                aria-label={`Delete ${item.name}`}
                title="Delete this piece from the cloud"
                className="flex w-10 items-center justify-center rounded-xl text-app-muted opacity-0 transition-opacity hover:text-app-danger focus-visible:opacity-100 group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}

        {visible.length === 0 && (
          <div className="px-3 py-10 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-app-muted">
              {items.length === 0 ? 'No saved scores' : 'No match'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
