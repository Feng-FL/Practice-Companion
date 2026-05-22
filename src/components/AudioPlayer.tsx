import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Upload, FileAudio, Repeat } from 'lucide-react';

export default function AudioPlayer({ 
  audioFile, 
  onLoadFile 
}: { 
  audioFile: File | null;
  onLoadFile: (file: File) => void;
}) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioFile) {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const url = URL.createObjectURL(audioFile);
      setAudioUrl(url);
      setIsPlaying(false);
      setProgress(0);
      return () => URL.revokeObjectURL(url);
    } else {
      setAudioUrl(null);
    }
  }, [audioFile]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (audioRef.current && audioUrl) {
          if (audioRef.current.paused) {
            audioRef.current.play();
            setIsPlaying(true);
          } else {
            audioRef.current.pause();
            setIsPlaying(false);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [audioUrl]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoadFile(file);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setProgress(newTime);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 sm:p-5 flex flex-col justify-center h-full relative overflow-hidden text-[var(--color-retro-text)] min-h-[100px] lg:min-h-[120px]">
      {!audioUrl ? (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 z-10 w-full">
          <div className="flex items-center gap-4 shrink-0">
            <h2 className="text-[10px] uppercase font-sans tracking-[0.2em] text-[var(--color-retro-red)] font-bold block">
              Audio Tape
            </h2>
          </div>
          
          <div className="flex-1 w-full flex justify-center">
            <div className="flex items-center justify-center gap-3 text-white/40">
              <FileAudio className="w-5 h-5 text-[var(--color-retro-red)] opacity-50" />
              <p className="text-[10px] uppercase font-sans tracking-widest font-bold">No Audio Tape</p>
            </div>
          </div>

          <label className="cursor-pointer bg-[var(--color-retro-bg)] border border-white/5 hover:-translate-y-0.5 shadow hover:border-[var(--color-retro-red)] rounded-full px-5 py-2 text-[10px] uppercase font-sans tracking-widest font-bold transition-all flex items-center gap-2 shrink-0">
            <Upload className="w-3 h-3 text-[var(--color-retro-red)]" />
            Load File
            <input 
              type="file" 
              accept="audio/*" 
              className="hidden" 
              onChange={handleFileUpload}
            />
          </label>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-8 z-10 w-full">
          
          {/* Header & Replace btn */}
          <div className="flex flex-row lg:flex-col items-center lg:items-start justify-between w-full lg:w-[220px] shrink-0 gap-4 lg:gap-2">
            <div className="flex-1 min-w-0">
              <h2 className="text-[10px] uppercase font-sans tracking-[0.2em] text-[var(--color-retro-red)] font-bold block mb-0.5 lg:mb-1">
                Audio Tape
              </h2>
              <div className="text-lg lg:text-xl font-display truncate text-white w-full">Current Track</div>
            </div>
            
            <label className="cursor-pointer bg-white/5 border border-white/10 hover:bg-white/10 rounded-full px-4 py-1.5 text-[10px] uppercase font-sans tracking-widest font-bold transition-all flex items-center gap-2 shrink-0">
              <Upload className="w-3 h-3 text-[var(--color-retro-red)]" />
              Replace
              <input 
                type="file" 
                accept="audio/*" 
                className="hidden" 
                onChange={handleFileUpload}
              />
            </label>
          </div>

          <audio 
            ref={audioRef}
            src={audioUrl}
            loop={isLooping}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => !isLooping && setIsPlaying(false)}
          />

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 shrink-0">
            <button 
              onClick={() => setIsLooping(!isLooping)}
              className={`transition-all ${isLooping ? 'text-[var(--color-retro-red)] scale-110 drop-shadow-[0_0_8px_rgba(205,78,86,0.6)]' : 'text-white/40 hover:text-white/80'}`}
              title={isLooping ? "Disable Repeat" : "Enable Repeat"}
            >
              <Repeat className="w-5 h-5" />
            </button>
            <button 
              onClick={() => { if(audioRef.current) audioRef.current.currentTime -= 5; }}
              className="text-white/40 hover:text-white transition-colors"
              title="-5 seconds"
            >
              <SkipBack className="w-6 h-6" />
            </button>
            <button 
              onClick={togglePlay}
              className="w-14 h-14 rounded-full flex items-center justify-center text-white bg-[var(--color-retro-red)] hover:brightness-110 shadow-[0_0_20px_rgba(205,78,86,0.5)] hover:scale-105 transition-all"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
            </button>
            <button 
              onClick={() => { if(audioRef.current) audioRef.current.currentTime += 5; }}
              className="text-white/40 hover:text-white transition-colors"
              title="+5 seconds"
            >
              <SkipForward className="w-6 h-6" />
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="flex-1 flex flex-col gap-2 w-full lg:w-auto mt-2 lg:mt-0">
            <input 
              type="range" 
              min="0" 
              max={duration || 100} 
              value={progress}
              onChange={handleSeek}
              className="w-full h-3 bg-white/5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[var(--color-retro-red)] [&::-webkit-slider-thumb]:rounded-full border border-white/10 focus:outline-none"
            />
            <div className="flex justify-between text-[10px] font-mono opacity-80 mt-1 text-white">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
