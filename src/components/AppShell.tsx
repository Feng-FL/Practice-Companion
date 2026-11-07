import React, { useState, type ReactNode } from 'react';

/**
 * The one layout used by the app. Both the production app and the design
 * preview render this same shell, so there is a single arrangement to keep
 * consistent rather than two parallel interfaces.
 */
interface Props {
  header: (ctrl: { toggleLibrary: () => void }) => ReactNode;
  /** Banners / progress messages, shown directly under the header. */
  notices?: ReactNode;
  library: ReactNode;
  sheet: ReactNode;
  notes: (ctrl: { open: boolean; toggle: () => void }) => ReactNode;
  audio: ReactNode;
  /** Fixed-position dialogs. */
  overlays?: ReactNode;
}

export default function AppShell({
  header,
  notices,
  library,
  sheet,
  notes,
  audio,
  overlays,
}: Props) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(true);

  const toggleLibrary = () => setLibraryOpen((v) => !v);

  return (
    <div className="pc-shell">
      {header({ toggleLibrary })}

      {notices && <div className="px-3.5 pb-3">{notices}</div>}

      <div className="pc-body" data-notes={notesOpen ? 'open' : 'closed'}>
        <aside className={`pc-library${libraryOpen ? ' pc-library--open' : ''}`}>{library}</aside>
        <main className="pc-center">{sheet}</main>
        <aside className="pc-notes">
          {notes({ open: notesOpen, toggle: () => setNotesOpen((v) => !v) })}
        </aside>
      </div>

      <footer className="pc-audio">{audio}</footer>

      {/* Mobile drawer backdrop */}
      {libraryOpen && (
        <button
          type="button"
          aria-label="Close library"
          onClick={() => setLibraryOpen(false)}
          className="fixed inset-0 z-[65] bg-black/50 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {overlays}
    </div>
  );
}
