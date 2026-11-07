import React, { useState, useEffect } from 'react';
import AudioPlayer from './components/AudioPlayer';
import SheetViewer from './components/SheetViewer';
import AppShell from './components/AppShell';
import TopBar from './components/TopBar';
import SongLibrary from './components/SongLibrary';
import NotesPanel from './components/NotesPanel';
import { Trash2, Upload as UploadIcon } from 'lucide-react';
import { Store } from './lib/store';
import { useSyncToken } from './hooks/useSyncToken';
import { useSyncStatus } from './hooks/useSyncStatus';
import { useTheme } from './hooks/useTheme';
import TokenGate from './components/TokenGate';
import MigrationBanner from './components/MigrationBanner';
import SettingsModal from './components/SettingsModal';
import Button from './components/ui/Button';
import type { LoadedItem } from './lib/types';

export default function App() {
  // ---- Token gate ----
  const { token } = useSyncToken();
  if (!token) {
    return <TokenGate />;
  }

  return <AppBody />;
}

function AppBody() {
  // ---- Cloud-synced items ----
  const [items, setItems] = useState<LoadedItem[]>([]);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);

  // ---- Currently-committed file refs (URLs come from cloud; mime/filename too) ----
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [sheetMime, setSheetMime] = useState<string | undefined>();
  const [sheetFilename, setSheetFilename] = useState<string | undefined>();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioMime, setAudioMime] = useState<string | undefined>();
  const [audioFilename, setAudioFilename] = useState<string | undefined>();

  // ---- Pending uploads (Files queued for upload on next save) ----
  const [pendingAudioFile, setPendingAudioFile] = useState<File | null>(null);
  const [pendingSheetFile, setPendingSheetFile] = useState<File | null>(null);

  // ---- Editable metadata ----
  const [notes, setNotes] = useState<string>('');
  const [musicalKeys, setMusicalKeys] = useState<string[]>([]);

  // ---- UI state ----
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ audio?: number; sheet?: number } | null>(null);
  const [sessionName, setSessionName] = useState('New Session');
  const [isEditingName, setIsEditingName] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<LoadedItem | null>(null);

  // ---- Sync + theme ----
  const [sync, tickSync] = useSyncStatus();
  const { theme, toggleTheme } = useTheme();

  // ---- Initial load + refresh hook ----
  const refreshList = async () => {
    const all = await Store.getAllItems();
    setItems(all);
  };
  useEffect(() => { refreshList(); }, []);
  // Reload when token changes (Settings → Update)

  const currentItem = items.find((i) => i.id === currentItemId) ?? null;

  const loadItem = async (id: string) => {
    const item = await Store.getItem(id);
    if (!item) return;
    setCurrentItemId(item.id);
    setSessionName(item.name);
    setSheetUrl(item.sheetSignedUrl ?? null);
    setSheetMime(item.sheet?.mime);
    setSheetFilename(item.sheet?.filename);
    setAudioUrl(item.audioSignedUrl ?? null);
    setAudioMime(item.audio?.mime);
    setAudioFilename(item.audio?.filename);
    setNotes(item.notes ?? '');
    setMusicalKeys(item.musicalKeys ?? []);
    setPendingSheetFile(null);
    setPendingAudioFile(null);
  };

  const handleNew = () => {
    setCurrentItemId(null);
    setSessionName('New Session');
    setSheetUrl(null); setSheetMime(undefined); setSheetFilename(undefined);
    setAudioUrl(null); setAudioMime(undefined); setAudioFilename(undefined);
    setPendingAudioFile(null); setPendingSheetFile(null);
    setNotes('');
    setMusicalKeys([]);
    setSaveError(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setUploadProgress({});
    try {
      let id = currentItemId ?? undefined;
      let nameToSave = sessionName;
      const isNew = !id;

      if (isNew && sessionName === 'New Session') {
        const suggestedName =
          (pendingSheetFile?.name ?? sheetFilename ?? '').replace(/\.[^/.]+$/, '') ||
          (pendingAudioFile?.name ?? audioFilename ?? '').replace(/\.[^/.]+$/, '') ||
          'Untitled Score';
        const inputName = window.prompt('Enter a name for this piece:', suggestedName);
        if (!inputName) {
          setIsSaving(false);
          return;
        }
        nameToSave = inputName;
        setSessionName(inputName);
      }

      const saved = await Store.saveItem(
        {
          id,
          name: nameToSave,
          notes,
          musicalKeys,
          audioFile: pendingAudioFile ?? undefined,
          sheetFile: pendingSheetFile ?? undefined,
        },
        (phase, loaded, total) => {
          setUploadProgress((p) => ({ ...p, [phase]: total > 0 ? loaded / total : 0 }));
        },
      );

      setCurrentItemId(saved.id);
      setAudioUrl(saved.audioSignedUrl ?? null);
      setAudioMime(saved.audio?.mime);
      setAudioFilename(saved.audio?.filename);
      setSheetUrl(saved.sheetSignedUrl ?? null);
      setSheetMime(saved.sheet?.mime);
      setSheetFilename(saved.sheet?.filename);
      setPendingAudioFile(null);
      setPendingSheetFile(null);
      await refreshList();
      tickSync();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setSaveError(msg);
      console.error('[App.handleSave] failed', e);
    } finally {
      setIsSaving(false);
      setTimeout(() => setUploadProgress(null), 1200);
    }
  };

  const handleDelete = async (item: LoadedItem) => {
    setPendingDelete(null);
    try {
      await Store.deleteItem(item.id);
      if (currentItemId === item.id) handleNew();
      await refreshList();
      tickSync();
    } catch (e) {
      console.error('[App.handleDelete] failed', e);
      alert('Delete failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  const toggleMusicalKey = (key: string) => {
    setMusicalKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  return (
    <AppShell
      header={({ toggleLibrary }) => (
        <TopBar
          sessionName={sessionName}
          isEditingName={isEditingName}
          onStartRename={() => setIsEditingName(true)}
          onRenameChange={setSessionName}
          onRenameCommit={() => setIsEditingName(false)}
          canDelete={Boolean(currentItemId)}
          onDeleteCurrent={() => currentItem && setPendingDelete(currentItem)}
          onSave={handleSave}
          isSaving={isSaving}
          onOpenSettings={() => setShowSettings(true)}
          sync={sync}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenLibrary={toggleLibrary}
          itemCount={items.length}
        />
      )}
      notices={
        <>
          <MigrationBanner onDone={() => refreshList()} />

          {uploadProgress && (uploadProgress.audio !== undefined || uploadProgress.sheet !== undefined) && isSaving && (
            <div className="flex items-center gap-3 rounded-xl border border-app-border bg-app-surface px-4 py-3 text-xs">
              <UploadIcon className="h-4 w-4 shrink-0 text-app-accent" />
              <div className="flex-1 space-y-1">
                {uploadProgress.audio !== undefined && (
                  <div>
                    <span className="text-app-muted">Audio: {Math.round(uploadProgress.audio * 100)}%</span>
                    <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-app-sunken">
                      <div className="h-full bg-app-accent" style={{ width: `${Math.round(uploadProgress.audio * 100)}%` }} />
                    </div>
                  </div>
                )}
                {uploadProgress.sheet !== undefined && (
                  <div>
                    <span className="text-app-muted">Sheet: {Math.round(uploadProgress.sheet * 100)}%</span>
                    <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-app-sunken">
                      <div className="h-full bg-app-accent" style={{ width: `${Math.round(uploadProgress.sheet * 100)}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {saveError && (
            <div className="rounded-xl border border-app-danger/35 bg-app-danger-soft px-4 py-3 text-xs text-app-danger">
              Save failed: {saveError}
            </div>
          )}
        </>
      }
      library={
        <SongLibrary
          items={items}
          currentId={currentItemId}
          onSelect={loadItem}
          onNew={handleNew}
          onDelete={setPendingDelete}
        />
      }
      sheet={
        <SheetViewer
          sheetUrl={sheetUrl}
          sheetMime={sheetMime}
          sheetFilename={sheetFilename}
          onLoadFile={(f) => setPendingSheetFile(f)}
        />
      }
      notes={({ open, toggle }) => (
        <NotesPanel
          open={open}
          onToggle={toggle}
          notes={notes}
          onChange={setNotes}
          musicalKeys={musicalKeys}
          onKeyToggle={toggleMusicalKey}
        />
      )}
      audio={
        <AudioPlayer
          audioUrl={audioUrl}
          audioFilename={audioFilename}
          onLoadFile={(f) => setPendingAudioFile(f)}
        />
      }
      overlays={
        <>
          {showSettings && (
            <SettingsModal
              status={sync}
              onClose={() => setShowSettings(false)}
              onTokenChanged={() => { refreshList(); tickSync(); }}
              onLocalCleared={() => refreshList()}
            />
          )}

          {/* Delete confirm */}
          {pendingDelete && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
              onClick={() => setPendingDelete(null)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Delete piece?"
                className="w-full max-w-sm rounded-2xl border border-app-border bg-app-surface p-6 shadow-[var(--app-shadow-lg)]"
              >
                <div className="mb-3 flex items-start gap-2">
                  <Trash2 className="mt-1 h-5 w-5 shrink-0 text-app-danger" />
                  <h3 className="text-lg font-semibold text-app-text">Delete piece?</h3>
                </div>
                <p className="mb-4 text-sm leading-relaxed text-app-muted">
                  Remove <strong className="text-app-text">&quot;{pendingDelete.name}&quot;</strong> from the cloud?
                  This affects every device.
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setPendingDelete(null)}>
                    Cancel
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(pendingDelete)}>
                    Delete from cloud
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      }
    />
  );
}
