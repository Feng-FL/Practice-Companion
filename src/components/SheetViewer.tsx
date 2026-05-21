import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Image as ImageIcon, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export default function SheetViewer({ 
  sheetFile, 
  onLoadFile 
}: { 
  sheetFile: File | null;
  onLoadFile: (file: File) => void;
}) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'pdf' | null>(null);
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [fitMode, setFitMode] = useState<'width' | 'page'>('page');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (sheetFile) {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
      const url = URL.createObjectURL(sheetFile);
      setFileUrl(url);
      setPdfError(null);
      setFileType(sheetFile.type.includes('pdf') ? 'pdf' : 'image');
      setPageNumber(1);
      
      return () => URL.revokeObjectURL(url);
    } else {
       setFileUrl(null);
       setFileType(null);
    }
  }, [sheetFile]);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          setContainerSize({
            width: entry.contentRect.width - 16,
            height: entry.contentRect.height - 16
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
    setFitMode(prev => prev === 'page' ? 'width' : 'page');
  };

  return (
    <section className="flex-1 flex flex-col overflow-hidden relative h-full w-full text-[var(--color-retro-text)]">
      {/* Absolute Header Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 lg:p-6 flex justify-between items-center z-20 pointer-events-none">
        <div className="hidden md:block px-5 py-2 bg-[var(--color-retro-teal)] text-[var(--color-retro-bg)] rounded-full text-[10px] uppercase font-sans tracking-[0.2em] font-bold pointer-events-auto shadow-md">
          Master Score
        </div>
        
        <div className="flex items-center gap-2 lg:gap-4 pointer-events-auto ml-auto">
          {fileUrl && (
            <button 
              onClick={toggleFitMode}
              className="px-4 py-2 bg-[var(--color-retro-bg)]/80 backdrop-blur-md rounded-full shadow-lg border border border-white/5 hover:-translate-y-0.5 hover:border-[var(--color-retro-teal)] text-[var(--color-retro-text)] text-[10px] uppercase tracking-widest font-sans font-bold transition-all flex items-center gap-2"
              title="Toggle Fit Mode"
            >
              {fitMode === 'page' ? <><Move className="w-3 h-3 text-[var(--color-retro-teal)]" /> Fit Width</> : <><ZoomOut className="w-3 h-3 text-[var(--color-retro-teal)]" /> Fit Page</>}
            </button>
          )}
          <label className="cursor-pointer px-5 py-2 bg-[var(--color-retro-bg)] border hover:-translate-y-0.5 border-white/5 hover:border-[var(--color-retro-teal)] rounded-full shadow-lg text-[10px] uppercase font-sans tracking-widest font-bold transition-all flex items-center gap-2">
            <Upload className="w-3 h-3 text-[var(--color-retro-teal)]" />
            Load Score
            <input 
              type="file" 
              accept="image/*,application/pdf" 
              className="hidden" 
              onChange={handleFileUpload}
            />
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-2 lg:p-6 flex flex-col pt-16 lg:pt-20 relative">
        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(var(--color-retro-text)_1px,transparent_1px)] [background-size:24px_24px]"></div>
        {fileUrl ? (
          <div className="w-full flex-1 max-w-6xl mx-auto rounded-xl border border-white/5 bg-white/5 p-2 shadow-inner relative flex flex-col overflow-hidden z-10">
            <div 
              ref={containerRef}
              className={`flex-1 w-full h-full relative group rounded-lg ${fitMode === 'page' ? 'overflow-hidden flex items-center justify-center' : 'overflow-y-auto overflow-x-hidden'}`}
            >
              {fileType === 'image' ? (
                <img 
                  src={fileUrl} 
                  alt="Sheet Music" 
                  className={fitMode === 'page' ? 'absolute w-full h-full object-contain' : 'w-full h-auto block rounded'}
                />
              ) : (
                <Document
                  file={sheetFile}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={(error) => setPdfError(error.message)}
                  className={`flex flex-col items-center w-full min-h-full ${fitMode === 'page' ? 'justify-center h-full' : 'justify-start'}`}
                  loading={
                    <div className="text-[10px] uppercase font-bold tracking-widest font-sans text-[var(--color-retro-teal)] italic h-64 flex items-center justify-center drop-shadow-md">
                      Loading PDF...
                    </div>
                  }
                  error={
                    <div className="text-[10px] uppercase font-bold tracking-widest text-red-500 flex flex-col items-center justify-center p-8 text-center max-w-sm mx-auto">
                      <p className="mb-2">Failed to load PDF</p>
                      <p className="opacity-60">{pdfError || "Unknown error"}</p>
                    </div>
                  }
                >
                  {containerSize.width > 0 && (
                     <Page 
                       pageNumber={pageNumber} 
                       width={fitMode === 'width' ? containerSize.width : undefined}
                       height={fitMode === 'page' ? containerSize.height : undefined}
                       className="border border-white/10 bg-[#f4ece0] shadow-2xl rounded"
                       renderTextLayer={false}
                       renderAnnotationLayer={false}
                       loading=""
                     />
                  )}
                </Document>
              )}
              
              {fileType === 'pdf' && numPages && numPages > 1 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[var(--color-retro-bg)]/90 backdrop-blur-md rounded-full p-2 shadow-xl border border-white/10 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button 
                    onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                    disabled={pageNumber <= 1}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-[var(--color-retro-teal)] hover:text-white transition-colors disabled:opacity-30 disabled:hover:bg-white/10 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[10px] font-mono tabular-nums px-3 font-bold text-white opacity-80">
                    {pageNumber} / {numPages}
                  </span>
                  <button 
                    onClick={() => setPageNumber(Math.min(numPages || 1, pageNumber + 1))}
                    disabled={pageNumber >= (numPages || 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-[var(--color-retro-teal)] hover:text-white transition-colors disabled:opacity-30 disabled:hover:bg-white/10 disabled:cursor-not-allowed"
                  >
                     <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-[400px] w-full border border-white/5 rounded-2xl bg-[var(--color-retro-bg)] shadow-md relative text-center mx-auto my-auto z-10 p-12 overflow-hidden block">
             <div className="absolute top-4 right-6 text-[10px] font-sans uppercase tracking-widest opacity-20">No Score Linked</div>
             <ImageIcon className="w-12 h-12 opacity-20 mx-auto mb-6 text-[var(--color-retro-teal)]" />
             <h3 className="font-display text-2xl mb-4 text-white opacity-90 tracking-wide">Awaiting Score</h3>
             <p className="text-sm opacity-50 font-sans leading-relaxed">Load a PDF or Image of your sheet music to begin the session.</p>
          </div>
        )}
      </div>
    </section>
  );
}
