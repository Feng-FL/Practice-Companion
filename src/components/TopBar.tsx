import React, { useRef } from 'react';
import {
  Music,
  Pencil,
  Trash2,
  Save,
  Loader2,
  Settings as SettingsIcon,
  Library as LibraryIcon,
} from 'lucide-react';
import IconButton from './ui/IconButton';
import Button from './ui/Button';
import SyncStatus from './SyncStatus';
import ThemeToggle from './ThemeToggle';
import type { SyncStatus as SyncStatusData } from '../hooks/useSyncStatus';
import type { Theme } from '../lib/theme';

interface Props {
  sessionName: string;
  isEditingName: boolean;
  onStartRename: () => void;
  onRenameChange: (value: string) => void;
  onRenameCommit: () => void;
  canDelete: boolean;
  onDeleteCurrent: () => void;
  onSave: () => void;
  isSaving: boolean;
  onOpenSettings: () => void;
  sync: SyncStatusData;
  theme: Theme;
  onToggleTheme: () => void;
  onOpenLibrary: () => void;
  itemCount: number;
}

export default function TopBar({
  sessionName,
  isEditingName,
  onStartRename,
  onRenameChange,
  onRenameCommit,
  canDelete,
  onDeleteCurrent,
  onSave,
  isSaving,
  onOpenSettings,
  sync,
  theme,
  onToggleTheme,
  onOpenLibrary,
  itemCount,
}: Props) {
  const nameInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-5 lg:px-6">
      {/* Left: brand + current piece */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative lg:hidden">
          <IconButton
            label={`Open library (${itemCount} pieces)`}
            onClick={onOpenLibrary}
            className="border border-app-border bg-app-raised"
          >
            <LibraryIcon className="h-[18px] w-[18px]" />
          </IconButton>
          {itemCount > 0 && (
            <span className="pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-app-accent px-1 font-mono text-[9px] font-semibold text-app-on-accent">
              {itemCount}
            </span>
          )}
        </div>

        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <Music className="h-4 w-4 text-app-accent" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-app-text">
            Practice Companion
          </span>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {isEditingName ? (
            <input
              ref={nameInputRef}
              type="text"
              value={sessionName}
              autoFocus
              onChange={(e) => onRenameChange(e.target.value)}
              onBlur={onRenameCommit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onRenameCommit();
                if (e.key === 'Escape') onRenameCommit();
              }}
              aria-label="Piece name"
              className="h-9 min-w-0 max-w-sm flex-1 rounded-xl border border-app-accent bg-app-raised px-3 text-base font-semibold text-app-text outline-none sm:text-lg"
            />
          ) : (
            <>
              <button
                onClick={onStartRename}
                title="Rename piece"
                className="min-w-0 truncate rounded-lg px-1 py-0.5 text-base font-semibold text-app-text transition-colors hover:text-app-accent sm:text-lg"
              >
                {sessionName}
              </button>
              <IconButton label="Rename piece" onClick={onStartRename} className="h-8 w-8">
                <Pencil className="h-[15px] w-[15px]" />
              </IconButton>
            </>
          )}

          {canDelete && (
            <IconButton label="Delete this piece from the cloud" tone="danger" onClick={onDeleteCurrent}>
              <Trash2 className="h-[15px] w-[15px]" />
            </IconButton>
          )}
        </div>
      </div>

      {/* Right: theme, sync, settings, save. On phones this drops onto its
          own row so the title keeps a readable amount of room. */}
      <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        <SyncStatus status={sync} onClick={onOpenSettings} />
        <IconButton
          label="Settings"
          onClick={onOpenSettings}
          className="border border-app-border bg-app-raised"
        >
          <SettingsIcon className="h-[18px] w-[18px]" />
        </IconButton>
        <Button variant="primary" onClick={onSave} disabled={isSaving} className="shrink-0">
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="hidden sm:inline">Saving…</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span className="hidden sm:inline">Save</span>
            </>
          )}
        </Button>
      </div>
    </header>
  );
}
