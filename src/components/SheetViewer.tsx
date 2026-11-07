import React, { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, ChevronLeft, ChevronRight, Move } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import Button from './ui/Button';

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

interface Props {
  sheetUrl: string | null;
  sheetMime?: string;
  sheetFilename?: string;
  onLoadFile: (file: File) => void;
}

function looksLikePdf(mime?: string, filename?: string): boolean {
  if (mime && mime.toLowerCase().includes('pdf')) return true;
  if (filename && filename.toLowerCase().endsWith('.pdf')) return true;
  return false;
}

export default function SheetViewer({ sheetUrl, sheetMime, sheetFilename, onLoadFile }: Props) {
  const [fileType, setFileType] = useState<'image' | 'pdf' | null>(null);
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [fitMode, setFitMode] = useState<'width' | 'page'>('page');

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (sheetUrl) {
      setPdfError(null);
      setFileType(looksLikePdf(sheetMime, sheetFilename) ? 'pdf' : 'image');
      setPageNumber(1);
    } else {
      setFileType(null);
    }
  }, [sheetUrl, sheetMime, sheetFilename]);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          setContainerSize({
            width: entry.contentRect.width - 16,
            height: entry.contentRect.height - 16,
          });
        }
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
    setPageNumber(1);
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoadFile(file);
    }
  };

  const toggleFitMode = () => {
    setFitMode((prev) => (prev === 'page' ? 'width' : 'page'));
  };

  return (
    <section className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-[var(--app-shadow)]">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-app-border-soft px-4 py-3 sm:gap-3 sm:px-5">
        <h2 className="shrink-0 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text">
          Master Score
        </h2>

        <div className="flex shrink-0 items-center gap-2">
          {sheetUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFitMode}
              tracked={false}
              aria-label={fitMode === 'page' ? 'Fit width' : 'Fit page'}
              className="px-2.5 sm:px-3"
            >
              <Move className="h-3.5 w-3.5 text-app-accent" />
              <span className="hidden whitespace-nowrap sm:inline">
                {fitMode === 'page' ? 'Fit width' : 'Fit page'}
              </span>
            </Button>
          )}
          <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-xl border border-app-border bg-app-raised px-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-app-text transition-colors duration-150 hover:border-app-accent hover:bg-app-accent-soft sm:px-3">
            <Upload className="h-3.5 w-3.5 shrink-0 text-app-accent" />
            <span className="whitespace-nowrap">
              Load<span className="hidden sm:inline"> Score</span>
            </span>
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>
      </div>

      {/* Canvas */}
      <div className="pc-sheet-grid relative flex min-h-0 flex-1 flex-col overflow-hidden bg-app-sunken p-3 sm:p-5">
        {sheetUrl ? (
          <div className="relative mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-app-border bg-app-raised shadow-[var(--app-shadow)]">
            <div
              ref={containerRef}
              className={`group relative flex h-full w-full flex-1 ${
                fitMode === 'page'
                  ? 'items-center justify-center overflow-hidden'
                  : 'overflow-y-auto overflow-x-hidden'
              }`}
            >
              {fileType === 'image' ? (
                <img
                  src={sheetUrl}
                  alt="Sheet Music"
                  className={
                    fitMode === 'page'
                      ? 'absolute h-full w-full object-contain'
                      : 'block h-auto w-full'
                  }
                />
              ) : (
                <Document
                  file={sheetUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={(error) => setPdfError(error.message)}
                  className={`flex w-full flex-col items-center ${
                    fitMode === 'page' ? 'h-full justify-center' : 'min-h-full justify-start'
                  }`}
                  loading={
                    <div className="flex h-64 items-center justify-center font-mono text-[10px] uppercase tracking-[0.2em] text-app-muted">
                      Loading PDF…
                    </div>
                  }
                  error={
                    <div className="mx-auto flex max-w-sm flex-col items-center justify-center p-8 text-center">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-app-danger">
                        Failed to load PDF
                      </p>
                      <p className="text-xs text-app-muted">{pdfError || 'Unknown error'}</p>
                    </div>
                  }
                >
                  {containerSize.width > 0 && (
                    <Page
                      pageNumber={pageNumber}
                      width={fitMode === 'width' ? containerSize.width : undefined}
                      height={fitMode === 'page' ? containerSize.height : undefined}
                      className="rounded-sm bg-white shadow-[var(--app-shadow-lg)]"
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      loading=""
                    />
                  )}
                </Document>
              )}

              {fileType === 'pdf' && numPages && numPages > 1 && (
                <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-app-border bg-app-raised p-1.5 shadow-[var(--app-shadow)]">
                  <button
                    onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                    disabled={pageNumber <= 1}
                    aria-label="Previous page"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-app-muted transition-colors hover:bg-app-sunken hover:text-app-text disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-2 font-mono text-[11px] font-semibold tabular-nums text-app-text">
                    {pageNumber} / {numPages}
                  </span>
                  <button
                    onClick={() => setPageNumber(Math.min(numPages || 1, pageNumber + 1))}
                    disabled={pageNumber >= (numPages || 1)}
                    aria-label="Next page"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-app-muted transition-colors hover:bg-app-sunken hover:text-app-text disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mx-auto my-auto w-full max-w-sm rounded-2xl border border-app-border bg-app-surface p-10 text-center shadow-[var(--app-shadow)]">
            <ImageIcon className="mx-auto mb-5 h-11 w-11 text-app-accent" />
            <h3 className="mb-2 text-lg font-semibold text-app-text">Awaiting Score</h3>
            <p className="text-sm leading-relaxed text-app-muted">
              Load a PDF or image of your sheet music to begin the session.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
