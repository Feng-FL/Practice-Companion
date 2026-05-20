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
    <section className="flex-1 flex flex-col bg-white overflow-hidden relative h-full w-full">
      {/* Absolute Header Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 lg:p-8 flex justify-between items-center z-20 pointer-events-none">
        <div className="hidden md:block px-4 py-2 bg-white/90 backdrop-blur-sm border border-[#DDD] text-[10px] uppercase tracking-[0.2em] font-bold text-[#1A1A1A] pointer-events-auto shadow-sm">
          Sheet Music Viewer
        </div>
        
        <div className="flex items-center gap-2 lg:gap-4 pointer-events-auto ml-auto">
          {fileUrl && (
            <button 
              onClick={toggleFitMode}
              className="px-3 py-2 bg-white/90 backdrop-blur-sm shadow-sm border border-[#DDD] hover:bg-[#F9F7F2] text-[#1A1A1A] text-[10px] uppercase tracking-widest font-bold transition-colors flex items-center gap-2"
              title="Toggle Fit Mode"
            >
              {fitMode === 'page' ? <><Move className="w-3 h-3" /> Fit Width</> : <><ZoomOut className="w-3 h-3" /> Fit Page</>}
            </button>
          )}
          <label className="cursor-pointer px-4 py-2 bg-[#1A1A1A] text-white text-[10px] uppercase tracking-widest font-bold hover:opacity-80 transition-opacity flex items-center gap-2 shadow-sm">
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

      <div className="flex-1 overflow-hidden bg-[#F9F7F2] p-2 lg:p-8 flex flex-col mt-16 lg:mt-0">
        {fileUrl ? (
          <div className="w-full flex-1 max-w-6xl mx-auto border border-[#DDD] bg-white p-2 shadow-sm relative flex flex-col overflow-hidden">
            <div 
              ref={containerRef}
              className={`flex-1 w-full h-full relative group ${fitMode === 'page' ? 'overflow-hidden flex items-center justify-center' : 'overflow-y-auto overflow-x-hidden'}`}
            >
              {fileType === 'image' ? (
                <img 
                  src={fileUrl} 
                  alt="Sheet Music" 
                  className={fitMode === 'page' ? 'absolute w-full h-full object-contain' : 'w-full h-auto block'}
                />
              ) : (
                <Document
                  file={sheetFile}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={(error) => setPdfError(error.message)}
                  className={`flex flex-col items-center w-full min-h-full ${fitMode === 'page' ? 'justify-center h-full' : 'justify-start'}`}
                  loading={
                    <div className="text-[10px] uppercase font-bold tracking-widest opacity-40 italic h-64 flex items-center justify-center">
                      Loading PDF...
                    </div>
                  }
                  error={
                    <div className="text-[10px] uppercase font-bold tracking-widest text-[#C1351D] flex flex-col items-center justify-center p-8 text-center max-w-sm mx-auto">
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
                       className="shadow-sm border border-[#DDD] bg-white"
                       renderTextLayer={false}
                       renderAnnotationLayer={false}
                       loading=""
                     />
                  )}
                </Document>
              )}
              
              {fileType === 'pdf' && numPages && numPages > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-[#F9F7F2]/95 backdrop-blur-sm p-2 border border-[#1A1A1A] shadow-md z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button 
                    onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                    disabled={pageNumber <= 1}
                    className="px-3 py-1.5 bg-[#1A1A1A] text-white hover:opacity-80 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed text-[10px] uppercase tracking-widest flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3 h-3" /> Prev
                  </button>
                  <span className="text-[10px] font-mono tabular-nums px-2 font-bold opacity-80 text-[#1A1A1A]">
                    {pageNumber} / {numPages}
                  </span>
                  <button 
                    onClick={() => setPageNumber(Math.min(numPages || 1, pageNumber + 1))}
                    disabled={pageNumber >= (numPages || 1)}
                    className="px-3 py-1.5 bg-[#1A1A1A] text-white hover:opacity-80 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed text-[10px] uppercase tracking-widest flex items-center gap-1"
                  >
                    Next <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-[400px] w-full border border-[#DDD] bg-white p-12 shadow-sm relative text-center mx-auto my-auto">
             <div className="absolute top-4 right-6 text-[10px] uppercase tracking-tighter opacity-30">No File Linked</div>
             <ImageIcon className="w-8 h-8 opacity-20 mx-auto mb-6" />
             <h3 className="font-serif text-xl mb-4 italic text-[#1A1A1A]">Awaiting Score</h3>
             <p className="text-xs text-[#444] font-serif leading-relaxed opacity-60">Upload a PDF or Image of your sheet music to begin the session.</p>
          </div>
        )}
      </div>
    </section>
  );
}
