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
    <div className="p-6 sm:p-8 flex flex-col h-full relative overflow-hidden text-[var(--color-retro-text)]">
      <div className="flex items-center justify-between mb-6 sm:mb-8 z-10">
        <h2 className="text-[10px] uppercase font-sans tracking-[0.2em] text-[var(--color-retro-red)] font-bold block">
          Audio Tape
        </h2>
        <label className="cursor-pointer bg-[var(--color-retro-bg)] border border-white/5 hover:-translate-y-0.5 shadow hover:border-[var(--color-retro-red)] rounded-full px-5 py-2 text-[10px] uppercase font-sans tracking-widest font-bold transition-all flex items-center gap-2">
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

      {audioUrl ? (
        <div className="flex flex-col gap-6 z-10">
          <div className="mb-2">
             <div className="text-2xl font-display mb-1 truncate text-white">Current Track</div>
          </div>
          <audio 
            ref={audioRef}
            src={audioUrl}
            loop={isLooping}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => !isLooping && setIsPlaying(false)}
          />
          
          <div className="flex flex-col gap-3 relative">
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

          <div className="flex items-center justify-center gap-8 mt-2">
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
              className="w-16 h-16 rounded-full flex items-center justify-center text-white bg-[var(--color-retro-red)] hover:brightness-110 shadow-[0_0_20px_rgba(205,78,86,0.5)] hover:scale-105 transition-all"
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
        </div>
      ) : (
        <div className="min-h-[140px] border border-dashed border-white/20 bg-white/5 rounded-2xl flex flex-col items-center justify-center text-white/40 z-10 w-full mb-4 shadow-inner">
          <FileAudio className="w-8 h-8 mb-4 text-[var(--color-retro-red)] opacity-50" />
          <p className="text-[10px] uppercase font-sans tracking-widest font-bold">No Audio Tape</p>
        </div>
      )}
    </div>
  );
}
