/**
 * Design preview harness — DEV ONLY.
 *
 * Renders the exact same shared components the production app uses
 * (AppShell / TopBar / SongLibrary / SheetViewer / NotesPanel / AudioPlayer)
 * with entirely synthetic data:
 *   - the score image is drawn on a canvas at runtime
 *   - the audio track is a synthesized WAV
 *   - the library rows are made up
 *
 * It never touches IndexedDB, the sync API, the network, or real user data,
 * and it does not write to the app's localStorage keys.
 *
 * Usage:  /design-preview/?theme=paper   or   ?theme=studio
 */

import { createRoot } from 'react-dom/client';
import { useEffect, useMemo, useState } from 'react';
import '../src/index.css';
import AppShell from '../src/components/AppShell';
import TopBar from '../src/components/TopBar';
import SongLibrary from '../src/components/SongLibrary';
import SheetViewer from '../src/components/SheetViewer';
import NotesPanel from '../src/components/NotesPanel';
import AudioPlayer from '../src/components/AudioPlayer';
import { applyTheme, type Theme } from '../src/lib/theme';
import type { LoadedItem } from '../src/lib/types';
import type { SyncStatus as SyncStatusData } from '../src/hooks/useSyncStatus';

/* ------------------------------------------------------------------ */
/* Synthetic assets                                                    */
/* ------------------------------------------------------------------ */

/** Draws a page of sheet music on a canvas and returns it as a data URL. */
function makeSheetImage(): string {
  const w = 1240;
  const h = 1754;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  if (!g) return '';

  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, w, h);

  g.fillStyle = '#161616';
  g.textAlign = 'center';
  g.font = '600 52px Georgia, "Times New Roman", serif';
  g.fillText('Blue Bossa', w / 2, 168);
  g.font = 'italic 30px Georgia, "Times New Roman", serif';
  g.fillStyle = '#3a3a3a';
  g.fillText('Medium swing — Cm', w / 2, 222);

  const systems = 4;
  const top = 340;
  const systemGap = 320;
  const left = 120;
  const right = w - 120;
  const lineGap = 13;

  for (let s = 0; s < systems; s++) {
    const base = top + s * systemGap;

    // Staff lines
    g.strokeStyle = '#1b1b1b';
    g.lineWidth = 1.6;
    for (let i = 0; i < 5; i++) {
      const y = base + i * lineGap;
      g.beginPath();
      g.moveTo(left, y);
      g.lineTo(right, y);
      g.stroke();
    }

    // Bar lines + one beat of "notes"
    const barCount = 9;
    const barWidth = (right - left) / barCount;
    for (let b = 0; b <= barCount; b++) {
      const x = left + b * barWidth;
      g.lineWidth = b % 4 === 0 ? 2.4 : 1.2;
      g.beginPath();
      g.moveTo(x, base);
      g.lineTo(x, base + 4 * lineGap);
      g.stroke();
    }

    g.lineWidth = 1.6;
    for (let b = 0; b < barCount; b++) {
      const beatCount = b % 4 === 3 ? 2 : 4;
      for (let beat = 0; beat < beatCount; beat++) {
        const x = left + b * barWidth + (beat + 0.5) * (barWidth / beatCount);
        const step = Math.round(((s * 7 + b * 3 + beat) % 7) - 3);
        const y = base + (3 - step * 0.7) * lineGap;
        const up = step % 2 === 0;

        g.fillStyle = '#161616';
        g.beginPath();
        g.ellipse(x, y, 11, 7.5, -0.35, 0, Math.PI * 2);
        g.fill();

        g.strokeStyle = '#161616';
        g.lineWidth = 1.8;
        g.beginPath();
        g.moveTo(x + (up ? 10 : -10), y);
        g.lineTo(x + (up ? 10 : -10), y + (up ? -48 : 48));
        g.stroke();
      }
    }
  }

  g.fillStyle = '#6a6a6a';
  g.font = '20px Georgia, serif';
  g.textAlign = 'center';
  g.fillText('1', left - 26, top + 34);
  g.fillText('2', left - 26, top + systemGap + 34);
  g.fillText('3', left - 26, top + systemGap * 2 + 34);
  g.fillText('4', left - 26, top + systemGap * 3 + 34);

  return canvas.toDataURL('image/png');
}

/** Synthesizes a short WAV so the transport has something real to play. */
function makeAudioUrl(seconds = 12): string {
  const sampleRate = 44100;
  const frames = Math.floor(seconds * sampleRate);
  const buffer = new ArrayBuffer(44 + frames * 2);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + frames * 2, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(36, 'data');
  view.setUint32(40, frames * 2, true);

  for (let i = 0; i < frames; i++) {
    const t = i / sampleRate;
    const phrase = Math.sin(2 * Math.PI * 1.6 * t) > 0 ? 1 : 0.72;
    const env = Math.min(1, t * 6) * Math.exp(-((t % 1.25) * 0.9));
    const tone =
      Math.sin(2 * Math.PI * 220 * t) * 0.26 +
      Math.sin(2 * Math.PI * 330 * t) * 0.14 +
      Math.sin(2 * Math.PI * 110 * t) * 0.1;
    view.setInt16(44 + i * 2, tone * phrase * env * 32000, true);
  }

  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
}

const MOCK_ITEMS: LoadedItem[] = [
  {
    id: 'mock-blue-bossa',
    name: 'Blue Bossa',
    notes: 'Cm\n\nWork on the dorian line over the ii–V. Practice the bridge in 4/4 first.',
    musicalKeys: ['bE'],
    updatedAt: Date.parse('2026-11-06T09:24:00'),
  },
  {
    id: 'mock-autumn-leaves',
    name: 'Autumn Leaves',
    notes: 'G minor\n\nStart at 70 bpm. Left-hand voicing first, no melody.',
    musicalKeys: ['G', 'bE'],
    updatedAt: Date.parse('2026-11-04T18:02:00'),
  },
  {
    id: 'mock-so-what',
    name: 'So What',
    notes: 'D minor\n\nListen for the root on beat one.',
    musicalKeys: ['D'],
    updatedAt: Date.parse('2026-11-01T13:47:00'),
  },
  {
    id: 'mock-take-the-a',
    name: 'Take the A Train',
    notes: 'C major\n\nPlay the head once through without stopping.',
    musicalKeys: ['C', 'bA'],
    updatedAt: Date.parse('2026-10-28T20:15:00'),
  },
];

/* ------------------------------------------------------------------ */
/* Preview                                                             */
/* ------------------------------------------------------------------ */

function Preview() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('theme');
  const [theme, setTheme] = useState<Theme>(requested === 'studio' ? 'studio' : 'paper');

  const [sessionName, setSessionName] = useState('Blue Bossa');
  const [isEditingName, setIsEditingName] = useState(false);
  const [notes, setNotes] = useState(MOCK_ITEMS[0].notes);
  const [musicalKeys, setMusicalKeys] = useState<string[]>(MOCK_ITEMS[0].musicalKeys ?? []);
  const [currentId, setCurrentId] = useState<string | null>(MOCK_ITEMS[0].id);

  const sheetUrl = useMemo(() => makeSheetImage(), []);
  const audioUrl = useMemo(() => makeAudioUrl(), []);

  const sync: SyncStatusData = useMemo(
    () => ({
      state: 'idle',
      lastSuccessAt: Date.now() - 2 * 60 * 1000,
      lastErrorMessage: null,
      itemCount: MOCK_ITEMS.length,
    }),
    [],
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <AppShell
      header={({ toggleLibrary }) => (
        <TopBar
          sessionName={sessionName}
          isEditingName={isEditingName}
          onStartRename={() => setIsEditingName(true)}
          onRenameChange={setSessionName}
          onRenameCommit={() => setIsEditingName(false)}
          canDelete
          onDeleteCurrent={() => {}}
          onSave={() => {}}
          isSaving={false}
          onOpenSettings={() => {}}
          sync={sync}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'studio' ? 'paper' : 'studio'))}
          onOpenLibrary={toggleLibrary}
          itemCount={MOCK_ITEMS.length}
        />
      )}
      library={
        <SongLibrary
          items={MOCK_ITEMS}
          currentId={currentId}
          onSelect={(id) => {
            setCurrentId(id);
            const item = MOCK_ITEMS.find((i) => i.id === id);
            if (item) {
              setSessionName(item.name);
              setNotes(item.notes ?? '');
              setMusicalKeys(item.musicalKeys ?? []);
            }
          }}
          onNew={() => {
            setCurrentId(null);
            setSessionName('New Session');
            setNotes('');
            setMusicalKeys([]);
          }}
          onDelete={() => {}}
        />
      }
      sheet={
        <SheetViewer
          sheetUrl={sheetUrl}
          sheetMime="image/png"
          sheetFilename="blue-bossa.png"
          onLoadFile={() => {}}
        />
      }
      notes={({ open, toggle }) => (
        <NotesPanel
          open={open}
          onToggle={toggle}
          notes={notes}
          onChange={setNotes}
          musicalKeys={musicalKeys}
          onKeyToggle={(key) =>
            setMusicalKeys((prev) =>
              prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
            )
          }
        />
      )}
      audio={
        <AudioPlayer
          audioUrl={audioUrl}
          audioFilename="blue-bossa-take-1.wav"
          onLoadFile={() => {}}
        />
      }
    />
  );
}

createRoot(document.getElementById('root')!).render(<Preview />);
